import type { Request } from 'express'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { clientIp } from './clientIp.js'

/**
 * Bitácora de acciones del SUPER_ADMIN. Nunca lanza: si no se puede escribir
 * la entrada, la acción principal no se revierte (se reporta en los logs).
 */
export interface AuditTarget {
  type: 'tenant' | 'user' | 'promo' | 'settings' | 'copyright_claim' | 'terms' | 'account'
  id?: string | null
  label?: string | null
}

export async function audit(
  req: Request,
  action: string,
  target?: AuditTarget | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: req.user?.id ?? null,
        actorEmail: req.user?.email ?? 'desconocido',
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        targetLabel: target?.label?.slice(0, 300) ?? null,
        details: (details ?? undefined) as Prisma.InputJsonValue | undefined,
        ip: clientIp(req),
      },
    })
  } catch (err) {
    console.error(`[audit] no se pudo registrar "${action}"`, err)
  }
}
