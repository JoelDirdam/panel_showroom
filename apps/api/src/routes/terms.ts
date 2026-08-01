import { Router } from 'express'
import { prisma } from '../lib/prisma.js'

const router = Router()

/** Pública: se consulta antes de iniciar sesión (pantalla de registro). */
router.get('/current', async (_req, res) => {
  const current = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  if (!current) {
    return res.status(404).json({ error: 'No hay términos y condiciones publicados' })
  }
  return res.json(current)
})

export default router
