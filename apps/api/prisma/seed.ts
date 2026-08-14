import bcrypt from 'bcryptjs'
import { PaymentMethod, PrismaClient, Role } from '@prisma/client'
import { ensureHouseBrand } from '../src/lib/houseBrand.js'
import { TERMS_CONTENT, TERMS_TITLE, TERMS_VERSION } from './terms-content.js'

const prisma = new PrismaClient()

async function main() {
  const password = process.env.SEED_PASSWORD || 'Showroom2026!'

  await prisma.termsDocument.upsert({
    where: { version: TERMS_VERSION },
    update: {
      title: TERMS_TITLE,
      content: TERMS_CONTENT,
      publishedAt: new Date(),
    },
    create: {
      version: TERMS_VERSION,
      title: TERMS_TITLE,
      content: TERMS_CONTENT,
    },
  })

  await prisma.promoCode.upsert({
    where: { code: 'MANEKI30' },
    update: {},
    create: {
      code: 'MANEKI30',
      extraTrialDays: 15,
      active: true,
    },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'showroom-demo' },
    update: { onboardingComplete: true },
    create: {
      name: 'Showroom Demo',
      slug: 'showroom-demo',
      active: true,
      onboardingComplete: true,
    },
  })

  const baseCategories = ['Ropa', 'Accesorios', 'Calzado', 'Hogar']
  for (const name of baseCategories) {
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
    await prisma.category.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        name,
        slug,
        active: true,
      },
    })
  }

  const houseBrand = await ensureHouseBrand(prisma, tenant, 'admin@showroom.com')

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
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@showroom.com' },
    update: { password: adminHash, tenantId: tenant.id },
    create: {
      email: 'admin@showroom.com',
      password: adminHash,
      name: 'Administrador Showroom',
      role: Role.BUSINESS,
      tenantId: tenant.id,
      onboardingStep: 'DONE',
      emailVerifiedAt: new Date(),
    },
  })

  const brandHash = await bcrypt.hash(password, 10)
  const brandUser = await prisma.user.upsert({
    where: { email: 'marca@bubbles.com' },
    update: { password: brandHash, tenantId: tenant.id, brandId: brand.id },
    create: {
      email: 'marca@bubbles.com',
      password: brandHash,
      name: 'Usuario Marca Demo',
      role: Role.BRAND,
      tenantId: tenant.id,
      brandId: brand.id,
      onboardingStep: 'DONE',
      emailVerifiedAt: new Date(),
    },
  })

  // Los usuarios demo ya están "onboarded": se les da por aceptados los
  // términos vigentes para no bloquearlos con el guard requireTerms.
  for (const user of [adminUser, brandUser]) {
    await prisma.termsAcceptance.upsert({
      where: { userId_version: { userId: user.id, version: TERMS_VERSION } },
      update: {},
      create: { userId: user.id, version: TERMS_VERSION, signedName: user.name },
    })
  }

  await prisma.tenantSubscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planType: 'NEGOCIO',
      status: 'ACTIVE',
      trialEndsAt: new Date('2100-01-01'),
    },
  })

  const brandProductsSpec = [
    { name: 'Vela aromática lavanda', sku: 'VEL-001', quantity: 24, price: 12.5 },
    { name: 'Difusor cerámica', sku: 'DIF-002', quantity: 3, price: 28.0 },
    { name: 'Jabón artesanal', sku: 'JAB-003', quantity: 45, price: 8.5 },
  ]

  const brandProducts = []
  for (const item of brandProductsSpec) {
    const product = await prisma.product.upsert({
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
    brandProducts.push({ ...product, seedPrice: item.price })
  }

  const houseProduct = await prisma.product.upsert({
    where: { brandId_sku: { brandId: houseBrand.id, sku: 'HOU-001' } },
    update: {},
    create: {
      brandId: houseBrand.id,
      name: 'Bolsa de tela showroom',
      sku: 'HOU-001',
      price: 15,
      description: 'Producto de marca propia demo',
      stock: { create: { quantity: 18, minStock: 5 } },
    },
  })

  const customers = await Promise.all(
    [
      { name: 'Ana Martínez', phone: '5511111111' },
      { name: 'Carlos Ruiz', phone: '5522222222' },
      { name: 'Laura Gómez', phone: '5533333333' },
    ].map(async (c) => {
      const existing = await prisma.customer.findFirst({
        where: { tenantId: tenant.id, phone: c.phone },
      })
      if (existing) return existing
      return prisma.customer.create({
        data: { tenantId: tenant.id, name: c.name, phone: c.phone },
      })
    }),
  )

  // Re-sembrar ventas demo de forma idempotente (borra y recrea el lote seed-demo).
  await prisma.sale.deleteMany({
    where: { tenantId: tenant.id, ticketComment: 'seed-demo' },
  })

  {
    const catalog = [
      ...brandProducts.map((p) => ({
        productId: p.id,
        price: Number(p.seedPrice),
        brandId: brand.id,
      })),
      { productId: houseProduct.id, price: 15, brandId: houseBrand.id },
    ]
    const methods = [
      PaymentMethod.EFECTIVO,
      PaymentMethod.TARJETA,
      PaymentMethod.TRANSFERENCIA,
      PaymentMethod.EFECTIVO,
      PaymentMethod.TARJETA,
    ]

    // Fechas ancladas a la semana/mes actuales para que el dashboard demo se vea poblado.
    const nowSeed = new Date()
    const soldAts: Date[] = []

    // Días del mes actual (hasta hoy), para KPIs mensuales
    for (let dayNum = 1; dayNum <= nowSeed.getDate(); dayNum++) {
      const day = new Date(nowSeed.getFullYear(), nowSeed.getMonth(), dayNum, 11, 0, 0, 0)
      soldAts.push(day)
      if (soldAts.length >= 8) break
    }
    // Relleno adicional en semana reciente
    for (let ago = 0; ago < 7 && soldAts.length < 10; ago++) {
      const day = new Date(nowSeed)
      day.setDate(day.getDate() - ago)
      day.setHours(15, 0, 0, 0)
      soldAts.push(day)
    }
    // Meses previos (serie apilada)
    for (const daysAgo of [20, 28, 35, 45, 55, 65, 75, 90]) {
      const day = new Date(nowSeed)
      day.setDate(day.getDate() - daysAgo)
      day.setHours(12, 30, 0, 0)
      soldAts.push(day)
    }
    while (soldAts.length < 18) {
      const day = new Date(nowSeed)
      day.setDate(day.getDate() - (soldAts.length * 5 + 14))
      day.setHours(14, 0, 0, 0)
      soldAts.push(day)
    }

    for (let i = 0; i < 18; i++) {
      const soldAt = soldAts[i]
      soldAt.setMinutes((i * 7) % 60)

      const item = catalog[i % catalog.length]
      const qty = 1 + (i % 3)
      const unitPrice = item.price
      const lineTotal = Math.round(unitPrice * qty * 100) / 100
      const customer = customers[i % customers.length]
      const method = methods[i % methods.length]

      await prisma.sale.create({
        data: {
          tenantId: tenant.id,
          paymentMethod: method,
          soldAt,
          ticketComment: 'seed-demo',
          subtotal: lineTotal,
          total: lineTotal,
          createdById: adminUser.id,
          attendedByUserId: adminUser.id,
          customerId: customer.id,
          lines: {
            create: [
              {
                productId: item.productId,
                quantity: qty,
                unitPrice,
                subtotal: lineTotal,
                total: lineTotal,
              },
            ],
          },
        },
      })
    }
  }

  const existingLayaway = await prisma.layaway.findFirst({
    where: { tenantId: tenant.id, code: 'APT-DEMO-01' },
  })
  if (!existingLayaway) {
    const p = brandProducts[0]
    const unitPrice = Number(p.seedPrice)
    const total = unitPrice * 2
    await prisma.layaway.create({
      data: {
        tenantId: tenant.id,
        code: 'APT-DEMO-01',
        status: 'OPEN',
        subtotal: total,
        total,
        balance: total - 10,
        deposit: 10,
        customerId: customers[0].id,
        createdById: adminUser.id,
        lines: {
          create: [
            {
              productId: p.id,
              quantity: 2,
              unitPrice,
              subtotal: total,
              total,
            },
          ],
        },
      },
    })
  }

  const existingRequest = await prisma.productRequest.findFirst({
    where: { tenantId: tenant.id, sku: 'REQ-DEMO-001' },
  })
  if (!existingRequest) {
    await prisma.productRequest.create({
      data: {
        tenantId: tenant.id,
        brandId: brand.id,
        requestedById: brandUser.id,
        type: 'CREATE_PRODUCT',
        status: 'PENDING',
        name: 'Aceite esencial demo',
        sku: 'REQ-DEMO-001',
        price: 22,
        quantity: 10,
        minStock: 3,
        notes: 'Solicitud seed para actividad del dashboard',
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
