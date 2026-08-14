/**
 * Delete specific QA tenants by id (confirmed inventory).
 * Usage: npx tsx prisma/delete-qa-ids.ts --execute
 * Default: dry-run
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/** Confirmed from prod inventory 2026-08-03 — do not expand without re-inventory. */
const TENANT_IDS = [
  'cmsaxwdjr000umu01krns3gi8', // Negocio de QA Register Flow
  'cmsaxr4fd000dmu011lxhd5ng', // Negocio de QA Smoke Test 2
  'cmsaxmqwg0004mu01o3s9qhb7', // QA Negocio Smoke
]

async function main() {
  const execute = process.argv.includes('--execute')
  console.log(execute ? '=== EXECUTE ===' : '=== DRY RUN ===')

  for (const id of TENANT_IDS) {
    const rows = await prisma.$queryRaw<
      { id: string; name: string; slug: string }[]
    >`SELECT id, name, slug FROM "Tenant" WHERE id = ${id}`
    const t = rows[0]
    if (!t) {
      console.log(`[MISS] ${id}`)
      continue
    }
    if (t.slug === 'showroom-demo') {
      console.log(`[SKIP] protected ${t.slug}`)
      continue
    }
    if (execute) {
      await prisma.$executeRaw`DELETE FROM "Tenant" WHERE id = ${id}`
      console.log(`[DELETED] ${t.id} | ${t.slug} | ${t.name}`)
    } else {
      console.log(`[DRY-RUN] would delete ${t.id} | ${t.slug} | ${t.name}`)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
