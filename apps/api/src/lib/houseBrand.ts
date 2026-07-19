import type { Brand, Prisma, PrismaClient } from '@prisma/client'

type DbClient = PrismaClient | Prisma.TransactionClient

export async function ensureHouseBrand(
  db: DbClient,
  tenant: { id: string; name: string; slug: string },
  contactEmail?: string | null,
): Promise<Brand> {
  const existing = await db.brand.findFirst({
    where: { tenantId: tenant.id, isHouseBrand: true },
  })
  if (existing) return existing

  const slugTaken = await db.brand.findFirst({
    where: { tenantId: tenant.id, slug: tenant.slug },
  })
  const slug = slugTaken ? `${tenant.slug}-propio` : tenant.slug

  return db.brand.create({
    data: {
      tenantId: tenant.id,
      name: tenant.name,
      slug,
      contactEmail: contactEmail ?? null,
      active: true,
      isHouseBrand: true,
    },
  })
}
