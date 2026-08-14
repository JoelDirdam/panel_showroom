/**
 * One-shot: crea un SUPER_ADMIN de plataforma.
 * Uso: SUPER_ADMIN_EMAIL=... SUPER_ADMIN_PASSWORD=... SUPER_ADMIN_NAME=... npx tsx prisma/create-super-admin.ts
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SUPER_ADMIN_PASSWORD?.trim()
  const name = process.env.SUPER_ADMIN_NAME?.trim() || 'Super Admin'

  if (!email || !password || password.length < 8) {
    console.error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (≥8 chars)')
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      name,
      role: 'SUPER_ADMIN',
      tenantId: null,
      brandId: null,
      onboardingStep: 'DONE',
      mustChangePassword: false,
    },
    create: {
      email,
      password: hash,
      name,
      role: 'SUPER_ADMIN',
      tenantId: null,
      onboardingStep: 'DONE',
    },
  })

  console.log(`SUPER_ADMIN listo: ${user.email} (${user.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
