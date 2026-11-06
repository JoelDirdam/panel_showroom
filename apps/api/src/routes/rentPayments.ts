import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'
import { ensureRentPaymentsForMonth } from '../services/cutoff.service.js'
import { startOfDay } from '../utils/cutoffDays.js'

const router = Router()

router.use(authenticate)
router.use(authorize('BUSINESS'))

const patchSchema = z.object({
  status: z.enum(['PENDING', 'PAID']).optional(),
  note: z.string().max(500).optional().nullable(),
})

router.get('/', async (req, res) => {
  const tenantId = req.user!.tenantId!
  const pending = req.query.pending === 'true'
  const year = req.query.year ? Number(req.query.year) : undefined
  const month = req.query.month ? Number(req.query.month) : undefined

  const payments = await prisma.brandRentPayment.findMany({
    where: {
      tenantId,
      ...(pending ? { status: 'PENDING' } : {}),
      ...(year ? { year } : {}),
      ...(month ? { month } : {}),
    },
    include: { brand: { select: { id: true, name: true } } },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  })

  return res.json(payments)
})

router.post('/generate', async (req, res) => {
  const tenantId = req.user!.tenantId!
  await ensureRentPaymentsForMonth(tenantId)
  const now = new Date()
  const payments = await prisma.brandRentPayment.findMany({
    where: { tenantId, year: now.getFullYear(), month: now.getMonth() + 1 },
    include: { brand: { select: { id: true, name: true } } },
  })
  return res.json({ generated: payments.length, payments })
})

router.get('/calendar', async (req, res) => {
  const tenantId = req.user!.tenantId!
  const now = new Date()
  const year = req.query.year ? Number(req.query.year) : now.getFullYear()
  const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1

  await ensureRentPaymentsForMonth(tenantId, new Date(year, month - 1, 1))

  const payments = await prisma.brandRentPayment.findMany({
    where: { tenantId, year, month },
    include: { brand: { select: { id: true, name: true } } },
  })

  return res.json(
    payments.map((p) => ({
      id: p.id,
      brandId: p.brandId,
      brandName: p.brand.name,
      dueDate: p.dueDate.toISOString(),
      amount: Number(p.amount),
      status: p.status,
      year: p.year,
      month: p.month,
    })),
  )
})

router.patch('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const existing = await prisma.brandRentPayment.findFirst({
    where: { id, ...tenantFilter(req.user!) },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Pago de renta no encontrado' })
  }

  const data: {
    status?: 'PENDING' | 'PAID'
    paidAt?: Date | null
    paidById?: string | null
    note?: string | null
  } = {}

  if (parsed.data.note !== undefined) data.note = parsed.data.note?.trim() || null

  if (parsed.data.status === 'PAID') {
    data.status = 'PAID'
    data.paidAt = new Date()
    data.paidById = req.user!.id
  } else if (parsed.data.status === 'PENDING') {
    data.status = 'PENDING'
    data.paidAt = null
    data.paidById = null
  }

  const updated = await prisma.brandRentPayment.update({
    where: { id },
    data,
    include: { brand: { select: { id: true, name: true } } },
  })

  return res.json(updated)
})

export default router
