import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '@prisma/client'
import { ensureHouseBrand } from '../src/lib/houseBrand.js'

const prisma = new PrismaClient()

const TERMS_VERSION = '1.0'
const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — v${TERMS_VERSION}

Este documento es un texto legal de referencia (placeholder) para el flujo de onboarding.
Debe ser revisado y sustituido por el equipo legal antes de salir a producción.

1. Objeto. Estos términos regulan el uso de la plataforma para la gestión de negocios,
   marcas y consignaciones.
2. Aceptación. Al registrarte y continuar con el proceso de alta, aceptas estos términos.
3. Responsabilidades. El negocio es responsable de la información que registra sobre sus
   marcas, productos y comisiones.
4. Privacidad. Los datos personales se tratan conforme a la política de privacidad vigente.
5. Vigencia. Estos términos pueden actualizarse; se notificará una nueva versión cuando
   corresponda.`

async function main() {
  const password = process.env.SEED_PASSWORD || 'Showroom2026!'

  await prisma.termsDocument.upsert({
    where: { version: TERMS_VERSION },
    update: {},
    create: {
      version: TERMS_VERSION,
      title: 'Términos y Condiciones',
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
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@showroom.com' },
    update: { password: adminHash, tenantId: tenant.id },
    create: {
      email: 'admin@showroom.com',
      password: adminHash,
      name: 'Administrador Showroom',
      role: Role.ADMIN,
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
