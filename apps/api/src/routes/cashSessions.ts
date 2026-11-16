import { Router } from 'express'
import { CashMovementType, Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { money, round2 } from '../lib/saleMath.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'
import { requireModule } from '../middleware/plan.js'

/**
 * Corte de caja por turno: se abre con un fondo inicial, se registran entradas
 * y retiros de efectivo, y al cerrar se compara lo contado contra lo esperado.
 * Un negocio tiene como máximo un turno abierto a la vez. Vender no exige
 * tener turno abierto.
 */
const router = Router()

const amount = z.number().nonnegative().max(9_999_999)

const openSchema = z.object({
  openingFloat: amount.optional().default(0),
  note: z.string().trim().max(500).optional().nullable(),
})

const movementSchema = z.object({
  type: z.nativeEnum(CashMovementType),
  amount: z.number().positive().max(9_999_999),
  note: z.string().trim().max(300).optional().nullable(),
})

const closeSchema = z.object({
  countedCash: amount,
  note: z.string().trim().max(500).optional().nullable(),
})

type MethodTotals = { efectivo: number; tarjeta: number; transferencia: number }

export type CashSummary = {
  salesCount: number
  salesTotal: number
  /** Cobrado en ventas del turno, por forma de pago. */
  sales: MethodTotals
  /** Abonos de apartados recibidos en el turno, por forma de pago. */
  layawayPayments: MethodTotals
  giftCardTotal: number
  cashIn: number
  cashOut: number
  openingFloat: number
  expectedCash: number
}

function emptyTotals(): MethodTotals {
  return { efectivo: 0, tarjeta: 0, transferencia: 0 }
}

function addTo(totals: MethodTotals, method: string, value: number) {
  if (method === 'TARJETA') totals.tarjeta = round2(totals.tarjeta + value)
  else if (method === 'TRANSFERENCIA') totals.transferencia = round2(totals.transferencia + value)
  else totals.efectivo = round2(totals.efectivo + value)
}

async function buildSummary(
  db: Prisma.TransactionClient | typeof prisma,
  session: { id: string; tenantId: string; openedAt: Date; openingFloat: Prisma.Decimal },
  until: Date,
): Promise<CashSummary> {
  const window = { gte: session.openedAt, lte: until }
  const [sales, layawayPayments, movements] = await Promise.all([
    // Las ventas que nacen de liquidar un apartado no cuentan aquí: su dinero
    // entró como abonos (posiblemente en otros turnos).
    db.sale.findMany({
      where: { tenantId: session.tenantId, soldAt: window, layawayId: null },
      select: { total: true, giftCardAmount: true, payments: { select: { method: true, amount: true } } },
    }),
    db.layawayPayment.findMany({
      where: { createdAt: window, layaway: { tenantId: session.tenantId } },
      select: { method: true, amount: true },
    }),
    db.cashMovement.findMany({
      where: { cashSessionId: session.id },
      select: { type: true, amount: true },
    }),
  ])

  const salesByMethod = emptyTotals()
  let salesTotal = 0
  let giftCardTotal = 0
  for (const sale of sales) {
    salesTotal += Number(sale.total)
    giftCardTotal += Number(sale.giftCardAmount)
    for (const p of sale.payments) addTo(salesByMethod, p.method, Number(p.amount))
  }

  const layawayByMethod = emptyTotals()
  for (const p of layawayPayments) addTo(layawayByMethod, p.method, Number(p.amount))

  let cashIn = 0
  let cashOut = 0
  for (const m of movements) {
    if (m.type === 'IN') cashIn += Number(m.amount)
    else cashOut += Number(m.amount)
  }

  const openingFloat = Number(session.openingFloat)
  return {
    salesCount: sales.length,
    salesTotal: round2(salesTotal),
    sales: salesByMethod,
    layawayPayments: layawayByMethod,
    giftCardTotal: round2(giftCardTotal),
    cashIn: round2(cashIn),
    cashOut: round2(cashOut),
    openingFloat,
    expectedCash: round2(
      openingFloat + salesByMethod.efectivo + layawayByMethod.efectivo + cashIn - cashOut,
    ),
  }
}

const movementsInclude = { movements: { orderBy: { createdAt: 'asc' } } } satisfies Prisma.CashSessionInclude

router.use(authenticate, authorize('BUSINESS'), requireModule('caja'))

/** Turno abierto (o `null`) con su resumen al momento. */
router.get('/current', async (req, res) => {
  const { tenantId } = tenantFilter(req.user!)
  const session = await prisma.cashSession.findFirst({
    where: { tenantId, status: 'OPEN' },
    orderBy: { openedAt: 'desc' },
    include: movementsInclude,
  })
  if (!session) return res.json({ session: null, summary: null })
  const summary = await buildSummary(prisma, session, new Date())
  return res.json({ session, summary })
})

/** Turnos cerrados, del más reciente al más antiguo. */
router.get('/', async (req, res) => {
  const { tenantId } = tenantFilter(req.user!)
  const sessions = await prisma.cashSession.findMany({
    where: { tenantId, status: 'CLOSED' },
    orderBy: { closedAt: 'desc' },
    take: 30,
    include: movementsInclude,
  })
  return res.json(sessions)
})

router.post('/open', async (req, res) => {
  const parsed = openSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'El fondo inicial debe ser un monto válido' })
  }
  const { tenantId } = tenantFilter(req.user!)

  const existing = await prisma.cashSession.findFirst({ where: { tenantId, status: 'OPEN' } })
  if (existing) {
    return res.status(409).json({ error: 'Ya hay un turno de caja abierto. Ciérralo antes de abrir otro.' })
  }

  const session = await prisma.cashSession.create({
    data: {
      tenantId,
      openingFloat: money(parsed.data.openingFloat),
      note: parsed.data.note || null,
      openedById: req.user!.id,
      openedByName: req.user!.name,
    },
    include: movementsInclude,
  })
  const summary = await buildSummary(prisma, session, new Date())
  return res.status(201).json({ session, summary })
})

router.post('/current/movements', async (req, res) => {
  const parsed = movementSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Indica si es entrada o retiro y un monto mayor a cero' })
  }
  const { tenantId } = tenantFilter(req.user!)
  const open = await prisma.cashSession.findFirst({ where: { tenantId, status: 'OPEN' } })
  if (!open) return res.status(409).json({ error: 'No hay un turno de caja abierto' })

  await prisma.cashMovement.create({
    data: {
      cashSessionId: open.id,
      type: parsed.data.type,
      amount: money(parsed.data.amount),
      note: parsed.data.note || null,
      createdById: req.user!.id,
      createdByName: req.user!.name,
    },
  })

  const session = await prisma.cashSession.findUniqueOrThrow({
    where: { id: open.id },
    include: movementsInclude,
  })
  const summary = await buildSummary(prisma, session, new Date())
  return res.status(201).json({ session, summary })
})

router.post('/current/close', async (req, res) => {
  const parsed = closeSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Captura el efectivo contado en caja' })
  }
  const { tenantId } = tenantFilter(req.user!)

  const closed = await prisma.$transaction(async (tx) => {
    const open = await tx.cashSession.findFirst({ where: { tenantId, status: 'OPEN' } })
    if (!open) return null

    const closedAt = new Date()
    const summary = await buildSummary(tx, open, closedAt)
    const counted = round2(parsed.data.countedCash)

    // Condicionado al estado: si dos personas cierran a la vez, solo una lo logra.
    const updated = await tx.cashSession.updateMany({
      where: { id: open.id, status: 'OPEN' },
      data: {
        status: 'CLOSED',
        closedAt,
        closedById: req.user!.id,
        closedByName: req.user!.name,
        expectedCash: money(summary.expectedCash),
        countedCash: money(counted),
        difference: money(round2(counted - summary.expectedCash)),
        summary: summary as unknown as Prisma.InputJsonValue,
        ...(parsed.data.note ? { note: parsed.data.note } : {}),
      },
    })
    if (updated.count === 0) return null

    return tx.cashSession.findUniqueOrThrow({ where: { id: open.id }, include: movementsInclude })
  })

  if (!closed) return res.status(409).json({ error: 'No hay un turno de caja abierto' })
  return res.json(closed)
})

export default router
