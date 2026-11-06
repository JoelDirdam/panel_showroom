import type { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'

type Db = Prisma.TransactionClient | typeof prisma

export async function listActiveSucursales(tenantId: string, db: Db = prisma) {
  return db.sucursal.findMany({
    where: { tenantId, isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, address: true },
  })
}

/** Ensures the tenant has at least one active branch (used by AI and new tenants). */
export async function ensurePrincipalSucursal(tenantId: string, db: Db = prisma) {
  const existing = await listActiveSucursales(tenantId, db)
  if (existing.length > 0) return existing

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, address: true },
  })
  const created = await db.sucursal.create({
    data: {
      tenantId,
      name: 'Sucursal principal',
      address: tenant?.address ?? null,
    },
    select: { id: true, name: true, address: true },
  })
  return [created]
}
