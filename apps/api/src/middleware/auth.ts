import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import type { Prisma, Role } from '@prisma/client'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: Role
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

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me'

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

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' })
  }

  try {
    const token = header.slice(7)
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
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

export function tenantFilter(user: AuthUser): { tenantId: string } {
  return { tenantId: user.tenantId }
}

export function brandFilter(user: AuthUser): Prisma.ProductWhereInput {
  const tenantScope = { brand: { tenantId: user.tenantId } }
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
