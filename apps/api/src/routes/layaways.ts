import { Router } from 'express'
import { PaymentMethod, Prisma, SplitPaymentMethod } from '@prisma/client'
import { z } from 'zod'
import { getParam } from '../lib/params.js'
import { prisma } from '../lib/prisma.js'
import { computeTotals, money, round2 } from '../lib/saleMath.js'
import { allocateTicketNumber } from '../lib/saleTicket.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'
import { requireModule } from '../middleware/plan.js'

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
  /** Los precios ya traen IVA: se desglosa del total en vez de sumarse. */
  pricesIncludeTax: z.boolean().optional().default(false),
  customerId: z.string().min(1).optional().nullable(),
  deposit: depositSchema.optional(),
})

const layawayInclude = {
  customer: { select: { id: true, name: true, phone: true } },
  createdBy: { select: { id: true, name: true } },
  payments: { orderBy: { createdAt: 'asc' } },
  sale: { select: { id: true, ticketNumber: true } },
  lines: {
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.LayawayInclude

async function nextLayawayCode(tx: Prisma.TransactionClient, tenantId: string): Promise<string> {
  const count = await tx.layaway.count({ where: { tenantId } })
  return `APT-${String(count + 1).padStart(4, '0')}`
}

/**
 * Al quedar el saldo en cero el apartado se convierte en venta: se genera el
 * ticket con las mismas líneas y los abonos como pagos. El inventario no se
 * toca: ya se descontó al crear el apartado.
 */
async function settleLayaway(tx: Prisma.TransactionClient, layawayId: string, userId: string) {
  const layaway = await tx.layaway.findUniqueOrThrow({
    where: { id: layawayId },
    include: { lines: true, payments: true, sale: { select: { id: true } } },
  })
  if (layaway.sale) return

  const byMethod = new Map<SplitPaymentMethod, number>()
  for (const p of layaway.payments) {
    byMethod.set(p.method, round2((byMethod.get(p.method) ?? 0) + Number(p.amount)))
  }
  const paymentRows = [...byMethod.entries()].filter(([, amount]) => amount > 0)
  const paymentMethod: PaymentMethod =
    paymentRows.length > 1
      ? PaymentMethod.MIXTO
      : paymentRows[0]?.[0] === 'TARJETA'
        ? PaymentMethod.TARJETA
        : paymentRows[0]?.[0] === 'TRANSFERENCIA'
          ? PaymentMethod.TRANSFERENCIA
          : PaymentMethod.EFECTIVO

  const ticketNumber = await allocateTicketNumber(tx, layaway.tenantId)
  const comment = [`Apartado ${layaway.code}`, layaway.ticketComment].filter(Boolean).join(' · ')

  await tx.sale.create({
    data: {
      tenantId: layaway.tenantId,
      ticketNumber,
      paymentMethod,
      createdById: userId,
      customerId: layaway.customerId,
      layawayId: layaway.id,
      ticketComment: comment.slice(0, 500),
      applyTax: layaway.applyTax,
      taxRate: layaway.taxRate,
      taxAmount: layaway.taxAmount,
      subtotal: layaway.subtotal,
      total: layaway.total,
      lines: {
        create: layaway.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: line.subtotal,
          discount: line.discount,
          total: line.total,
        })),
      },
      payments: {
        create: paymentRows.map(([method, amount]) => ({ method, amount: money(amount) })),
      },
    },
  })
}

router.use(authenticate, requireModule('layaways', 'caja'))

/** Filtros opcionales: `status` (OPEN | COMPLETED | CANCELLED), `code` exacto y `q` (código o cliente). */
router.get('/', authorize('BUSINESS'), async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code.trim() : ''
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : ''
  const status = typeof req.query.status === 'string' ? req.query.status : ''
  const where: Prisma.LayawayWhereInput = {
    ...tenantFilter(req.user!),
    ...(code ? { code: { equals: code, mode: 'insensitive' as const } } : {}),
    ...(status === 'OPEN' || status === 'COMPLETED' || status === 'CANCELLED' ? { status } : {}),
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: 'insensitive' as const } },
            { customer: { name: { contains: q, mode: 'insensitive' as const } } },
            { customer: { phone: { contains: q } } },
          ],
        }
      : {}),
  }

  const layaways = await prisma.layaway.findMany({
    where,
    include: layawayInclude,
    orderBy: { createdAt: 'desc' },
    take: code ? 5 : 100,
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

  const { lines, ticketComment, applyTax, taxRate, pricesIncludeTax, customerId, deposit } = parsed.data
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
        const total = round2(subtotal - discount)
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

      const totals = computeTotals(linesSubtotal, { applyTax, taxRate, pricesIncludeTax })
      const saleTotal = totals.due
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
          subtotal: money(totals.subtotal),
          total: money(saleTotal),
          balance: money(balance),
          deposit: money(depositAmount),
          ticketComment: ticketComment?.trim() || null,
          applyTax,
          taxRate: money(taxRate),
          taxAmount: money(totals.taxAmount),
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
      })

      for (const line of lines) {
        // Descuento condicionado a que siga habiendo existencias (igual que en ventas).
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

      // Anticipo que cubre todo: queda liquidado y con su ticket de venta.
      if (balance <= 0) await settleLayaway(tx, created.id, req.user!.id)

      return tx.layaway.findUniqueOrThrow({ where: { id: created.id }, include: layawayInclude })
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
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Dos apartados creados al mismo tiempo tomaron el mismo código.
      return res.status(409).json({ error: 'No se pudo asignar el código del apartado. Intenta de nuevo' })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al crear el apartado' })
  }
})

/** Registra un abono. Si cubre el saldo, el apartado se liquida y genera su venta. */
router.post('/:id/payments', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = depositSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Indica la forma de pago y un monto mayor a cero' })
  }
  const { tenantId } = tenantFilter(req.user!)
  const amount = round2(parsed.data.amount)

  try {
    const layaway = await prisma.$transaction(async (tx) => {
      const current = await tx.layaway.findFirst({ where: { id, tenantId } })
      if (!current) throw new Error('LAYAWAY_NOT_FOUND')
      if (current.status !== 'OPEN') throw new Error('LAYAWAY_NOT_OPEN')
      const balance = Number(current.balance)
      if (amount > balance) throw new Error(`PAYMENT_TOO_HIGH:${balance.toFixed(2)}`)

      // Condicionado al saldo: dos abonos simultáneos no pueden pagar de más.
      const updated = await tx.layaway.updateMany({
        where: { id, tenantId, status: 'OPEN', balance: { gte: money(amount) } },
        data: { balance: { decrement: money(amount) } },
      })
      if (updated.count === 0) throw new Error('LAYAWAY_CHANGED')

      await tx.layawayPayment.create({
        data: { layawayId: id, method: parsed.data.method, amount: money(amount) },
      })

      if (round2(balance - amount) <= 0) {
        await tx.layaway.update({ where: { id }, data: { status: 'COMPLETED' } })
        await settleLayaway(tx, id, req.user!.id)
      }

      return tx.layaway.findUniqueOrThrow({ where: { id }, include: layawayInclude })
    })
    return res.status(201).json(layaway)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'LAYAWAY_NOT_FOUND') {
      return res.status(404).json({ error: 'Apartado no encontrado' })
    }
    if (message === 'LAYAWAY_NOT_OPEN') {
      return res.status(409).json({ error: 'Este apartado ya está liquidado o cancelado' })
    }
    if (message === 'LAYAWAY_CHANGED') {
      return res.status(409).json({ error: 'El saldo del apartado cambió. Actualiza e intenta de nuevo' })
    }
    if (message.startsWith('PAYMENT_TOO_HIGH:')) {
      return res.status(400).json({
        error: `El abono no puede superar el saldo pendiente ($${message.slice('PAYMENT_TOO_HIGH:'.length)})`,
      })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al registrar el abono' })
  }
})

/** Cancela un apartado abierto y regresa sus piezas al inventario. */
router.post('/:id/cancel', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const { tenantId } = tenantFilter(req.user!)

  try {
    const layaway = await prisma.$transaction(async (tx) => {
      // Condicionado al estado: una cancelación doble no regresa el stock dos veces.
      const updated = await tx.layaway.updateMany({
        where: { id, tenantId, status: 'OPEN' },
        data: { status: 'CANCELLED' },
      })
      if (updated.count === 0) {
        const exists = await tx.layaway.findFirst({ where: { id, tenantId }, select: { id: true } })
        throw new Error(exists ? 'LAYAWAY_NOT_OPEN' : 'LAYAWAY_NOT_FOUND')
      }

      const lines = await tx.layawayLine.findMany({ where: { layawayId: id } })
      for (const line of lines) {
        await tx.stock.upsert({
          where: { productId: line.productId },
          update: { quantity: { increment: line.quantity } },
          create: { productId: line.productId, quantity: line.quantity },
        })
      }

      return tx.layaway.findUniqueOrThrow({ where: { id }, include: layawayInclude })
    })

    const paid = round2(layaway.payments.reduce((acc, p) => acc + Number(p.amount), 0))
    // Los abonos no se devuelven solos: el negocio decide si los reembolsa.
    return res.json({ ...layaway, paidToRefund: paid })
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'LAYAWAY_NOT_FOUND') {
      return res.status(404).json({ error: 'Apartado no encontrado' })
    }
    if (message === 'LAYAWAY_NOT_OPEN') {
      return res.status(409).json({ error: 'Solo se pueden cancelar apartados abiertos' })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al cancelar el apartado' })
  }
})

export default router
