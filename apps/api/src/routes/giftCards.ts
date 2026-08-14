import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const createGiftCardSchema = z.object({
  code: z.string().min(1).max(64),
  balance: z.number().nonnegative(),
  active: z.boolean().optional().default(true),
})

const previewSchema = z.object({
  code: z.string().min(1),
  amountDue: z.number().nonnegative().optional(),
})

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2))
}

router.use(authenticate)

/** Preview / validar tarjeta de regalo sin descontar. */
router.post('/preview', authorize('BUSINESS'), async (req, res) => {
  const parsed = previewSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const code = parsed.data.code.trim()
  const giftCard = await prisma.giftCard.findFirst({
    where: { tenantId: req.user!.tenantId, code, active: true },
  })
  if (!giftCard) {
    return res.status(404).json({ error: 'Tarjeta de regalo no encontrada o inactiva' })
  }

  const balance = Number(giftCard.balance)
  const amountDue = parsed.data.amountDue ?? balance
  const applicable = Math.round(Math.min(balance, amountDue) * 100) / 100

  return res.json({
    id: giftCard.id,
    code: giftCard.code,
    balance,
    applicable,
  })
})

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = createGiftCardSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const code = parsed.data.code.trim().toUpperCase()
  try {
    const giftCard = await prisma.giftCard.create({
      data: {
        tenantId: req.user!.tenantId,
        code,
        balance: money(parsed.data.balance),
        active: parsed.data.active,
      },
    })
    return res.status(201).json(giftCard)
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe una tarjeta con ese código' })
    }
    throw err
  }
})

router.get('/', authorize('BUSINESS'), async (req, res) => {
  const cards = await prisma.giftCard.findMany({
    where: { tenantId: req.user!.tenantId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return res.json(cards)
})

export default router
