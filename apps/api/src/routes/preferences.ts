import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const preferencesSchema = z.object({
  primaryTerminalCommission: z.number().min(0).max(100).nullable().optional(),
  secondaryTerminalCommission: z.number().min(0).max(100).nullable().optional(),
  transferCommission: z.number().min(0).max(100).nullable().optional(),
  layawayDueDays: z.number().int().min(1).max(365).optional(),
  labelWidthMm: z.number().int().positive().nullable().optional(),
  labelHeightMm: z.number().int().positive().nullable().optional(),
  flexibleInventory: z.boolean().optional(),
  printTickets: z.boolean().optional(),
  ticketFixedComment: z.string().max(1000).nullable().optional(),
  chargeIva: z.boolean().optional(),
  usdEnabled: z.boolean().optional(),
  usdRateMode: z.enum(['FIXED', 'AUTOMATIC']).nullable().optional(),
  usdFixedRate: z.number().positive().nullable().optional(),
  cutoffType: z.enum(['WEEKLY', 'MONTHLY_FIXED']).optional(),
  cutoffWeekday: z.number().int().min(1).max(7).nullable().optional(),
  cutoffDaySlots: z.array(z.number().int().min(1).max(31)).optional(),
})

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  const preferences = await prisma.businessPreferences.upsert({
    where: { tenantId: req.user!.tenantId },
    update: {},
    create: { tenantId: req.user!.tenantId, cutoffDaySlots: [] },
  })
  return res.json(preferences)
})

router.patch('/', async (req, res) => {
  const parsed = preferencesSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const preferences = await prisma.businessPreferences.upsert({
    where: { tenantId: req.user!.tenantId },
    update: parsed.data,
    create: { tenantId: req.user!.tenantId, cutoffDaySlots: [], ...parsed.data },
  })
  return res.json(preferences)
})

export default router
