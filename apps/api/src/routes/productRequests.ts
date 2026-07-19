import { Prisma } from '@prisma/client'
import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const createProductRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('CREATE_PRODUCT'),
    name: z.string().min(1),
    sku: z.string().min(1),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative(),
    imageUrl: z.string().url().optional().nullable(),
    quantity: z.number().int().nonnegative(),
    minStock: z.number().int().nonnegative(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  z.object({
    type: z.literal('RESTOCK'),
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    notes: z.string().max(1000).optional().nullable(),
  }),
])

const updateCreateProductRequestSchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  price: z.number().nonnegative().optional(),
  imageUrl: z.string().url().optional().nullable(),
  quantity: z.number().int().nonnegative().optional(),
  minStock: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional().nullable(),
})

const updateRestockRequestSchema = z.object({
  productId: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional().nullable(),
})

const acceptRequestsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})

const requestInclude = {
  brand: { select: { id: true, name: true, whatsapp: true } },
  product: { select: { id: true, name: true, sku: true } },
  requestedBy: { select: { id: true, name: true } },
  acceptedBy: { select: { id: true, name: true } },
} as const

router.use(authenticate)

router.get('/', async (req, res) => {
  const status =
    req.query.status === 'ACCEPTED'
      ? 'ACCEPTED'
      : req.query.status === 'ALL'
        ? undefined
        : 'PENDING'

  const requests = await prisma.productRequest.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(req.user!.role === 'BRAND' ? { brandId: req.user!.brandId ?? '__missing__' } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: requestInclude,
  })

  return res.json(requests)
})

router.get('/pending-count', async (req, res) => {
  const count = await prisma.productRequest.count({
    where: {
      tenantId: req.user!.tenantId,
      status: 'PENDING',
      ...(req.user!.role === 'BRAND' ? { brandId: req.user!.brandId ?? '__missing__' } : {}),
    },
  })
  return res.json({ count })
})

router.patch('/:id', authorize('BRAND'), async (req, res) => {
  if (!req.user!.brandId) {
    return res.status(400).json({ error: 'El usuario no tiene una marca vinculada' })
  }

  const id = getParam(req.params.id)
  const existing = await prisma.productRequest.findFirst({
    where: {
      id,
      brandId: req.user!.brandId,
      tenantId: req.user!.tenantId,
    },
  })
  if (!existing) return res.status(404).json({ error: 'Solicitud no encontrada' })
  if (existing.status !== 'PENDING') {
    return res.status(409).json({ error: 'Solo se pueden editar solicitudes pendientes' })
  }

  if (existing.type === 'CREATE_PRODUCT') {
    const parsed = updateCreateProductRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }

    const data = parsed.data
    const nextSku = data.sku ?? existing.sku
    if (!nextSku) {
      return res.status(400).json({ error: 'SKU requerido' })
    }

    const duplicate = await prisma.product.findFirst({
      where: { brandId: existing.brandId, sku: nextSku },
      select: { id: true },
    })
    if (duplicate) return res.status(409).json({ error: 'Ya existe un producto con ese SKU' })

    const pendingDuplicate = await prisma.productRequest.findFirst({
      where: {
        brandId: existing.brandId,
        sku: nextSku,
        type: 'CREATE_PRODUCT',
        status: 'PENDING',
        NOT: { id: existing.id },
      },
      select: { id: true },
    })
    if (pendingDuplicate) {
      return res.status(409).json({ error: 'Ya existe una solicitud pendiente con ese SKU' })
    }

    const updated = await prisma.productRequest.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl?.trim() || null } : {}),
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.minStock !== undefined ? { minStock: data.minStock } : {}),
        ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
      },
      include: requestInclude,
    })
    return res.json(updated)
  }

  const parsed = updateRestockRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const data = parsed.data
  let productId = existing.productId
  if (data.productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: data.productId,
        brandId: existing.brandId,
        brand: { tenantId: req.user!.tenantId },
      },
      select: { id: true },
    })
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })
    productId = product.id
  }

  const updated = await prisma.productRequest.update({
    where: { id },
    data: {
      ...(productId ? { productId } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.notes !== undefined ? { notes: data.notes?.trim() || null } : {}),
    },
    include: requestInclude,
  })
  return res.json(updated)
})

router.post('/', authorize('BRAND'), async (req, res) => {
  if (!req.user!.brandId) {
    return res.status(400).json({ error: 'El usuario no tiene una marca vinculada' })
  }

  const parsed = createProductRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const data = parsed.data
  const brandId = req.user!.brandId
  const tenantId = req.user!.tenantId

  if (data.type === 'RESTOCK') {
    const product = await prisma.product.findFirst({
      where: { id: data.productId, brandId, brand: { tenantId } },
    })
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' })

    const request = await prisma.productRequest.create({
      data: {
        tenantId,
        brandId,
        requestedById: req.user!.id,
        type: data.type,
        productId: product.id,
        quantity: data.quantity,
        notes: data.notes?.trim() || null,
      },
      include: {
        brand: { select: { id: true, name: true, whatsapp: true } },
        product: { select: { id: true, name: true, sku: true } },
      },
    })
    return res.status(201).json(request)
  }

  const duplicate = await prisma.product.findFirst({
    where: { brandId, sku: data.sku },
    select: { id: true },
  })
  if (duplicate) return res.status(409).json({ error: 'Ya existe un producto con ese SKU' })

  const pendingDuplicate = await prisma.productRequest.findFirst({
    where: { brandId, sku: data.sku, type: 'CREATE_PRODUCT', status: 'PENDING' },
    select: { id: true },
  })
  if (pendingDuplicate) {
    return res.status(409).json({ error: 'Ya existe una solicitud pendiente con ese SKU' })
  }

  const request = await prisma.productRequest.create({
    data: {
      tenantId,
      brandId,
      requestedById: req.user!.id,
      type: data.type,
      name: data.name,
      sku: data.sku,
      description: data.description?.trim() || null,
      price: new Prisma.Decimal(data.price),
      imageUrl: data.imageUrl?.trim() || null,
      quantity: data.quantity,
      minStock: data.minStock,
      notes: data.notes?.trim() || null,
    },
    include: {
      brand: { select: { id: true, name: true, whatsapp: true } },
      product: { select: { id: true, name: true, sku: true } },
    },
  })

  return res.status(201).json(request)
})

router.post('/accept', authorize('ADMIN'), async (req, res) => {
  const parsed = acceptRequestsSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Selecciona al menos una solicitud válida' })
  }

  const ids = [...new Set(parsed.data.ids)]
  const requests = await prisma.productRequest.findMany({
    where: {
      id: { in: ids },
      tenantId: req.user!.tenantId,
      status: 'PENDING',
    },
  })

  if (requests.length !== ids.length) {
    return res.status(409).json({
      error: 'Una o más solicitudes ya no están pendientes o no pertenecen al showroom',
    })
  }

  try {
    const accepted = await prisma.$transaction(async (tx) => {
      const results = []

      for (const request of requests) {
        let productId = request.productId

        if (request.type === 'CREATE_PRODUCT') {
          if (!request.name || !request.sku) {
            throw new Error('Solicitud de producto incompleta')
          }
          const product = await tx.product.create({
            data: {
              brandId: request.brandId,
              name: request.name,
              sku: request.sku,
              description: request.description,
              price: request.price,
              imageUrl: request.imageUrl,
              stock: {
                create: {
                  quantity: request.quantity,
                  minStock: request.minStock,
                },
              },
            },
          })
          productId = product.id

          if (request.quantity > 0) {
            await tx.stockEntry.create({
              data: {
                productId,
                quantity: request.quantity,
                note: `Solicitud aprobada${request.notes ? `: ${request.notes}` : ''}`,
                createdById: req.user!.id,
              },
            })
          }
        } else {
          if (!productId) throw new Error('Producto de restock no encontrado')

          const product = await tx.product.findFirst({
            where: {
              id: productId,
              brandId: request.brandId,
              brand: { tenantId: req.user!.tenantId },
            },
          })
          if (!product) throw new Error('Producto de restock no encontrado')

          await tx.stockEntry.create({
            data: {
              productId,
              quantity: request.quantity,
              note: `Solicitud de restock aprobada${request.notes ? `: ${request.notes}` : ''}`,
              createdById: req.user!.id,
            },
          })
          await tx.stock.upsert({
            where: { productId },
            create: { productId, quantity: request.quantity, minStock: 5 },
            update: { quantity: { increment: request.quantity } },
          })
        }

        results.push(
          await tx.productRequest.update({
            where: { id: request.id },
            data: {
              status: 'ACCEPTED',
              productId,
              acceptedById: req.user!.id,
              acceptedAt: new Date(),
            },
          }),
        )
      }

      return results
    })

    return res.json({ accepted })
  } catch (error: unknown) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') {
      return res.status(409).json({ error: 'Un SKU solicitado ya existe para esa marca' })
    }
    return res.status(409).json({
      error: error instanceof Error ? error.message : 'No se pudieron aceptar las solicitudes',
    })
  }
})

export default router
