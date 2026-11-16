import { Router } from 'express'
import { PaymentMethod, Prisma, SplitPaymentMethod } from '@prisma/client'
import { z } from 'zod'
import { allocateTicketNumber } from '../lib/saleTicket.js'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { computeTotals, money, parseDateParam, parsePage, round2 } from '../lib/saleMath.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'
import { requireModule } from '../middleware/plan.js'

const router = Router()

const saleLineInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  discount: z.number().nonnegative().optional().default(0),
  commission: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional(),
})

const paymentSplitSchema = z.object({
  method: z.nativeEnum(SplitPaymentMethod),
  amount: z.number().positive(),
})

const createSaleSchema = z.object({
  paymentMethod: z.nativeEnum(PaymentMethod),
  soldAt: z.string().datetime().optional(),
  lines: z.array(saleLineInputSchema).min(1),
  ticketComment: z.string().max(500).optional().nullable(),
  applyTax: z.boolean().optional().default(false),
  taxRate: z.number().nonnegative().max(1).optional().default(0.16),
  /** Los precios ya traen IVA: se desglosa del total en vez de sumarse. */
  pricesIncludeTax: z.boolean().optional().default(false),
  attendedById: z.string().min(1).optional().nullable(),
  /** Usuario BUSINESS que atiende (p. ej. el dueño sin empleados registrados). */
  attendedByUserId: z.string().min(1).optional().nullable(),
  customerId: z.string().min(1).optional().nullable(),
  giftCardCode: z.string().min(1).optional().nullable(),
  payments: z.array(paymentSplitSchema).optional(),
})

const cancelSaleSchema = z.object({
  reason: z.string().trim().max(500).optional().nullable(),
})

const patchLineSchema = z.object({
  inSettlement: z.boolean().optional(),
  paid: z.boolean().optional(),
  discount: z.number().nonnegative().optional(),
  commission: z.number().nonnegative().optional(),
})

const saleInclude = {
  createdBy: { select: { id: true, name: true } },
  attendedBy: { select: { id: true, name: true } },
  attendedByUser: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, phone: true } },
  payments: true,
  lines: {
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.SaleInclude

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
    // Una marca solo ve sus líneas; los datos del cliente final son del negocio.
    ...(role === 'BRAND' ? { customer: null } : {}),
    lines: filterLinesForBrand(sale.lines, brandId, role),
  }
}

function toSplitMethod(method: PaymentMethod): SplitPaymentMethod {
  if (method === 'TARJETA') return SplitPaymentMethod.TARJETA
  if (method === 'TRANSFERENCIA') return SplitPaymentMethod.TRANSFERENCIA
  return SplitPaymentMethod.EFECTIVO
}

router.use(authenticate, requireModule('sales', 'caja'))

/**
 * Filtros opcionales: `from`, `to` (fechas ISO), `q` (número de ticket, cliente,
 * producto o SKU) y `customerId`. Sin `page` responde un arreglo con las 200
 * más recientes; con `page` responde `{ items, total, page, pageSize }`.
 */
router.get('/', async (req, res) => {
  const user = req.user!
  const where: Prisma.SaleWhereInput = tenantFilter(user)
  const and: Prisma.SaleWhereInput[] = []

  const from = parseDateParam(req.query.from)
  const to = parseDateParam(req.query.to)
  if (from || to) {
    where.soldAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
  }
  if (typeof req.query.customerId === 'string' && req.query.customerId && user.role !== 'BRAND') {
    where.customerId = req.query.customerId
  }
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  if (q) {
    const ticket = /^#?\d{1,9}$/.test(q) ? Number(q.replace('#', '')) : null
    const brandScope = user.role === 'BRAND' && user.brandId ? { brandId: user.brandId } : {}
    and.push({
      OR: [
        ...(ticket !== null ? [{ ticketNumber: ticket }] : []),
        ...(user.role !== 'BRAND'
          ? [{ customer: { name: { contains: q, mode: 'insensitive' as const } } }]
          : []),
        {
          lines: {
            some: {
              product: {
                ...brandScope,
                OR: [
                  { name: { contains: q, mode: 'insensitive' as const } },
                  { sku: { contains: q, mode: 'insensitive' as const } },
                ],
              },
            },
          },
        },
      ],
    })
  }
  if (and.length) where.AND = and

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

  if (req.query.page !== undefined) {
    const { page, pageSize, skip } = parsePage(req.query)
    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: saleInclude,
        orderBy: { soldAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.sale.count({ where }),
    ])
    return res.json({
      items: items.map((sale) => serializeSale(sale, user.role, user.brandId)),
      total,
      page,
      pageSize,
    })
  }

  const sales = await prisma.sale.findMany({
    where,
    include: saleInclude,
    orderBy: { soldAt: 'desc' },
    take: 200,
  })

  return res.json(sales.map((sale) => serializeSale(sale, user.role, user.brandId)))
})

/** Ventas canceladas del negocio (la venta ya no existe; se conserva su copia). */
router.get('/cancelled', authorize('BUSINESS'), async (req, res) => {
  const { tenantId } = tenantFilter(req.user!)
  const from = parseDateParam(req.query.from)
  const to = parseDateParam(req.query.to)
  const { page, pageSize, skip } = parsePage(req.query)
  const where: Prisma.CancelledSaleWhereInput = {
    tenantId,
    ...(from || to
      ? { cancelledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.cancelledSale.findMany({ where, orderBy: { cancelledAt: 'desc' }, skip, take: pageSize }),
    prisma.cancelledSale.count({ where }),
  ])
  return res.json({ items, total, page, pageSize })
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

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = createSaleSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const {
    paymentMethod,
    soldAt,
    lines,
    ticketComment,
    applyTax,
    taxRate,
    pricesIncludeTax,
    attendedById,
    attendedByUserId,
    customerId,
    giftCardCode,
    payments,
  } = parsed.data
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

      if (attendedById && attendedByUserId) {
        throw new Error('ATTENDANT_CONFLICT')
      }

      if (attendedById) {
        const attendant = await tx.employee.findFirst({
          where: { id: attendedById, tenantId: req.user!.tenantId!, active: true },
        })
        if (!attendant) throw new Error('ATTENDANT_NOT_FOUND')
      }

      if (attendedByUserId) {
        if (attendedByUserId !== req.user!.id) {
          throw new Error('ATTENDANT_USER_INVALID')
        }
        const attendantUser = await tx.user.findFirst({
          where: {
            id: attendedByUserId,
            tenantId: req.user!.tenantId!,
            role: 'BUSINESS',
          },
        })
        if (!attendantUser) throw new Error('ATTENDANT_USER_INVALID')
      }

      if (customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: customerId, tenantId: req.user!.tenantId },
        })
        if (!customer) throw new Error('CUSTOMER_NOT_FOUND')
      }

      const productMap = new Map(products.map((p) => [p.id, p]))
      const lineData: Prisma.SaleLineCreateWithoutSaleInput[] = []
      let linesSubtotal = 0

      for (const line of lines) {
        const product = productMap.get(line.productId)!
        // Se redondea a centavos antes de calcular para que las líneas guardadas
        // sumen exactamente el subtotal de la venta.
        const unitPriceNum = round2(
          line.unitPrice !== undefined
            ? line.unitPrice
            : product.price !== null
              ? Number(product.price)
              : NaN,
        )

        if (!Number.isFinite(unitPriceNum)) {
          throw new Error(`MISSING_PRICE:${product.name}`)
        }

        const stockQty = product.stock?.quantity ?? 0
        if (stockQty < line.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}:${stockQty}`)
        }

        const subtotal = round2(unitPriceNum * line.quantity)
        const discount = round2(line.discount ?? 0)
        if (discount > subtotal) {
          throw new Error(`INVALID_DISCOUNT:${product.name}`)
        }
        const commission = round2(line.commission ?? 0)
        const total = round2(subtotal - discount)
        linesSubtotal += total

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

      const totals = computeTotals(linesSubtotal, { applyTax, taxRate, pricesIncludeTax })
      linesSubtotal = totals.subtotal
      const taxAmount = totals.taxAmount
      const dueBeforeGift = totals.due
      let giftCardAmount = 0

      if (giftCardCode?.trim()) {
        const code = giftCardCode.trim()
        const giftCard = await tx.giftCard.findFirst({
          where: {
            tenantId: req.user!.tenantId,
            // Los códigos se guardan en mayúsculas; al canjear no se distingue.
            code: { equals: code, mode: 'insensitive' },
            active: true,
          },
        })
        if (!giftCard) throw new Error('GIFT_CARD_NOT_FOUND')
        const balance = Number(giftCard.balance)
        if (balance <= 0) throw new Error('GIFT_CARD_EMPTY')
        giftCardAmount = round2(Math.min(balance, dueBeforeGift))
        if (giftCardAmount > 0) {
          // Descuento condicionado al saldo: dos cajas usando la misma tarjeta
          // a la vez no pueden gastar el mismo saldo dos veces.
          const spent = await tx.giftCard.updateMany({
            where: { id: giftCard.id, active: true, balance: { gte: money(giftCardAmount) } },
            data: { balance: { decrement: money(giftCardAmount) } },
          })
          if (spent.count === 0) throw new Error('GIFT_CARD_CHANGED')
        }
      }

      const saleTotal = round2(Math.max(0, dueBeforeGift - giftCardAmount))

      let paymentRows: Array<{ method: SplitPaymentMethod; amount: number }> = []
      if (paymentMethod === PaymentMethod.MIXTO) {
        if (!payments || payments.length < 2) {
          throw new Error('MIXTO_REQUIRES_PAYMENTS')
        }
        const sum = round2(payments.reduce((acc, p) => acc + p.amount, 0))
        if (Math.abs(sum - saleTotal) > 0.01) {
          throw new Error(`MIXTO_SUM_MISMATCH:${sum}:${saleTotal}`)
        }
        paymentRows = payments.map((p) => ({ method: p.method, amount: round2(p.amount) }))
      } else if (saleTotal > 0) {
        paymentRows = [{ method: toSplitMethod(paymentMethod), amount: saleTotal }]
      }

      const ticketNumber = await allocateTicketNumber(tx, req.user!.tenantId!)

      const created = await tx.sale.create({
        data: {
          ticketNumber,
          paymentMethod,
          soldAt: soldAt ? new Date(soldAt) : undefined,
          tenantId: req.user!.tenantId!,
          createdById: req.user!.id,
          attendedById: attendedById || null,
          attendedByUserId: attendedByUserId || null,
          customerId: customerId || null,
          ticketComment: ticketComment?.trim() || null,
          applyTax,
          taxRate: money(taxRate),
          taxAmount: money(taxAmount),
          subtotal: money(linesSubtotal),
          total: money(saleTotal),
          giftCardAmount: money(giftCardAmount),
          lines: { create: lineData },
          payments: {
            create: paymentRows.map((p) => ({
              method: p.method,
              amount: money(p.amount),
            })),
          },
        },
        include: saleInclude,
      })

      for (const line of lines) {
        // Descuento condicionado a que siga habiendo existencias: evita vender
        // dos veces la última pieza cuando dos cajas cobran al mismo tiempo.
        const updated = await tx.stock.updateMany({
          where: { productId: line.productId, quantity: { gte: line.quantity } },
          data: { quantity: { decrement: line.quantity } },
        })
        if (updated.count === 0) {
          const current = await tx.stock.findUnique({ where: { productId: line.productId } })
          const name = productMap.get(line.productId)?.name ?? ''
          throw new Error(`INSUFFICIENT_STOCK:${name}:${current?.quantity ?? 0}`)
        }
      }

      return created
    })

    return res.status(201).json(sale)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'PRODUCT_NOT_FOUND') {
      return res.status(404).json({ error: 'Uno o más productos no existen' })
    }
    if (message === 'ATTENDANT_NOT_FOUND') {
      return res.status(400).json({ error: 'El empleado que atiende no existe' })
    }
    if (message === 'ATTENDANT_USER_INVALID') {
      return res.status(400).json({ error: 'El usuario que atiende no es válido' })
    }
    if (message === 'ATTENDANT_CONFLICT') {
      return res.status(400).json({ error: 'Indica empleado o usuario, no ambos' })
    }
    if (message === 'CUSTOMER_NOT_FOUND') {
      return res.status(400).json({ error: 'Cliente no encontrado' })
    }
    if (message === 'GIFT_CARD_NOT_FOUND') {
      return res.status(400).json({ error: 'Tarjeta de regalo no encontrada o inactiva' })
    }
    if (message === 'GIFT_CARD_CHANGED') {
      return res.status(409).json({
        error: 'El saldo de la tarjeta de regalo cambió. Vuelve a aplicarla e intenta de nuevo',
      })
    }
    if (message === 'GIFT_CARD_EMPTY') {
      return res.status(400).json({ error: 'La tarjeta de regalo no tiene saldo' })
    }
    if (message === 'MIXTO_REQUIRES_PAYMENTS') {
      return res.status(400).json({ error: 'Pago mixto requiere al menos dos montos' })
    }
    if (message.startsWith('MIXTO_SUM_MISMATCH:')) {
      const [, sum, total] = message.split(':')
      return res.status(400).json({
        error: `Los montos mixtos ($${sum}) no coinciden con el total ($${total})`,
      })
    }
    if (message.startsWith('MISSING_PRICE:')) {
      return res.status(400).json({
        error: `El producto "${message.slice('MISSING_PRICE:'.length)}" no tiene precio`,
      })
    }
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      // El nombre del producto puede traer ":"; la cantidad es lo último.
      const rest = message.slice('INSUFFICIENT_STOCK:'.length)
      const cut = rest.lastIndexOf(':')
      const name = rest.slice(0, cut)
      const qty = rest.slice(cut + 1)
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

/**
 * Cancela una venta completa: regresa las piezas al inventario, guarda una
 * copia en `CancelledSale` y elimina la venta para que ningún reporte la sume.
 */
router.post('/:id/cancel', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = cancelSaleSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { tenantId } = tenantFilter(req.user!)

  try {
    const cancelled = await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id, tenantId }, include: saleInclude })
      if (!sale) throw new Error('SALE_NOT_FOUND')
      if (sale.layawayId) throw new Error('SALE_FROM_LAYAWAY')
      if (sale.lines.some((line) => line.inSettlement || line.paid)) {
        throw new Error('SALE_IN_SETTLEMENT')
      }

      for (const line of sale.lines) {
        await tx.stock.upsert({
          where: { productId: line.productId },
          update: { quantity: { increment: line.quantity } },
          create: { productId: line.productId, quantity: line.quantity },
        })
      }

      const record = await tx.cancelledSale.create({
        data: {
          tenantId,
          ticketNumber: sale.ticketNumber,
          soldAt: sale.soldAt,
          total: sale.total,
          customerId: sale.customerId,
          customerName: sale.customer?.name ?? null,
          reason: parsed.data.reason || null,
          // Copia plana de la venta (los Decimal quedan como texto).
          snapshot: JSON.parse(JSON.stringify(sale)) as Prisma.InputJsonValue,
          cancelledById: req.user!.id,
          cancelledByName: req.user!.name,
        },
      })

      // Si dos personas cancelan a la vez, solo una encuentra la venta.
      const removed = await tx.sale.deleteMany({ where: { id, tenantId } })
      if (removed.count === 0) throw new Error('SALE_NOT_FOUND')

      return { record, giftCardAmount: Number(sale.giftCardAmount) }
    })

    return res.json({
      ...cancelled.record,
      // La venta no guarda qué tarjeta de regalo se usó: el saldo no se puede reponer solo.
      giftCardAmountToRestore: cancelled.giftCardAmount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'SALE_NOT_FOUND') {
      return res.status(404).json({ error: 'Venta no encontrada (puede que ya esté cancelada)' })
    }
    if (message === 'SALE_IN_SETTLEMENT') {
      return res.status(409).json({
        error:
          'Esta venta ya entró en un corte o ya se pagó a la marca. Quita esas marcas en la venta antes de cancelarla.',
      })
    }
    if (message === 'SALE_FROM_LAYAWAY') {
      return res.status(409).json({
        error: 'Esta venta viene de un apartado liquidado y no se puede cancelar desde aquí.',
      })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al cancelar la venta' })
  }
})

router.patch('/lines/:lineId', authorize('BUSINESS'), async (req, res) => {
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
