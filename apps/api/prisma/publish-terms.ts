/**
 * Publica la versión de Términos y Condiciones de src/legal/terms-content.ts.
 * Alternativa recomendada: Panel de plataforma → Términos (queda en la bitácora).
 *
 * Una versión ya publicada NO se sobrescribe: si el texto cambió, sube
 * TERMS_VERSION y vuelve a ejecutar. Publicar una versión nueva obliga a todos
 * los usuarios a aceptarla al entrar.
 *
 * Uso local:  npx tsx prisma/publish-terms.ts
 * Railway:    railway ssh --service api --environment <entorno> -- npx tsx prisma/publish-terms.ts
 */
import { createHash } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { TERMS_CONTENT, TERMS_SUMMARY, TERMS_TITLE, TERMS_VERSION } from '../src/legal/terms-content.js'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.termsDocument.findUnique({ where: { version: TERMS_VERSION } })
  if (existing) {
    if (existing.content === TERMS_CONTENT) {
      console.log(`La versión ${TERMS_VERSION} ya está publicada con este mismo texto. Nada que hacer.`)
      return
    }
    console.error(
      `La versión ${TERMS_VERSION} ya está publicada con un texto distinto y no se puede modificar.\n` +
        'Sube TERMS_VERSION en src/legal/terms-content.ts y vuelve a ejecutar.',
    )
    process.exitCode = 1
    return
  }
  const previous = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  const doc = await prisma.termsDocument.create({
    data: {
      version: TERMS_VERSION,
      title: TERMS_TITLE,
      content: TERMS_CONTENT,
      summary: TERMS_SUMMARY,
      publishedAt: new Date(),
    },
  })
  // Mismo registro que deja el panel (Términos → Publicar), para que la bitácora quede completa.
  await prisma.adminAuditLog.create({
    data: {
      actorEmail: 'cli:publish-terms',
      action: 'terms.publish',
      targetType: 'terms',
      targetId: doc.id,
      targetLabel: `v${doc.version}`,
      details: {
        previousVersion: previous?.version ?? null,
        contentHash: createHash('sha256').update(doc.content).digest('hex'),
        notify: 'none',
        queued: 0,
      },
    },
  })
  console.log(`Términos publicados: v${doc.version} (${doc.id}) @ ${doc.publishedAt.toISOString()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
