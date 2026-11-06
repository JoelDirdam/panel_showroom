import bcrypt from 'bcryptjs'
import { PrismaClient, Role } from '@prisma/client'
import { ensureHouseBrand } from '../src/lib/houseBrand.js'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Administrador'
  const tenantName = process.env.TENANT_NAME || name
  const tenantSlug = process.env.TENANT_SLUG || email?.split('@')[0]?.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL y ADMIN_PASSWORD son requeridos')
  }
  if (!tenantSlug) {
    throw new Error('No se pudo derivar TENANT_SLUG; defínelo explícitamente')
  }

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    const hash = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { email },
      data: { password: hash, name, role: Role.BUSINESS, brandId: null },
    })
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: existingUser.tenantId } })
    const house = await ensureHouseBrand(prisma, tenant, email)
    console.log(`Admin actualizado: ${email} (tenant: ${tenant.slug})`)
    console.log(`House brand: ${house.name} (${house.slug})`)
    return
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: tenantSlug,
      active: true,
    },
  })

  await prisma.sucursal.create({
    data: {
      tenantId: tenant.id,
      name: 'Sucursal principal',
      address: null,
    },
  })

  const house = await ensureHouseBrand(prisma, tenant, email)

  const hash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: {
      email,
      password: hash,
      name,
      role: Role.BUSINESS,
      tenantId: tenant.id,
    },
  })

  console.log(`Tenant creado: ${tenant.name} (${tenant.slug})`)
  console.log(`House brand: ${house.name} (${house.slug})`)
  console.log(`Admin creado: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
