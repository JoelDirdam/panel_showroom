import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, brandFilter } from '../middleware/auth.js'

const router = Router()

const stockUpdateSchema = z.object({
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
})

router.use(authenticate)

router.get('/', async (req, res) => {
  const filter = brandFilter(req.user!)
  const stock = await prisma.stock.findMany({
    where: {
      product: filter,
    },
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return res.json(stock)
})

router.patch('/:productId', async (req, res) => {
  const productId = getParam(req.params.productId)
  const parsed = stockUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const filter = brandFilter(req.user!)
  const product = await prisma.product.findFirst({
    where: { id: productId, ...filter },
    include: { stock: true },
  })

  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  const stock = await prisma.stock.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      quantity: parsed.data.quantity ?? 0,
      minStock: parsed.data.minStock ?? 5,
    },
    update: parsed.data,
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  })

  return res.json(stock)
})

export default router
