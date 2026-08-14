/**
 * Limpieza de datos de QA generados por TestSprite (tenants "Negocio QA%" y
 * usuarios huérfanos qa-%@example.com).
 *
 * Por defecto corre en modo dry-run (no borra nada, solo imprime qué haría).
 * Pasa --execute para borrar de verdad.
 *
 * Uso:
 *   npx tsx prisma/cleanup-qa.ts                 # dry-run (default)
 *   npx tsx prisma/cleanup-qa.ts --dry-run        # explícito, igual que arriba
 *   npx tsx prisma/cleanup-qa.ts --execute        # borra de verdad
 *
 * Nunca toca el tenant `showroom-demo` ni usuarios SUPER_ADMIN.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PROTECTED_SLUGS = new Set(['showroom-demo'])

function parseArgs() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')
  return { dryRun: !execute }
}

async function main() {
  const { dryRun } = parseArgs()

  console.log(dryRun ? '=== DRY RUN (no se borrará nada) ===' : '=== EJECUTANDO borrado real ===')

  const qaTenants = await prisma.tenant.findMany({
    where: {
      AND: [
        { slug: { notIn: Array.from(PROTECTED_SLUGS) } },
        {
          OR: [
            { name: { startsWith: 'Negocio QA' } },
            { name: { contains: 'QA' } },
            { slug: { startsWith: 'qa-' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      users: { select: { id: true, email: true, role: true } },
      _count: { select: { users: true, brands: true, sales: true, employees: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\nTenants QA encontrados: ${qaTenants.length}`)
  for (const tenant of qaTenants) {
    if (PROTECTED_SLUGS.has(tenant.slug)) {
      console.log(`  [SKIP] ${tenant.slug} está protegido, no se toca`)
      continue
    }
    const hasSuperAdmin = tenant.users.some((u) => u.role === 'SUPER_ADMIN')
    if (hasSuperAdmin) {
      console.log(`  [SKIP] ${tenant.slug} tiene un usuario SUPER_ADMIN, no se toca`)
      continue
    }

    const label = `${tenant.id} | ${tenant.slug} | "${tenant.name}" | creado ${tenant.createdAt.toISOString()} | usuarios=${tenant._count.users} marcas=${tenant._count.brands} ventas=${tenant._count.sales} empleados=${tenant._count.employees}`

    if (dryRun) {
      console.log(`  [DRY-RUN] borraría tenant: ${label}`)
    } else {
      await prisma.tenant.delete({ where: { id: tenant.id } })
      console.log(`  [DELETED] tenant: ${label}`)
    }
  }

  const orphanUsers = await prisma.user.findMany({
    where: {
      tenantId: null,
      role: { not: 'SUPER_ADMIN' },
      OR: [{ email: { startsWith: 'qa-', endsWith: '@example.com' } }, { name: { contains: 'QA' } }],
    },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\nUsuarios huérfanos de QA encontrados: ${orphanUsers.length}`)
  for (const user of orphanUsers) {
    const label = `${user.id} | ${user.email} | "${user.name}" | role=${user.role} | creado ${user.createdAt.toISOString()}`
    if (dryRun) {
      console.log(`  [DRY-RUN] borraría usuario huérfano: ${label}`)
    } else {
      await prisma.user.delete({ where: { id: user.id } })
      console.log(`  [DELETED] usuario huérfano: ${label}`)
    }
  }

  console.log(
    dryRun
      ? '\nDry-run completo. Nada fue borrado. Corre con --execute para aplicar los cambios.'
      : '\nLimpieza completa.',
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
