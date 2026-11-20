/**
 * Limpieza de cuentas de prueba (17-nov-2026, inventario de producción confirmado).
 *
 * - Elimina 3 usuarios MARCA de QA automatizado dentro de "Showroom Demo".
 * - Marca como cuentas de prueba (Tenant.isTest) los negocios que se conservan para probar.
 * Deja todo en la bitácora de plataforma. Por defecto solo muestra lo que haría.
 *
 * Uso: npx tsx prisma/prod-test-accounts.ts            (simulación)
 *      npx tsx prisma/prod-test-accounts.ts --execute  (aplica)
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const ACTOR = 'cli:prod-test-accounts'

/** Usuarios creados por pruebas automáticas (correo @example.com). No ampliar sin volver a revisar. */
const DELETE_USER_EMAILS = [
  'qa-agenda-brand-1794510074@example.com',
  'test-test-marca-36710@example.com',
  'agenda-brand-1784360119@example.com',
]

/** Negocios que se conservan como cuentas de prueba. */
const TEST_TENANT_SLUGS = ['showroom-demo', 'prueba-pago-cosdi']

async function main() {
  const execute = process.argv.includes('--execute')
  console.log(execute ? '=== APLICANDO ===' : '=== SIMULACIÓN (no cambia nada) ===')

  for (const email of DELETE_USER_EMAILS) {
    const u = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: { select: { slug: true } },
        _count: {
          select: {
            sales: true,
            attendedSales: true,
            stockEntries: true,
            layaways: true,
            requestedProducts: true,
            acceptedProducts: true,
            rejectedProducts: true,
            stockAppointments: true,
            ownedBrands: true,
          },
        },
      },
    })
    if (!u) {
      console.log(`[no existe] ${email}`)
      continue
    }
    if (u.role === 'SUPER_ADMIN' || !email.endsWith('@example.com')) throw new Error(`No se borra ${email}`)
    // Una cita de reabasto de prueba sí se borra con el usuario; cualquier otro vínculo lo detiene.
    const linked = Object.entries(u._count).filter(([k, n]) => n > 0 && k !== 'stockAppointments')
    const brand = u.brandId
      ? await prisma.brand.findUnique({
          where: { id: u.brandId },
          select: { id: true, name: true, slug: true, _count: { select: { products: true, users: true, productRequests: true, rentPayments: true, cutoffSettlements: true } } },
        })
      : null
    // La marca de QA se borra solo si está vacía y este usuario es el único.
    const dropBrand = Boolean(
      brand && brand.slug.startsWith('agenda-') && brand._count.products === 0 && brand._count.productRequests === 0 && brand._count.rentPayments === 0 && brand._count.cutoffSettlements === 0 && brand._count.users === 1,
    )
    console.log(
      `[usuario] ${email} (${u.role}, negocio ${u.tenant?.slug ?? '—'}) citas de prueba: ${u._count.stockAppointments}` +
        ` otros vínculos: ${JSON.stringify(Object.fromEntries(linked))} marca: ${brand ? `${brand.name} ${JSON.stringify(brand._count)}${dropBrand ? ' -> se borra' : ' -> se conserva'}` : '—'}`,
    )
    if (linked.length) {
      console.log('   -> tiene registros ligados; NO se borra')
      continue
    }
    if (execute) {
      await prisma.$transaction([
        prisma.stockAppointment.deleteMany({ where: { bookedById: u.id } }),
        prisma.user.delete({ where: { id: u.id } }),
        ...(dropBrand && brand ? [prisma.brand.delete({ where: { id: brand.id } })] : []),
        prisma.adminAuditLog.create({
          data: {
            actorEmail: ACTOR,
            action: 'user.delete_test',
            targetType: 'user',
            targetId: u.id,
            targetLabel: email,
            details: {
              tenantSlug: u.tenant?.slug ?? null,
              reason: 'Usuario de QA automatizado',
              stockAppointmentsDeleted: u._count.stockAppointments,
              brandDeleted: dropBrand ? brand?.slug : null,
            },
          },
        }),
      ])
      console.log('   -> eliminado')
    }
  }

  for (const slug of TEST_TENANT_SLUGS) {
    const t = await prisma.tenant.findUnique({ where: { slug }, select: { id: true, name: true, isTest: true } })
    if (!t) {
      console.log(`[no existe] negocio ${slug}`)
      continue
    }
    console.log(`[negocio] ${t.name} (${slug}) isTest=${t.isTest}${t.isTest ? '' : ' -> se marca como prueba'}`)
    if (execute && !t.isTest) {
      await prisma.$transaction([
        prisma.tenant.update({ where: { id: t.id }, data: { isTest: true } }),
        prisma.adminAuditLog.create({
          data: { actorEmail: ACTOR, action: 'tenant.mark_test', targetType: 'tenant', targetId: t.id, targetLabel: t.name },
        }),
      ])
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
