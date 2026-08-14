import { Router } from 'express'
import { Prisma, SplitPaymentMethod } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'

const router = Router()

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  discount: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional(),
})

const depositSchema = z.object({
  method: z.nativeEnum(SplitPaymentMethod),
  amount: z.number().positive(),
})

const createLayawaySchema = z.object({
  lines: z.array(lineSchema).min(1),
  ticketComment: z.string().max(500).optional().nullable(),
  applyTax: z.boolean().optional().default(false),
  taxRate: z.number().nonnegative().max(1).optional().default(0.16),
  customerId: z.string().min(1).optional().nullable(),
  deposit: depositSchema.optional(),
})

const layawayInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  payments: true,
  lines: {
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.LayawayInclude

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

async function nextLayawayCode(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  const count = await tx.layaway.count({ where: { tenantId } })
  return `APT-${String(count + 1).padStart(4, '0')}`
}

router.use(authenticate)

router.get('/', authorize('BUSINESS'), async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code.trim() : ''
  const where = {
    ...tenantFilter(req.user!),
    ...(code ? { code: { equals: code, mode: 'insensitive' as const } } : {}),
  }

  const layaways = await prisma.layaway.findMany({
    where,
    include: layawayInclude,
    orderBy: { createdAt: 'desc' },
    take: code ? 5 : 50,
  })
  return res.json(layaways)
})

router.get('/:code', authorize('BUSINESS'), async (req, res) => {
  const code = String(req.params.code || '').trim()
  const layaway = await prisma.layaway.findFirst({
    where: {
      tenantId: req.user!.tenantId,
      code: { equals: code, mode: 'insensitive' },
    },
    include: layawayInclude,
  })
  if (!layaway) {
    return res.status(404).json({ error: 'Apartado no encontrado' })
  }
  return res.json(layaway)
})

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = createLayawaySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const { lines, ticketComment, applyTax, taxRate, customerId, deposit } = parsed.data
  const productIds = lines.map((l) => l.productId)
  if (new Set(productIds).size !== productIds.length) {
    return res.status(400).json({ error: 'No se permiten productos duplicados en el mismo apartado' })
  }

  try {
    const layaway = await prisma.$transaction(async (tx) => {
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

      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId: req.user!.tenantId },
        })
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND')
      }

      const productMap = new Map(products.map((p) => [p.id, p]))
      const lineData: Prisma.LayawayLineCreateWithoutLayawayInput[] = []
      let linesSubtotal = 0

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
        const total = subtotal - discount
        linesSubtotal += total
        lineData.push({
          product: { connect: { id: product.id } },
          quantity: line.quantity,
          unitPrice: money(unitPriceNum),
          subtotal: money(subtotal),
          discount: money(discount),
          total: money(total),
        })
      }

      linesSubtotal = round2(linesSubtotal)
      const taxAmount = applyTax ? round2(linesSubtotal * taxRate) : 0
      const saleTotal = round2(linesSubtotal + taxAmount)
      const depositAmount = deposit ? round2(deposit.amount) : 0
      if (depositAmount > saleTotal) {
        throw new Error('DEPOSIT_TOO_HIGH')
      }
      const balance = round2(saleTotal - depositAmount)
      const code = await nextLayawayCode(tx, req.user!.tenantId)

      const created = await tx.layaway.create({
        data: {
          tenantId: req.user!.tenantId,
          code,
          subtotal: money(linesSubtotal),
          total: money(saleTotal),
          balance: money(balance),
          deposit: money(depositAmount),
          ticketComment: ticketComment?.trim() || null,
          applyTax,
          taxRate: money(taxRate),
          taxAmount: money(taxAmount),
          customerId: customerId || null,
          createdById: req.user!.id,
          status: balance <= 0 ? 'COMPLETED' : 'OPEN',
          lines: { create: lineData },
          ...(deposit
            ? {
                payments: {
                  create: {
                    method: deposit.method,
                    amount: money(depositAmount),
                  },
                },
              }
            : {}),
        },
        include: layawayInclude,
      })

      for (const line of lines) {
        await tx.stock.update({
          where: { productId: line.productId },
          data: { quantity: { decrement: line.quantity } },
        })
      }

      return created
    })

    return res.status(201).json(layaway)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Uno o más productos no existen' })
    }
    if (message === 'CUSTOMER_NOT_FOUND') {
      return res.status(400).json({ error: 'Cliente no encontrado' })
    }
    if (message === 'DEPOSIT_TOO_HIGH') {
      return res.status(400).json({ error: 'El anticipo no puede superar el total' })
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
    return res.status(500).json({ error: 'Error al crear el apartado' })
  }
})

export default router
