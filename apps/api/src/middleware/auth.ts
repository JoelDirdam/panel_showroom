import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Prisma, Role } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
  /** Vacío (`''`) solo para SUPER_ADMIN; rutas de tenant usan `requireTenantId`. */
  tenantId: string
  brandId: string | null
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

function verifyToken(req: Request): AuthUser | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  try {
    return jwt.verify(header.slice(7), JWT_SECRET) as AuthUser
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
const GUARD_ALLOWLIST_PREFIXES = ['/api/auth', '/api/terms', '/api/onboarding', '/uploads', '/health']

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
    select: { onboardingStep: true, tenant: { select: { id: true, onboardingComplete: true } } },
  })
  if (!dbUser) return next()

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
