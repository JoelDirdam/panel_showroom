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

const stockEntrySchema = z.object({
  quantity: z.number().int().positive(),
  note: z.string().optional().nullable(),
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

router.get('/:productId/entries', async (req, res) => {
  const productId = getParam(req.params.productId)
  const filter = brandFilter(req.user!)
  const product = await prisma.product.findFirst({
    where: { id: productId, ...filter },
  })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  const entries = await prisma.stockEntry.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })
  return res.json(entries)
})

router.post('/:productId/entries', async (req, res) => {
  const productId = getParam(req.params.productId)
  const parsed = stockEntrySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const filter = brandFilter(req.user!)
  const product = await prisma.product.findFirst({
    where: { id: productId, ...filter },
    include: { stock: true },
  })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  const { quantity, note } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.stockEntry.create({
      data: {
        productId: product.id,
        quantity,
        note: note || null,
        createdById: req.user!.id,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    const stock = await tx.stock.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        quantity,
        minStock: 5,
      },
      update: {
        quantity: { increment: quantity },
      },
      include: {
        product: {
          include: { brand: { select: { id: true, name: true } } },
        },
      },
    })

    return { entry, stock }
  })

  return res.status(201).json(result)
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
