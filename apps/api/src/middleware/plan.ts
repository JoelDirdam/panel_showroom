import type { NextFunction, Request, Response } from 'express'
import type { PlanType } from '@prisma/client'
import { canAccessModule, getEntitlements, type EntitlementModule } from '../lib/entitlements.js'
import { prisma } from '../lib/prisma.js'

/** El plan casi nunca cambia: se recuerda unos segundos para no consultar en cada petición. */
const CACHE_MS = 30_000
const planCache = new Map<string, { planType: PlanType | null; at: number }>()

async function tenantPlan(tenantId: string): Promise<PlanType | null> {
  const hit = planCache.get(tenantId)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.planType
  const sub = await prisma.tenantSubscription.findUnique({
    where: { tenantId },
    select: { planType: true },
  })
  const planType = sub?.planType ?? null
  planCache.set(tenantId, { planType, at: Date.now() })
  return planType
}

/**
 * Exige que el plan del negocio incluya al menos uno de los módulos dados.
 * Usa las mismas reglas que el menú del frontend (`lib/entitlements.ts`):
 * los negocios sin suscripción registrada (anteriores a los planes) conservan
 * acceso a todo. Va después de `authenticate`.
 */
export function requireModule(...modules: EntitlementModule[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user) return res.status(401).json({ error: 'No autorizado' })
    if (user.role === 'SUPER_ADMIN' || !user.tenantId) return next()

    const entitlements = getEntitlements(await tenantPlan(user.tenantId))
    if (modules.some((m) => canAccessModule(entitlements, m))) return next()

    return res.status(403).json({
      error: 'Tu plan no incluye esta función',
      code: 'MODULE_NOT_IN_PLAN',
    })
  }
}
