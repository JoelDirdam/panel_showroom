/**
 * Publica (o actualiza) la versión vigente de Términos y Condiciones.
 *
 * Uso local:  npx tsx prisma/publish-terms.ts
 * Producción: railway run --service api --environment production -- npx tsx prisma/publish-terms.ts
 */
import { PrismaClient } from '@prisma/client'
import { TERMS_CONTENT, TERMS_TITLE, TERMS_VERSION } from './terms-content.js'

const prisma = new PrismaClient()

async function main() {
  const doc = await prisma.termsDocument.upsert({
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
      publishedAt: new Date(),
    },
  })

  console.log(`Términos publicados: v${doc.version} (${doc.id}) @ ${doc.publishedAt.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
