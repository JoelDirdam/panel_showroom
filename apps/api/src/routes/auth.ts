import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { createHash } from 'node:crypto'
import {
  authenticate,
  sessionRevoked,
  signPurposeToken,
  signToken,
  verifyPurposeToken,
} from '../middleware/auth.js'
import { superAdminTwoFactorRequired } from '../lib/environment.js'
import { sendPasswordChangedNotice, sendPasswordResetCode } from '../lib/email.js'
import { RESET_MAX_PER_HOUR, passwordProblem, sameHash, sendResetCodeByWhatsapp } from '../lib/passwordReset.js'
import { clientIp, clientUserAgent } from '../lib/clientIp.js'
import { verifySecondFactor } from '../lib/twoFactor.js'
import { audit } from '../lib/audit.js'
import { notify } from '../lib/notify.js'
import { slugify } from '../lib/slug.js'
import { buildMeResponse } from '../lib/meShape.js'
import { advanceStep } from '../lib/onboarding.js'
import { rateLimit } from '../lib/rateLimit.js'
import {
  MAX_ATTEMPTS,
  codeExpiresAt,
  generateCode,
  hashCode,
  msUntilResendAllowed,
} from '../lib/verification.js'

const router = Router()

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'auth' })

const isDev = process.env.NODE_ENV !== 'production'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  // Opcional: no hace falta un teléfono para abrir la cuenta (minimización de datos).
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .refine((v) => !v || v.length >= 7, 'Teléfono inválido'),
  password: z.string().min(8),
  signedName: z.string().min(1).max(200),
  termsVersion: z.string().min(1),
  // Aceptación expresa: la casilla debe venir marcada por el usuario.
  acceptTerms: z.literal(true),
  // Consentimiento aparte y opcional para correos de marketing (apagado por defecto).
  marketingOptIn: z.boolean().optional().default(false),
})

const acceptTermsSchema = z.object({
  signedName: z.string().min(1).max(200),
  termsVersion: z.string().min(1),
  acceptTerms: z.literal(true),
})

const twoFactorLoginSchema = z.object({
  challengeToken: z.string().min(10).max(2000),
  code: z.string().trim().min(6).max(20),
})

const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex')

const verifyCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
})

const changeEmailSchema = z.object({
  email: z.string().email(),
})

const updatePhoneSchema = z.object({
  phone: z.string().min(7).max(30),
})

const profileSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).nullable().optional(),
  timezone: z.string().max(60).optional(),
})

router.post('/login', authRateLimit, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const { password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
    include: { brand: true },
  })

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid || user.deletedAt) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  // Con 2FA activo la contraseña sola no abre sesión: se entrega un reto de
  // 5 minutos que solo sirve para /login/2fa.
  // En dev el SUPER_ADMIN entra sin el segundo paso (en producción siempre se pide).
  const skipSecondFactor = user.role === 'SUPER_ADMIN' && !superAdminTwoFactorRequired()
  if (user.totpEnabledAt && user.totpSecret && !skipSecondFactor) {
    return res.json({
      twoFactorRequired: true,
      challengeToken: signPurposeToken('2fa-login', { uid: user.id }, '5m'),
    })
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId ?? '',
    brandId: user.brandId,
  }

  if (user.role === 'SUPER_ADMIN') {
    req.user = { ...authUser, tenantId: '' }
    await audit(req, 'auth.login', { type: 'account', id: user.id, label: user.email }, {
      secondFactorSkipped: skipSecondFactor,
    })
  }

  const me = await buildMeResponse(user.id)

  return res.json({
    token: signToken(authUser),
    // Shape completo (aditivo): incluye terms/onboarding/subscription/entitlements
    // además de los campos ya consumidos hoy (id, brand, mustChangePassword...).
    user: me,
  })
})

/** Segundo paso del inicio de sesión: código de la app de autenticación o de recuperación. */
router.post('/login/2fa', authRateLimit, async (req, res) => {
  const parsed = twoFactorLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Escribe el código de 6 dígitos de tu app' })
  }
  const challenge = verifyPurposeToken<{ uid?: string }>('2fa-login', parsed.data.challengeToken)
  if (!challenge?.uid) {
    return res.status(401).json({
      error: 'La verificación expiró. Vuelve a escribir tu correo y contraseña.',
      code: 'CHALLENGE_EXPIRED',
    })
  }

  const user = await prisma.user.findUnique({ where: { id: challenge.uid } })
  if (!user || user.deletedAt || !user.totpEnabledAt) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const result = await verifySecondFactor(user, parsed.data.code, { allowRecoveryCode: true })
  if (!result.ok) return res.status(result.status).json({ error: result.error })

  if (user.role === 'SUPER_ADMIN') {
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: '', brandId: null }
    await audit(req, 'auth.login', { type: 'account', id: user.id, label: user.email }, {
      usedRecoveryCode: result.usedRecoveryCode,
    })
  }

  const me = await buildMeResponse(user.id)
  return res.json({
    token: signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId ?? '',
      brandId: user.brandId,
    }),
    user: me,
    usedRecoveryCode: result.usedRecoveryCode,
  })
})

/**
 * Alta de un nuevo negocio (tenant borrador) + usuario BUSINESS. Deja el flujo
 * listo para continuar en /verify-email → /onboarding/select-plan →
 * /onboarding/create-business.
 */
router.post('/register', authRateLimit, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, password, signedName, termsVersion, marketingOptIn } = parsed.data
  // Mismo formato que usa /login para buscar la cuenta.
  const email = parsed.data.email.trim().toLowerCase()
  const phone = parsed.data.phone?.trim() || null
  const ip = clientIp(req)
  const userAgent = clientUserAgent(req)

  const currentTerms = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  if (currentTerms && currentTerms.version !== termsVersion) {
    return res.status(409).json({
      error: 'La versión de términos aceptada no es la vigente',
      currentTermsVersion: currentTerms.version,
    })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo' })
  }

  const baseSlug = slugify(name) || slugify(email.split('@')[0])
  let slug = baseSlug
  let suffix = 1
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    suffix += 1
    slug = `${baseSlug}-${suffix}`
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const code = generateCode()
  const codeHash = hashCode(code)

  const created = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        name: `Negocio de ${name}`,
        slug,
        onboardingComplete: false,
      },
    })

    await tx.sucursal.create({
      data: {
        tenantId: tenant.id,
        name: 'Sucursal principal',
      },
    })

    const user = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        phone,
        role: 'BUSINESS',
        tenantId: tenant.id,
        onboardingStep: 'REGISTERED',
        marketingOptIn,
        marketingOptInAt: marketingOptIn ? new Date() : null,
      },
    })

    // Evidencia: quién aceptó, qué versión (y su huella), cuándo y desde dónde.
    await tx.termsAcceptance.create({
      data: {
        userId: user.id,
        version: termsVersion,
        signedName,
        ip,
        email,
        userAgent,
        contentHash: currentTerms ? sha256(currentTerms.content) : null,
        source: 'register',
      },
    })

    // El consentimiento de marketing se registra aparte (solo si se otorgó).
    if (marketingOptIn) {
      await tx.consentEvent.create({
        data: {
          userId: user.id,
          email,
          kind: 'MARKETING_EMAIL',
          granted: true,
          source: 'register',
          ip,
          userAgent,
        },
      })
    }

    await tx.emailVerificationCode.create({
      data: {
        userId: user.id,
        codeHash,
        expiresAt: codeExpiresAt(),
      },
    })

    return { tenant, user }
  })

  await notify.sendEmailCode(email, code, 'verify-email')

  const authUser = {
    id: created.user.id,
    email: created.user.email,
    name: created.user.name,
    role: created.user.role,
    tenantId: created.user.tenantId ?? '',
    brandId: created.user.brandId,
  }

  const me = await buildMeResponse(created.user.id)

  return res.status(201).json({
    token: signToken(authUser),
    user: me,
    ...(isDev ? { devCode: code } : {}),
  })
})

router.post('/accept-terms', authenticate, async (req, res) => {
  const parsed = acceptTermsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { signedName, termsVersion } = parsed.data

  const currentTerms = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  if (currentTerms && currentTerms.version !== termsVersion) {
    return res.status(409).json({
      error: 'La versión de términos no es la vigente',
      currentTermsVersion: currentTerms.version,
    })
  }

  const account = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true, deletedAt: true },
  })
  if (!account || account.deletedAt) return res.status(401).json({ error: 'No autorizado' })

  // Si ya había aceptado esta versión se conserva la constancia original (fecha e IP).
  await prisma.termsAcceptance.upsert({
    where: { userId_version: { userId: req.user!.id, version: termsVersion } },
    update: {},
    create: {
      userId: req.user!.id,
      version: termsVersion,
      signedName,
      ip: clientIp(req),
      email: account.email,
      userAgent: clientUserAgent(req),
      contentHash: currentTerms ? sha256(currentTerms.content) : null,
      source: 'reaccept',
    },
  })

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me })
})

router.post('/verify-email', authenticate, async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Código inválido, debe tener 6 dígitos' })
  }

  const record = await prisma.emailVerificationCode.findFirst({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) {
    return res.status(400).json({ error: 'No hay un código pendiente, solicita uno nuevo' })
  }
  if (record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'El código expiró, solicita uno nuevo' })
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos, solicita un nuevo código' })
  }

  if (hashCode(parsed.data.code) !== record.codeHash) {
    await prisma.emailVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return res.status(400).json({ error: 'Código incorrecto' })
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        onboardingStep: advanceStep(user.onboardingStep, 'EMAIL_VERIFIED'),
      },
    }),
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } }),
  ])

  const me = await buildMeResponse(user.id)
  return res.json({ ok: true, user: me })
})

router.post('/resend-email-code', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  if (user.emailVerifiedAt) {
    return res.status(400).json({ error: 'El correo ya está verificado' })
  }

  const last = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  if (last) {
    const waitMs = msUntilResendAllowed(last.createdAt)
    if (waitMs > 0) {
      return res.status(429).json({
        error: `Espera ${Math.ceil(waitMs / 1000)} segundos para solicitar otro código`,
        retryAfterMs: waitMs,
      })
    }
  }

  const code = generateCode()
  await prisma.$transaction([
    prisma.emailVerificationCode.deleteMany({ where: { userId: user.id } }),
    prisma.emailVerificationCode.create({
      data: { userId: user.id, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
    }),
  ])

  await notify.sendEmailCode(user.email, code, 'verify-email')
  return res.json({ ok: true, ...(isDev ? { devCode: code } : {}) })
})

router.post('/change-email', authenticate, async (req, res) => {
  const parsed = changeEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Correo inválido' })
  }
  const email = parsed.data.email.trim().toLowerCase()

  const taken = await prisma.user.findUnique({ where: { email } })
  if (taken && taken.id !== req.user!.id) {
    return res.status(409).json({ error: 'Ese correo ya está en uso' })
  }

  const code = generateCode()
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { email, emailVerifiedAt: null },
    }),
    prisma.emailVerificationCode.deleteMany({ where: { userId: req.user!.id } }),
    prisma.emailVerificationCode.create({
      data: { userId: req.user!.id, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
    }),
  ])

  await notify.sendEmailCode(email, code, 'change-email')

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me, ...(isDev ? { devCode: code } : {}) })
})

router.post('/update-phone', authenticate, async (req, res) => {
  const parsed = updatePhoneSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Teléfono inválido' })
  }
  const { phone } = parsed.data

  const code = generateCode()
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.user!.id },
      data: { phone, phoneVerifiedAt: null },
    }),
    prisma.smsVerificationCode.deleteMany({ where: { userId: req.user!.id } }),
    prisma.smsVerificationCode.create({
      data: { userId: req.user!.id, phone, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
    }),
  ])

  await notify.sendSmsCode(phone, code, 'verify-phone')

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me, ...(isDev ? { devCode: code } : {}) })
})

router.post('/verify-phone', authenticate, async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Código inválido, debe tener 6 dígitos' })
  }

  const record = await prisma.smsVerificationCode.findFirst({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
  })
  if (!record) {
    return res.status(400).json({ error: 'No hay un código pendiente, solicita uno nuevo' })
  }
  if (record.expiresAt < new Date()) {
    return res.status(400).json({ error: 'El código expiró, solicita uno nuevo' })
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos, solicita un nuevo código' })
  }

  if (hashCode(parsed.data.code) !== record.codeHash) {
    await prisma.smsVerificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    return res.status(400).json({ error: 'Código incorrecto' })
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: req.user!.id }, data: { phoneVerifiedAt: new Date() } }),
    prisma.smsVerificationCode.deleteMany({ where: { userId: req.user!.id } }),
  ])

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me })
})

router.post('/resend-phone-code', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
  if (!user.phone) return res.status(400).json({ error: 'No hay teléfono registrado' })
  if (user.phoneVerifiedAt) return res.status(400).json({ error: 'El teléfono ya está verificado' })

  const last = await prisma.smsVerificationCode.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })
  if (last) {
    const waitMs = msUntilResendAllowed(last.createdAt)
    if (waitMs > 0) {
      return res.status(429).json({
        error: `Espera ${Math.ceil(waitMs / 1000)} segundos para solicitar otro código`,
        retryAfterMs: waitMs,
      })
    }
  }

  const code = generateCode()
  await prisma.$transaction([
    prisma.smsVerificationCode.deleteMany({ where: { userId: user.id } }),
    prisma.smsVerificationCode.create({
      data: { userId: user.id, phone: user.phone, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
    }),
  ])

  await notify.sendSmsCode(user.phone, code, 'verify-phone')
  return res.json({ ok: true, ...(isDev ? { devCode: code } : {}) })
})

router.get('/me', authenticate, async (req, res) => {
  const account = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { passwordChangedAt: true },
  })
  // La contraseña cambió después de abrir esta sesión: hay que volver a entrar.
  if (account && sessionRevoked(req.user!, account.passwordChangedAt)) {
    return res.status(401).json({ error: 'Tu contraseña cambió. Vuelve a iniciar sesión.' })
  }
  const me = await buildMeResponse(req.user!.id)
  if (!me) {
    // Cuenta eliminada o inexistente: el token ya no es válido.
    return res.status(401).json({ error: 'No autorizado' })
  }
  return res.json(me)
})

router.patch('/profile', authenticate, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, phone, timezone } = parsed.data
  const email = parsed.data.email?.trim().toLowerCase()

  const current = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!current) return res.status(404).json({ error: 'Usuario no encontrado' })

  const data: Prisma.UserUpdateInput = {}
  if (name !== undefined) data.name = name
  if (timezone !== undefined) data.timezone = timezone

  let devEmailCode: string | null = null
  let devPhoneCode: string | null = null

  if (email !== undefined && email !== current.email) {
    const taken = await prisma.user.findUnique({ where: { email } })
    if (taken) return res.status(409).json({ error: 'Ese correo ya está en uso' })
    data.email = email
    data.emailVerifiedAt = null
  }

  if (phone !== undefined && phone !== current.phone) {
    data.phone = phone
    data.phoneVerifiedAt = null
  }

  await prisma.user.update({ where: { id: req.user!.id }, data })

  if (data.email) {
    const code = generateCode()
    await prisma.$transaction([
      prisma.emailVerificationCode.deleteMany({ where: { userId: req.user!.id } }),
      prisma.emailVerificationCode.create({
        data: { userId: req.user!.id, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
      }),
    ])
    await notify.sendEmailCode(String(data.email), code, 'change-email')
    devEmailCode = code
  }

  if (data.phone) {
    const code = generateCode()
    const phoneValue = String(data.phone)
    await prisma.$transaction([
      prisma.smsVerificationCode.deleteMany({ where: { userId: req.user!.id } }),
      prisma.smsVerificationCode.create({
        data: { userId: req.user!.id, phone: phoneValue, codeHash: hashCode(code), expiresAt: codeExpiresAt() },
      }),
    ])
    await notify.sendSmsCode(phoneValue, code, 'verify-phone')
    devPhoneCode = code
  }

  const me = await buildMeResponse(req.user!.id)
  return res.json({
    ok: true,
    user: me,
    ...(isDev && devEmailCode ? { devEmailCode } : {}),
    ...(isDev && devPhoneCode ? { devPhoneCode } : {}),
  })
})

router.post('/change-password', authenticate, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos. Nueva contraseña mínimo 8 caracteres.' })
  }

  const { currentPassword, newPassword } = parsed.data
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Contraseña actual incorrecta' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash, mustChangePassword: false },
  })

  return res.json({ ok: true })
})

// --- Recuperar contraseña ------------------------------------------------------

/** Por IP: limita el envío de códigos (evita usar el formulario para mandar spam). */
const forgotRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: 'pwd-forgot' })
/** Por IP: limita los intentos de adivinar el código. */
const resetRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'pwd-reset' })

const forgotSchema = z.object({
  email: z.string().trim().email(),
  channel: z.enum(['EMAIL', 'WHATSAPP']).default('EMAIL'),
})

const resetVerifySchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
})

const resetSchema = z.object({
  resetToken: z.string().min(10).max(2000),
  newPassword: z.string().min(1).max(200),
})

/** Misma respuesta exista o no la cuenta: no revela qué correos están registrados. */
const FORGOT_RESPONSE = {
  ok: true,
  message:
    'Si hay una cuenta con ese correo, te enviamos un código. Revisa tu bandeja de entrada, spam o WhatsApp.',
}

const CODE_INVALID = 'El código es incorrecto o ya venció. Revísalo o pide uno nuevo.'

async function deliverResetCode(
  user: { email: string; name: string; phone: string | null; phoneVerifiedAt: Date | null },
  code: string,
  channel: 'EMAIL' | 'WHATSAPP',
): Promise<void> {
  // WhatsApp solo al número que el titular ya verificó; si no se puede, va por correo.
  if (channel === 'WHATSAPP' && user.phone && user.phoneVerifiedAt) {
    if (await sendResetCodeByWhatsapp(user.phone, code)) return
  }
  await sendPasswordResetCode({ to: user.email, name: user.name, code })
}

router.post('/password/forgot', forgotRateLimit, async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Escribe un correo válido' })
  const email = parsed.data.email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, phone: true, phoneVerifiedAt: true, deletedAt: true },
  })
  if (!user || user.deletedAt) return res.json(FORGOT_RESPONSE)

  // Por cuenta: un código por minuto y máximo 5 por hora (sin revelarlo en la respuesta).
  const recent = await prisma.passwordResetCode.findMany({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (recent.length >= RESET_MAX_PER_HOUR || (recent[0] && msUntilResendAllowed(recent[0].createdAt) > 0)) {
    return res.json(FORGOT_RESPONSE)
  }

  const code = generateCode()
  await prisma.$transaction([
    // Un código nuevo anula los anteriores.
    prisma.passwordResetCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetCode.create({
      data: {
        userId: user.id,
        codeHash: hashCode(code),
        channel: parsed.data.channel,
        expiresAt: codeExpiresAt(),
        ip: clientIp(req),
      },
    }),
  ])

  // Se envía sin esperar: así la respuesta tarda lo mismo exista o no la cuenta.
  void deliverResetCode(user, code, parsed.data.channel).catch((err) =>
    console.error('[password-reset] no se pudo enviar el código:', err instanceof Error ? err.message : err),
  )

  // Nunca se devuelve el código (ni en dev): permitiría tomar cualquier cuenta con solo saber el correo.
  return res.json(FORGOT_RESPONSE)
})

/** Paso 2: valida el código y entrega un permiso de 10 minutos para elegir la contraseña nueva. */
router.post('/password/verify', resetRateLimit, async (req, res) => {
  const parsed = resetVerifySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Escribe el código de 6 dígitos' })
  const email = parsed.data.email.toLowerCase()

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, deletedAt: true, passwordChangedAt: true },
  })
  if (!user || user.deletedAt) return res.status(400).json({ error: CODE_INVALID })

  const record = await prisma.passwordResetCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  })
  if (!record || record.expiresAt < new Date()) return res.status(400).json({ error: CODE_INVALID })
  if (record.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' })
  }
  if (!sameHash(hashCode(parsed.data.code), record.codeHash)) {
    await prisma.passwordResetCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } })
    return res.status(400).json({ error: CODE_INVALID })
  }

  return res.json({
    ok: true,
    resetToken: signPurposeToken(
      'password-reset',
      { uid: user.id, rid: record.id, pc: user.passwordChangedAt?.getTime() ?? 0 },
      '10m',
    ),
  })
})

/** Paso 3: guarda la contraseña nueva, cierra las demás sesiones y avisa por correo. */
router.post('/password/reset', resetRateLimit, async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const grant = verifyPurposeToken<{ uid?: string; rid?: string; pc?: number }>(
    'password-reset',
    parsed.data.resetToken,
  )
  const expired = {
    error: 'El permiso para cambiar la contraseña venció. Vuelve a pedir un código.',
    code: 'RESET_EXPIRED',
  }
  if (!grant?.uid || !grant.rid) return res.status(400).json(expired)

  const user = await prisma.user.findUnique({ where: { id: grant.uid } })
  if (!user || user.deletedAt) return res.status(400).json(expired)
  // Un solo uso: si la contraseña ya cambió desde que se emitió el permiso, no vale.
  if ((user.passwordChangedAt?.getTime() ?? 0) !== (grant.pc ?? 0)) return res.status(400).json(expired)

  const record = await prisma.passwordResetCode.findFirst({
    where: { id: grant.rid, userId: user.id, usedAt: null },
  })
  if (!record) return res.status(400).json(expired)

  const problem = passwordProblem(parsed.data.newPassword, user.email)
  if (problem) return res.status(400).json({ error: problem, field: 'newPassword' })

  const now = new Date()
  const hash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password: hash, passwordChangedAt: now, mustChangePassword: false },
    }),
    prisma.passwordResetCode.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
  ])

  if (user.role === 'SUPER_ADMIN') {
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: '', brandId: null }
    await audit(req, 'auth.password_reset', { type: 'account', id: user.id, label: user.email })
  }

  void sendPasswordChangedNotice({ to: user.email, name: user.name, when: now })
  return res.json({ ok: true })
})

export default router
