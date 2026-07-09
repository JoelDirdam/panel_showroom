import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const brandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email().optional().nullable(),
  active: z.boolean().optional(),
})

router.use(authenticate)

router.get('/', authorize('ADMIN'), async (_req, res) => {
  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true, users: true } },
    },
  })
  return res.json(brands)
})

router.get('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findUnique({
    where: { id },
    include: { _count: { select: { products: true, users: true } } },
  })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })
  return res.json(brand)
})

router.post('/', authorize('ADMIN'), async (req, res) => {
  const parsed = brandSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  try {
    const brand = await prisma.brand.create({ data: parsed.data })
    return res.status(201).json(brand)
  } catch {
    return res.status(409).json({ error: 'Slug ya existe' })
  }
})

router.patch('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = brandSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data: parsed.data,
    })
    return res.json(brand)
  } catch {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }
})

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  try {
    await prisma.brand.delete({ where: { id } })
    return res.status(204).send()
  } catch {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }
})

export default router
