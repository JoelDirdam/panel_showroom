import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '@prisma/client'
import { ensureHouseBrand } from '../src/lib/houseBrand.js'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.SEED_PASSWORD || 'Showroom2026!'

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'showroom-demo' },
    update: {},
    create: {
      name: 'Showroom Demo',
      slug: 'showroom-demo',
      active: true,
    },
  })

  await ensureHouseBrand(prisma, tenant, 'admin@showroom.com')

  const brand = await prisma.brand.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'bubbles-demo' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Bubbles Demo',
      slug: 'bubbles-demo',
      contactEmail: 'demo@bubbles.com',
      active: true,
      isHouseBrand: false,
    },
  })

  const adminHash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email: 'admin@showroom.com' },
    update: { password: adminHash, tenantId: tenant.id },
    create: {
      email: 'admin@showroom.com',
      password: adminHash,
      name: 'Administrador Showroom',
      role: Role.ADMIN,
      tenantId: tenant.id,
    },
  })

  const brandHash = await bcrypt.hash(password, 10)
  await prisma.user.upsert({
    where: { email: 'marca@bubbles.com' },
    update: { password: brandHash, tenantId: tenant.id, brandId: brand.id },
    create: {
      email: 'marca@bubbles.com',
      password: brandHash,
      name: 'Usuario Marca Demo',
      role: Role.BRAND,
      tenantId: tenant.id,
      brandId: brand.id,
    },
  })

  const products = [
    { name: 'Vela aromática lavanda', sku: 'VEL-001', quantity: 24, price: 12.5 },
    { name: 'Difusor cerámica', sku: 'DIF-002', quantity: 3, price: 28.0 },
    { name: 'Jabón artesanal', sku: 'JAB-003', quantity: 45, price: 8.5 },
  ]

  for (const item of products) {
    await prisma.product.upsert({
      where: { brandId_sku: { brandId: brand.id, sku: item.sku } },
      update: {},
      create: {
        brandId: brand.id,
        name: item.name,
        sku: item.sku,
        price: item.price,
        description: `Producto demo ${item.name}`,
        stock: {
          create: { quantity: item.quantity, minStock: 5 },
        },
      },
    })
  }

  console.log('Seed completado')
  console.log('Admin: admin@showroom.com')
  console.log('Marca: marca@bubbles.com')
  console.log(`Contraseña: ${password}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
