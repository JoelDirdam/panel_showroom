import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { slugify } from '../lib/slug.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(80),
})

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
})

async function uniqueSlug(tenantId: string, base: string, excludeId?: string): Promise<string> {
  const existing = await prisma.category.findMany({
    where: { tenantId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  })
  const taken = new Set(existing.map((c) => c.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

router.use(authenticate)

/** Lista mínima para selects (alta de producto, filtros, etc.). */
router.get('/', async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true'
  const categories = await prisma.category.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(includeInactive ? {} : { active: true }),
    },
    orderBy: { name: 'asc' },
  })
  return res.json(categories)
})

/** Cualquier usuario autenticado del tenant puede proponer una categoría nueva. */
router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Nombre de categoría inválido' })
  }

  const tenantId = req.user!.tenantId
  const base = slugify(parsed.data.name)

  const existing = await prisma.category.findFirst({
    where: { tenantId, name: { equals: parsed.data.name, mode: 'insensitive' } },
  })
  if (existing) return res.status(200).json(existing)

  const slug = await uniqueSlug(tenantId, base)
  const category = await prisma.category.create({
    data: { tenantId, name: parsed.data.name, slug },
  })
  return res.status(201).json(category)
})

router.patch('/:id', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const existing = await prisma.category.findFirst({
    where: { id, tenantId: req.user!.tenantId },
  })
  if (!existing) return res.status(404).json({ error: 'Categoría no encontrada' })

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  })
  return res.json(category)
})

export default router
