import { Router } from 'express'
import { superAdminTwoFactorRequired } from '../lib/environment.js'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middleware/auth.js'
import { rateLimit } from '../lib/rateLimit.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { clientIp, clientUserAgent } from '../lib/clientIp.js'
import { buildMeResponse } from '../lib/meShape.js'
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  totpUri,
} from '../lib/totp.js'
import { verifySecondFactor } from '../lib/twoFactor.js'
import { anonymizeUser, deleteTenantCompletely, exportAccountData } from '../lib/accountData.js'
import { sendAccountDeletedConfirmation } from '../lib/email.js'
import { audit } from '../lib/audit.js'

/**
 * Rutas de "Mi cuenta": verificación en dos pasos, privacidad (consentimiento
 * de marketing, constancia de términos), descarga y eliminación de datos.
 * Están en el allowlist de los guards globales: funcionan aunque la cuenta esté
 * pausada o falte aceptar una versión nueva de los términos.
 */
const router = Router()

router.use(authenticate)

const sensitiveLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'account-sensitive' })
const exportLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 6, keyPrefix: 'account-export' })

const passwordSchema = z.object({ password: z.string().min(1).max(200) })
const codeSchema = z.object({ code: z.string().trim().min(6).max(20) })
const passwordAndCodeSchema = passwordSchema.merge(codeSchema)

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) throw new HttpError(401, 'No autorizado')
  return user
}

async function assertPassword(hash: string, password: string): Promise<void> {
  if (!(await bcrypt.compare(password, hash))) throw new HttpError(401, 'Contraseña incorrecta')
}

// --- Verificación en dos pasos -------------------------------------------------

router.get('/security', async (req, res) => {
  try {
    const user = await loadUser(req.user!.id)
    return res.json({
      twoFactorEnabled: Boolean(user.totpEnabledAt),
      twoFactorEnabledAt: user.totpEnabledAt,
      twoFactorRequired: user.role === 'SUPER_ADMIN' && superAdminTwoFactorRequired(),
      recoveryCodesLeft: user.totpEnabledAt ? user.totpRecoveryCodes.length : 0,
    })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Paso 1: genera el secreto y lo devuelve para escanear el QR. Aún no queda activo. */
router.post('/2fa/setup', sensitiveLimit, async (req, res) => {
  try {
    const parsed = passwordSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Escribe tu contraseña para continuar' })
    const user = await loadUser(req.user!.id)
    await assertPassword(user.password, parsed.data.password)
    if (user.totpEnabledAt) {
      throw new HttpError(409, 'La verificación en dos pasos ya está activa')
    }
    const secret = generateTotpSecret()
    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: encryptSecret(secret), totpLastStep: null, totpRecoveryCodes: [] },
    })
    return res.json({ secret, otpauthUrl: totpUri(secret, user.email) })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Paso 2: confirma con un código de la app. Activa el 2FA y entrega los códigos de recuperación. */
router.post('/2fa/enable', sensitiveLimit, async (req, res) => {
  try {
    const parsed = codeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Escribe el código de 6 dígitos de tu app' })
    const user = await loadUser(req.user!.id)
    if (user.totpEnabledAt) throw new HttpError(409, 'La verificación en dos pasos ya está activa')
    if (!user.totpSecret || !decryptSecret(user.totpSecret)) {
      throw new HttpError(400, 'Primero inicia la configuración para obtener el código QR')
    }
    const result = await verifySecondFactor(user, parsed.data.code, { allowRecoveryCode: false })
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    const { codes, hashes } = generateRecoveryCodes()
    await prisma.user.update({
      where: { id: user.id },
      data: { totpEnabledAt: new Date(), totpRecoveryCodes: hashes },
    })
    if (user.role === 'SUPER_ADMIN') await audit(req, 'account.2fa_enable', { type: 'account', id: user.id, label: user.email })
    const me = await buildMeResponse(user.id)
    return res.json({ ok: true, recoveryCodes: codes, user: me })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Desactiva el 2FA (pide contraseña y un código vigente o de recuperación). */
router.post('/2fa/disable', sensitiveLimit, async (req, res) => {
  try {
    const parsed = passwordAndCodeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Escribe tu contraseña y un código' })
    const user = await loadUser(req.user!.id)
    await assertPassword(user.password, parsed.data.password)
    if (!user.totpEnabledAt) throw new HttpError(400, 'La verificación en dos pasos no está activa')
    const result = await verifySecondFactor(user, parsed.data.code, { allowRecoveryCode: true })
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    await prisma.user.update({
      where: { id: user.id },
      data: { totpSecret: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryCodes: [] },
    })
    if (user.role === 'SUPER_ADMIN') await audit(req, 'account.2fa_disable', { type: 'account', id: user.id, label: user.email })
    const me = await buildMeResponse(user.id)
    return res.json({ ok: true, user: me })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Genera códigos de recuperación nuevos (los anteriores dejan de servir). */
router.post('/2fa/recovery-codes', sensitiveLimit, async (req, res) => {
  try {
    const parsed = passwordAndCodeSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Escribe tu contraseña y un código' })
    const user = await loadUser(req.user!.id)
    await assertPassword(user.password, parsed.data.password)
    if (!user.totpEnabledAt) throw new HttpError(400, 'La verificación en dos pasos no está activa')
    const result = await verifySecondFactor(user, parsed.data.code, { allowRecoveryCode: false })
    if (!result.ok) return res.status(result.status).json({ error: result.error })

    const { codes, hashes } = generateRecoveryCodes()
    await prisma.user.update({ where: { id: user.id }, data: { totpRecoveryCodes: hashes } })
    if (user.role === 'SUPER_ADMIN') {
      await audit(req, 'account.2fa_recovery_codes', { type: 'account', id: user.id, label: user.email })
    }
    return res.json({ ok: true, recoveryCodes: codes })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Privacidad ----------------------------------------------------------------

/** Solo el primer usuario BUSINESS (quien abrió la cuenta) puede eliminar el negocio completo. */
async function deletionScope(user: { id: string; role: string; tenantId: string | null }) {
  if (user.role === 'SUPER_ADMIN') return 'none' as const
  if (user.role === 'BUSINESS' && user.tenantId) {
    const owner = await prisma.user.findFirst({
      where: { tenantId: user.tenantId, role: 'BUSINESS', deletedAt: null },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    return owner?.id === user.id ? ('business' as const) : ('user' as const)
  }
  return 'user' as const
}

router.get('/privacy', async (req, res) => {
  try {
    const user = await loadUser(req.user!.id)
    const [acceptances, consentEvents, scope] = await Promise.all([
      prisma.termsAcceptance.findMany({
        where: { userId: user.id },
        orderBy: { acceptedAt: 'desc' },
        select: { version: true, signedName: true, acceptedAt: true, source: true },
      }),
      prisma.consentEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { kind: true, granted: true, source: true, createdAt: true },
      }),
      deletionScope(user),
    ])
    return res.json({
      marketingOptIn: user.marketingOptIn,
      marketingOptInAt: user.marketingOptInAt,
      marketingOptOutAt: user.marketingOptOutAt,
      termsAcceptances: acceptances,
      consentEvents,
      deletionScope: scope,
      twoFactorEnabled: Boolean(user.totpEnabledAt),
    })
  } catch (e) {
    return sendError(res, e)
  }
})

const marketingSchema = z.object({ optIn: z.boolean() })

/** Dar o retirar el consentimiento para correos de marketing (independiente de los términos). */
router.patch('/marketing', async (req, res) => {
  try {
    const parsed = marketingSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    const user = await loadUser(req.user!.id)
    const { optIn } = parsed.data
    if (optIn !== user.marketingOptIn) {
      const now = new Date()
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: optIn
            ? { marketingOptIn: true, marketingOptInAt: now, marketingOptOutAt: null }
            : { marketingOptIn: false, marketingOptOutAt: now },
        }),
        prisma.consentEvent.create({
          data: {
            userId: user.id,
            email: user.email,
            kind: 'MARKETING_EMAIL',
            granted: optIn,
            source: 'account',
            ip: clientIp(req),
            userAgent: clientUserAgent(req),
          },
        }),
      ])
    }
    const me = await buildMeResponse(user.id)
    return res.json({ ok: true, marketingOptIn: optIn, user: me })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Descargar datos -----------------------------------------------------------

router.get('/export', exportLimit, async (req, res) => {
  try {
    const data = await exportAccountData(req.user!.id)
    const stamp = new Date().toISOString().slice(0, 10)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="cosdi-mis-datos-${stamp}.json"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.send(JSON.stringify(data, null, 2))
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Eliminar cuenta -----------------------------------------------------------

const deleteSchema = z.object({
  password: z.string().min(1).max(200),
  confirm: z.literal('ELIMINAR'),
  code: z.string().trim().max(20).optional(),
})

router.post('/delete', sensitiveLimit, async (req, res) => {
  try {
    const parsed = deleteSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Escribe tu contraseña y la palabra ELIMINAR para confirmar' })
    }
    const user = await loadUser(req.user!.id)
    await assertPassword(user.password, parsed.data.password)

    if (user.totpEnabledAt) {
      if (!parsed.data.code) {
        return res.status(400).json({ error: 'Escribe un código de tu app de autenticación', code: 'TWO_FACTOR_REQUIRED' })
      }
      const result = await verifySecondFactor(user, parsed.data.code, { allowRecoveryCode: true })
      if (!result.ok) return res.status(result.status).json({ error: result.error })
    }

    const scope = await deletionScope(user)
    if (scope === 'none') {
      throw new HttpError(400, 'La cuenta de plataforma no se elimina desde aquí')
    }

    const ip = clientIp(req)
    if (scope === 'business' && user.tenantId) {
      await deleteTenantCompletely(user.tenantId, 'user_request', ip)
    } else {
      await anonymizeUser(user.id, 'user_request', ip)
    }

    // Constancia para el titular (si el correo falla, la eliminación ya ocurrió).
    void sendAccountDeletedConfirmation({ to: user.email, name: user.name })

    return res.json({ ok: true, scope })
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
