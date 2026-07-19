import { Router } from 'express'
import { PaymentMethod, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'

const router = Router()

const saleLineInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  discount: z.number().nonnegative().optional().default(0),
  commission: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional(),
})

const createSaleSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  soldAt: z.string().datetime().optional(),
  lines: z.array(saleLineInputSchema).min(1),
})

const patchLineSchema = z.object({
  inSettlement: z.boolean().optional(),
  paid: z.boolean().optional(),
  discount: z.number().nonnegative().optional(),
  commission: z.number().nonnegative().optional(),
})

const saleInclude = {
  createdBy: { select: { id: true, name: true } },
  lines: {
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.SaleInclude

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2))
}

function filterSalesForBrand(brandId: string): Prisma.SaleWhereInput {
  return {
    lines: {
      some: {
        product: { brandId },
      },
    },
  }
}

function filterLinesForBrand<T extends { product: { brandId: string } }>(
  lines: T[],
  brandId: string | null | undefined,
  role: string,
): T[] {
  if (role === 'BRAND' && brandId) {
    return lines.filter((line) => line.product.brandId === brandId)
  }
  return lines
}

function serializeSale<T extends { lines: Array<{ product: { brandId: string } }> }>(
  sale: T,
  role: string,
  brandId: string | null | undefined,
) {
  return {
    ...sale,
    lines: filterLinesForBrand(sale.lines, brandId, role),
  }
}

router.use(authenticate)

router.get('/', async (req, res) => {
  const user = req.user!
  const where: Prisma.SaleWhereInput = tenantFilter(user)

  if (user.role === 'BRAND' && user.brandId) {
    Object.assign(where, filterSalesForBrand(user.brandId))
  }

  const paid = req.query.paid
  const inSettlement = req.query.inSettlement
  if (paid === 'true' || paid === 'false' || inSettlement === 'true' || inSettlement === 'false') {
    where.lines = {
      ...(typeof where.lines === 'object' && where.lines !== null ? where.lines : {}),
      some: {
        ...(user.role === 'BRAND' && user.brandId ? { product: { brandId: user.brandId } } : {}),
        ...(paid === 'true' || paid === 'false' ? { paid: paid === 'true' } : {}),
        ...(inSettlement === 'true' || inSettlement === 'false'
          ? { inSettlement: inSettlement === 'true' }
          : {}),
      },
    }
  }

  const sales = await prisma.sale.findMany({
    where,
    include: saleInclude,
    orderBy: { soldAt: 'desc' },
    take: 200,
  })

  return res.json(sales.map((sale) => serializeSale(sale, user.role, user.brandId)))
})

router.get('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const user = req.user!

  const sale = await prisma.sale.findFirst({
    where: {
      id,
      ...tenantFilter(user),
      ...(user.role === 'BRAND' && user.brandId ? filterSalesForBrand(user.brandId) : {}),
    },
    include: saleInclude,
  })

  if (!sale) {
    return res.status(404).json({ error: 'Venta no encontrada' })
  }

  return res.json(serializeSale(sale, user.role, user.brandId))
})

router.post('/', authorize('ADMIN'), async (req, res) => {
  const parsed = createSaleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const { paymentMethod, soldAt, lines } = parsed.data
  const productIds = lines.map((line) => line.productId)
  if (new Set(productIds).size !== productIds.length) {
    return res.status(400).json({ error: 'No se permiten productos duplicados en el mismo ticket' })
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: {
          id: { in: productIds },
          brand: { tenantId: req.user!.tenantId },
        },
        include: { stock: true },
      })

      if (products.length !== productIds.length) {
        throw new Error('PRODUCT_NOT_FOUND')
      }

      const productMap = new Map(products.map((p) => [p.id, p]))
      const lineData: Prisma.SaleLineCreateWithoutSaleInput[] = []

      for (const line of lines) {
        const product = productMap.get(line.productId)!
        const unitPriceNum =
          line.unitPrice !== undefined
            ? line.unitPrice
            : product.price !== null
              ? Number(product.price)
              : NaN

        if (!Number.isFinite(unitPriceNum)) {
          throw new Error(`MISSING_PRICE:${product.name}`)
        }

        const stockQty = product.stock?.quantity ?? 0
        if (stockQty < line.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}:${stockQty}`)
        }

        const subtotal = unitPriceNum * line.quantity
        const discount = line.discount ?? 0
        if (discount > subtotal) {
          throw new Error(`INVALID_DISCOUNT:${product.name}`)
        }
        const commission = line.commission ?? 0
        const total = subtotal - discount

        lineData.push({
          product: { connect: { id: product.id } },
          quantity: line.quantity,
          unitPrice: money(unitPriceNum),
          subtotal: money(subtotal),
          discount: money(discount),
          commission: money(commission),
          total: money(total),
        })
      }

      const created = await tx.sale.create({
        data: {
          paymentMethod,
          soldAt: soldAt ? new Date(soldAt) : undefined,
          tenantId: req.user!.tenantId,
          createdById: req.user!.id,
          lines: { create: lineData },
        },
        include: saleInclude,
      })

      for (const line of lines) {
        await tx.stock.update({
          where: { productId: line.productId },
          data: { quantity: { decrement: line.quantity } },
        })
      }

      return created
    })

    return res.status(201).json(sale)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Uno o más productos no existen' })
    }
    if (message.startsWith('MISSING_PRICE:')) {
      return res.status(400).json({
        error: `El producto "${message.slice('MISSING_PRICE:'.length)}" no tiene precio`,
      })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      const [, name, qty] = message.split(':')
      return res.status(400).json({
        error: `Stock insuficiente para "${name}" (disponible: ${qty})`,
      })
    }
    if (message.startsWith('INVALID_DISCOUNT:')) {
      return res.status(400).json({
        error: `Descuento inválido para "${message.slice('INVALID_DISCOUNT:'.length)}"`,
      })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al registrar la venta' })
  }
})

router.patch('/lines/:lineId', authorize('ADMIN'), async (req, res) => {
  const lineId = getParam(req.params.lineId)
  const parsed = patchLineSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const existing = await prisma.saleLine.findFirst({
    where: {
      id: lineId,
      sale: tenantFilter(req.user!),
    },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Línea de venta no encontrada' })
  }

  const data: Prisma.SaleLineUpdateInput = {}
  if (parsed.data.inSettlement !== undefined) data.inSettlement = parsed.data.inSettlement
  if (parsed.data.paid !== undefined) data.paid = parsed.data.paid

  if (parsed.data.discount !== undefined || parsed.data.commission !== undefined) {
    const discount =
      parsed.data.discount !== undefined ? parsed.data.discount : Number(existing.discount)
    const commission =
      parsed.data.commission !== undefined ? parsed.data.commission : Number(existing.commission)
    const subtotal = Number(existing.subtotal)
    if (discount > subtotal) {
      return res.status(400).json({ error: 'El descuento no puede superar el subtotal' })
    }
    data.discount = money(discount)
    data.commission = money(commission)
    data.total = money(subtotal - discount)
  }

  const line = await prisma.saleLine.update({
    where: { id: lineId },
    data,
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
      sale: {
        select: {
          id: true,
          ticketNumber: true,
          paymentMethod: true,
          soldAt: true,
        },
      },
    },
  })

  return res.json(line)
})

export default router
