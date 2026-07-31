import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { generateUniqueSku } from '../lib/sku.js'
import { storage } from '../lib/storage.js'
import { authenticate, authorize, brandFilter, tenantFilter } from '../middleware/auth.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

const productSchema = z.object({
  brandId: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().min(1).optional(),
  categoryId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const productInclude = {
  brand: { select: { id: true, name: true, isHouseBrand: true } },
  category: { select: { id: true, name: true } },
  stock: true,
} satisfies Prisma.ProductInclude

router.use(authenticate)

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

router.get('/', async (req, res) => {
  const filter = brandFilter(req.user!)
  // Solo ADMIN puede acotar por marca explícitamente (BRAND ya queda fijo por brandFilter).
  const brandId = typeof req.query.brandId === 'string' ? req.query.brandId.trim() : ''
  if (brandId && req.user!.role === 'ADMIN') {
    filter.brandId = brandId
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const name = typeof req.query.name === 'string' ? req.query.name.trim() : ''
  const sku = typeof req.query.sku === 'string' ? req.query.sku.trim() : ''
  const priceMin = parseOptionalNumber(req.query.priceMin)
  const priceMax = parseOptionalNumber(req.query.priceMax)
  const stockMin = parseOptionalNumber(req.query.stockMin)
  const stockMax = parseOptionalNumber(req.query.stockMax)
  const sinStock =
    req.query.sinStock === 'true' || req.query.sinStock === '1' || req.query.sinStock === '__YES__'

  const stockFilter: Prisma.StockWhereInput = {}
  if (sinStock) {
    stockFilter.quantity = 0
  } else {
    if (stockMin !== undefined || stockMax !== undefined) {
      stockFilter.quantity = {
        ...(stockMin !== undefined ? { gte: stockMin } : {}),
        ...(stockMax !== undefined ? { lte: stockMax } : {}),
      }
    }
  }

  const where: Prisma.ProductWhereInput = {
    ...filter,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
            { brand: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {
          ...(name ? { name: { contains: name, mode: 'insensitive' } } : {}),
          ...(sku ? { sku: { contains: sku, mode: 'insensitive' } } : {}),
        }),
    ...(priceMin !== undefined || priceMax !== undefined
      ? {
          price: {
            ...(priceMin !== undefined ? { gte: priceMin } : {}),
            ...(priceMax !== undefined ? { lte: priceMax } : {}),
          },
        }
      : {}),
    ...(Object.keys(stockFilter).length > 0 ? { stock: stockFilter } : {}),
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: productInclude,
  })
  return res.json(products)
})

router.get('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const filter = brandFilter(req.user!)
  const product = await prisma.product.findFirst({
    where: { id, ...filter },
    include: {
      ...productInclude,
      stockEntries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  })
  if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
  return res.json(product)
})

router.post('/', authorize('ADMIN'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const brandId =
    req.user!.role === 'BRAND'
      ? req.user!.brandId!
      : parsed.data.brandId

  if (!brandId) {
    return res.status(400).json({ error: 'brandId es requerido' })
  }

  const brand = await prisma.brand.findFirst({
    where: { id: brandId, ...tenantFilter(req.user!) },
  })
  if (!brand) {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }

  const { quantity = 0, minStock = 5, sku: requestedSku, ...productData } = parsed.data
  const sku = requestedSku?.trim() || (await generateUniqueSku(brandId, productData.name))

  try {
    const product = await prisma.product.create({
      data: {
        ...productData,
        sku,
        brandId,
        price: productData.price != null ? new Prisma.Decimal(productData.price) : null,
        stock: {
          create: { quantity, minStock },
        },
      },
      include: productInclude,
    })
    if (quantity > 0) {
      await prisma.stockEntry.create({
        data: {
          productId: product.id,
          quantity,
          note: 'Alta inicial de producto',
          createdById: req.user!.id,
        },
      })
    }
    return res.status(201).json(product)
  } catch {
    return res.status(409).json({ error: 'SKU duplicado para esta marca' })
  }
})

/** Sube una imagen de producto y regresa la URL para usarla en create/update. */
router.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo' })
  }
  const saved = await storage.save(req.file.buffer, req.file.originalname, 'products')
  return res.status(201).json({ url: saved.url })
})

/** Elimina varios productos a la vez (solo ADMIN). */
router.post('/bulk-delete', authorize('ADMIN'), async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Selecciona al menos un producto' })
  }

  const filter = brandFilter(req.user!)
  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.ids }, ...filter },
    select: { id: true },
  })

  const result = await prisma.product.deleteMany({
    where: { id: { in: products.map((p) => p.id) } },
  })

  return res.json({ deleted: result.count, skipped: parsed.data.ids.length - result.count })
})

router.patch('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = productSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const filter = brandFilter(req.user!)
  const existing = await prisma.product.findFirst({
    where: { id, ...filter },
  })
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  const { quantity, minStock, brandId: _brandId, sku: _sku, ...productData } = parsed.data

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      price:
        productData.price != null
          ? new Prisma.Decimal(productData.price)
          : productData.price === null
            ? null
            : undefined,
      stock:
        quantity !== undefined || minStock !== undefined
          ? {
              upsert: {
                create: { quantity: quantity ?? 0, minStock: minStock ?? 5 },
                update: {
                  ...(quantity !== undefined ? { quantity } : {}),
                  ...(minStock !== undefined ? { minStock } : {}),
                },
              },
            }
          : undefined,
    },
    include: {
      ...productInclude,
      stockEntries: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  return res.json(product)
})

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const filter = brandFilter(req.user!)
  const existing = await prisma.product.findFirst({
    where: { id, ...filter },
  })
  if (!existing) return res.status(404).json({ error: 'Producto no encontrado' })

  await prisma.product.delete({ where: { id } })
  return res.status(204).send()
})

export default router
