import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Prisma, Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { superAdminTwoFactorRequired } from '../lib/environment.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  /** Vacío (`''`) solo para SUPER_ADMIN; rutas de tenant usan `requireTenantId`. */
  tenantId: string
  brandId: string | null
  /** Emisión del JWT (segundos). Sirve para invalidar sesiones al cambiar la contraseña. */
  iat?: number
}

/** true si la sesión se emitió antes del último cambio de contraseña (ya no vale). */
export function sessionRevoked(user: AuthUser, passwordChangedAt: Date | null | undefined): boolean {
  if (!passwordChangedAt || typeof user.iat !== 'number') return false
  return user.iat < Math.floor(passwordChangedAt.getTime() / 1000)
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

function resolveJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim()
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) {
    if (!fromEnv || fromEnv.length < 32) {
      console.error(
        'FATAL: JWT_SECRET must be set to a strong secret (≥32 chars) when NODE_ENV=production',
      )
      process.exit(1)
    }
    return fromEnv
  }
  if (!fromEnv) {
    console.warn('WARNING: JWT_SECRET unset; using insecure dev fallback. Do not use in production.')
    return 'dev-secret-change-me'
  }
  return fromEnv
}

const JWT_SECRET = resolveJwtSecret()

export function signToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      brandId: user.brandId,
    },
    JWT_SECRET,
    { expiresIn: '7d' },
  )
}

/** Secreto base para derivar otras claves del servidor (p. ej. cifrado de 2FA). */
export function serverSecret(): string {
  return JWT_SECRET
}

/**
 * Tokens de un solo propósito (reto de 2FA, baja de correos). Llevan `purpose`
 * y por eso NUNCA sirven como sesión: `verifyToken` los rechaza.
 */
export type TokenPurpose = '2fa-login' | 'unsubscribe' | 'password-reset'

export function signPurposeToken(
  purpose: TokenPurpose,
  payload: Record<string, unknown>,
  expiresIn?: jwt.SignOptions['expiresIn'],
): string {
  return jwt.sign({ ...payload, purpose }, JWT_SECRET, expiresIn ? { expiresIn } : {})
}

export function verifyPurposeToken<T extends Record<string, unknown>>(
  purpose: TokenPurpose,
  token: string,
): T | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    if (typeof decoded !== 'object' || decoded === null) return null
    if ((decoded as { purpose?: unknown }).purpose !== purpose) return null
    return decoded as T
  } catch {
    return null
  }
}

function verifyToken(req: Request): AuthUser | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as AuthUser & { purpose?: unknown }
    // Un token de propósito (2FA, baja de correos) no es una sesión.
    if (decoded.purpose !== undefined) return null
    if (typeof decoded.id !== 'string' || typeof decoded.role !== 'string') return null
    return decoded
  } catch {
    return null
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const payload = verifyToken(req)
  if (!payload) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  req.user = payload
  next()
}

export function authorize(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autorizado' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' })
    }
    next()
  }
}

export function requireTenantId(user: AuthUser): string {
  if (!user.tenantId || user.role === 'SUPER_ADMIN') {
    throw new Error('TENANT_REQUIRED')
  }
  return user.tenantId
}

export function tenantFilter(user: AuthUser): { tenantId: string } {
  return { tenantId: requireTenantId(user) }
}

export function brandFilter(user: AuthUser): Prisma.ProductWhereInput {
  const tenantScope = { brand: { tenantId: requireTenantId(user) } }
  if (user.role === 'BRAND' && user.brandId) {
    return { brandId: user.brandId, ...tenantScope }
  }
  return tenantScope
}

export function brandWhereFilter(user: AuthUser): Prisma.BrandWhereInput {
  const filter: Prisma.BrandWhereInput = tenantFilter(user)
  if (user.role === 'BRAND' && user.brandId) {
    filter.id = user.brandId
  }
  return filter
}

/**
 * Rutas que deben quedar exentas de los guards de términos/onboarding porque
 * son precisamente las que permiten completar esos pasos (o son públicas).
 */
const GUARD_ALLOWLIST_PREFIXES = [
  '/api/auth',
  '/api/terms',
  '/api/onboarding',
  // Descargar/borrar datos, 2FA y preferencias de privacidad deben funcionar siempre
  // (aunque la cuenta esté pausada o falte aceptar una versión nueva de los términos).
  '/api/account',
  '/api/site',
  // Pagar debe seguir disponible con la cuenta pausada (402) o sin onboarding terminado.
  '/api/billing',
  '/api/v1/whatsapp',
  '/api/public',
  '/uploads',
  '/health',
]

function isAllowlisted(req: Request): boolean {
  const p = req.path
  return GUARD_ALLOWLIST_PREFIXES.some((prefix) => p === prefix || p.startsWith(`${prefix}/`))
}

/**
 * Bloquea el acceso a rutas protegidas si el usuario autenticado no ha aceptado
 * la versión vigente de TermsDocument. No rechaza si no hay token: se delega
 * en `authenticate` (montado en cada router) para exigir el 401 correspondiente.
 * SUPER_ADMIN queda exento (plataforma interna).
 */
export async function requireTerms(req: Request, res: Response, next: NextFunction) {
  if (isAllowlisted(req)) return next()

  const user = req.user ?? verifyToken(req)
  if (!user) return next()
  req.user = req.user ?? user

  if (user.role === 'SUPER_ADMIN') return next()

  const current = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  if (!current) return next()

  // Cuentas de prueba internas (Tenant.isTest): las usa el propio equipo de COSDI,
  // que es quien redacta los términos; no se les pide aceptarlos.
  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { isTest: true } })
    if (tenant?.isTest) return next()
  }

  const accepted = await prisma.termsAcceptance.findUnique({
    where: { userId_version: { userId: user.id, version: current.version } },
  })
  if (!accepted) {
    return res.status(403).json({
      error: 'Debes aceptar los Términos y Condiciones vigentes para continuar',
      code: 'TERMS_REQUIRED',
      termsVersion: current.version,
    })
  }

  next()
}

/**
 * Bloquea el acceso a rutas protegidas si el tenant/usuario no terminó el
 * onboarding (a menos que la ruta esté en el allowlist de onboarding/auth/terms).
 * También marca/bloquea suscripción vencida (`SUBSCRIPTION_EXPIRED`).
 */
export async function requireOnboarding(req: Request, res: Response, next: NextFunction) {
  if (isAllowlisted(req)) return next()

  const user = req.user ?? verifyToken(req)
  if (!user) return next()
  req.user = req.user ?? user

  if (user.role === 'SUPER_ADMIN') return next()

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      onboardingStep: true,
      deletedAt: true,
      passwordChangedAt: true,
      tenant: { select: { id: true, onboardingComplete: true, active: true, suspendedReason: true } },
    },
  })
  // Cuenta eliminada: su token deja de servir aunque no haya expirado.
  if (!dbUser || dbUser.deletedAt || sessionRevoked(user, dbUser.passwordChangedAt)) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  // Negocio suspendido desde la plataforma. Siguen disponibles /api/account
  // (descargar o eliminar datos) y /api/billing (cancelar) por el allowlist.
  if (dbUser.tenant && !dbUser.tenant.active) {
    return res.status(403).json({
      error: 'Tu cuenta está suspendida. Escríbenos a contacto@cosdi.mx para resolverlo.',
      code: 'ACCOUNT_SUSPENDED',
      reason: dbUser.tenant.suspendedReason,
    })
  }

  if (dbUser.onboardingStep !== 'DONE' && !dbUser.tenant?.onboardingComplete) {
    return res.status(403).json({
      error: 'Debes completar la configuración inicial de tu negocio para continuar',
      code: 'ONBOARDING_REQUIRED',
      onboardingStep: dbUser.onboardingStep,
    })
  }

  if (dbUser.tenant?.id) {
    const { assertSubscriptionActive } = await import('../lib/subscription.js')
    const gate = await assertSubscriptionActive(dbUser.tenant.id)
    if (!gate.ok) {
      return res.status(402).json({
        error: 'Tu prueba o suscripción ha vencido. Renueva tu plan para continuar.',
        code: 'SUBSCRIPTION_EXPIRED',
        trialEndsAt: gate.subscription.trialEndsAt,
        status: gate.subscription.status,
      })
    }
  }

  next()
}

/**
 * El SUPER_ADMIN debe tener la verificación en dos pasos activa para usar el
 * panel de plataforma. Sin ella solo puede entrar a configurarla (/api/account).
 */
export async function requireSuperAdminTwoFactor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'No autorizado' })
  const dbUser = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true, totpEnabledAt: true, deletedAt: true, passwordChangedAt: true },
  })
  if (sessionRevoked(req.user, dbUser?.passwordChangedAt)) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  if (!dbUser || dbUser.deletedAt || dbUser.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  // En dev (Railway "dev") no se exige; en producción siempre.
  if (!dbUser.totpEnabledAt && superAdminTwoFactorRequired()) {
    return res.status(403).json({
      error: 'Activa la verificación en dos pasos para usar el panel de plataforma',
      code: 'TWO_FACTOR_SETUP_REQUIRED',
    })
  }
  next()
}
