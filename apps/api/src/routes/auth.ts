import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, signToken } from '../middleware/auth.js'
import { notify } from '../lib/notify.js'
import { slugify } from '../lib/slug.js'
import { buildMeResponse } from '../lib/meShape.js'
import { advanceStep } from '../lib/onboarding.js'
import {
  MAX_ATTEMPTS,
  codeExpiresAt,
  generateCode,
  hashCode,
  msUntilResendAllowed,
} from '../lib/verification.js'

const router = Router()

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
  phone: z.string().max(30).optional().nullable(),
  password: z.string().min(8),
  signedName: z.string().min(1).max(200),
  termsVersion: z.string().min(1),
})

const acceptTermsSchema = z.object({
  signedName: z.string().min(1).max(200),
  termsVersion: z.string().min(1),
})

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

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
    include: { brand: true },
  })

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    brandId: user.brandId,
  }

  const me = await buildMeResponse(user.id)

  return res.json({
    token: signToken(authUser),
    // Shape completo (aditivo): incluye terms/onboarding/subscription/entitlements
    // además de los campos ya consumidos hoy (id, brand, mustChangePassword...).
    user: me,
  })
})

/**
 * Alta de un nuevo negocio (tenant borrador) + usuario ADMIN. Deja el flujo
 * listo para continuar en /verify-email → /onboarding/select-plan →
 * /onboarding/create-business.
 */
router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, email, phone, password, signedName, termsVersion } = parsed.data

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

    const user = await tx.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        phone: phone?.trim() || null,
        role: 'ADMIN',
        tenantId: tenant.id,
        onboardingStep: 'REGISTERED',
      },
    })

    await tx.termsAcceptance.create({
      data: {
        userId: user.id,
        version: termsVersion,
        signedName,
        ip: req.ip ?? null,
      },
    })

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
    tenantId: created.user.tenantId,
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

  await prisma.termsAcceptance.upsert({
    where: { userId_version: { userId: req.user!.id, version: termsVersion } },
    update: { signedName, ip: req.ip ?? null },
    create: { userId: req.user!.id, version: termsVersion, signedName, ip: req.ip ?? null },
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
  const { email } = parsed.data

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
  const me = await buildMeResponse(req.user!.id)
  if (!me) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  return res.json(me)
})

router.patch('/profile', authenticate, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, email, phone, timezone } = parsed.data

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

export default router
