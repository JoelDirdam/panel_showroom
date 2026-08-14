/**
 * Read-only inventory of QA test users/tenants (raw SQL — safe pre/post Role rename).
 * Usage (prod proxy): set DATABASE_URL to public URL, then:
 *   npx tsx prisma/inventory-qa.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type QaUser = {
  id: string
  email: string
  name: string
  role: string
  tenantId: string | null
  createdAt: Date
  tenantName: string | null
  tenantSlug: string | null
}

type QaTenant = {
  id: string
  name: string
  slug: string
  rfc: string | null
  createdAt: Date
}

async function main() {
  const users = await prisma.$queryRaw<QaUser[]>`
    SELECT u.id, u.email, u.name, u.role::text AS role, u."tenantId", u."createdAt",
           t.name AS "tenantName", t.slug AS "tenantSlug"
    FROM "User" u
    LEFT JOIN "Tenant" t ON t.id = u."tenantId"
    WHERE (u.email ILIKE 'qa-%@example.com' OR u.name ILIKE '%QA%')
      AND u.role::text <> 'SUPER_ADMIN'
    ORDER BY u."createdAt" DESC
  `

  const tenants = await prisma.$queryRaw<QaTenant[]>`
    SELECT id, name, slug, rfc, "createdAt"
    FROM "Tenant"
    WHERE name ILIKE 'Negocio QA%'
       OR (name ILIKE '%QA%' AND slug <> 'showroom-demo')
    ORDER BY "createdAt" DESC
  `

  console.log('=== QA USERS (excl. SUPER_ADMIN) ===')
  console.log(JSON.stringify(users, null, 2))
  console.log(`count=${users.length}`)
  console.log('=== QA TENANTS (excl. showroom-demo) ===')
  console.log(JSON.stringify(tenants, null, 2))
  console.log(`count=${tenants.length}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
