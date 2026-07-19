import 'dotenv/config'
import { prisma } from '../src/lib/prisma.js'
import { ensureHouseBrand } from '../src/lib/houseBrand.js'

async function main() {
  const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'asc' } })
  let created = 0
  let skipped = 0

  for (const tenant of tenants) {
    const before = await prisma.brand.findFirst({
      where: { tenantId: tenant.id, isHouseBrand: true },
    })
    const brand = await ensureHouseBrand(prisma, tenant)
    if (before) {
      skipped += 1
      console.log(`OK (existía): ${tenant.slug} → ${brand.name} (${brand.slug})`)
    } else {
      created += 1
      console.log(`Creada: ${tenant.slug} → ${brand.name} (${brand.slug})`)
    }
  }

  console.log(`Listo. Creadas: ${created}. Ya existían: ${skipped}. Tenants: ${tenants.length}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
