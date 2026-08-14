import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

try {
  const terms = await prisma.termsDocument.upsert({
    where: { version: '1.0' },
    update: {},
    create: {
      version: '1.0',
      title: 'Terminos y Condiciones Punto Maneki',
      content:
        'Documento legal placeholder version 1.0. Al registrarte aceptas estos terminos.',
      publishedAt: new Date(),
    },
  })

  const promo = await prisma.promoCode.upsert({
    where: { code: 'MANEKI30' },
    update: { active: true },
    create: {
      code: 'MANEKI30',
      extraTrialDays: 15,
      active: true,
    },
  })

  console.log(JSON.stringify({ terms: terms.version, promo: promo.code }))
} finally {
  await prisma.$disconnect()
}
