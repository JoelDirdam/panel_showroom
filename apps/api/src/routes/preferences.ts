import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const commission = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .min(0, 'Mínimo 0')
  .max(100, 'Máximo 100')
  .nullable()
  .optional()

const labelMm = z
  .number({ invalid_type_error: 'Debe ser un número entero' })
  .int('Debe ser un número entero')
  .positive('Debe ser mayor a 0')
  .nullable()
  .optional()

const preferencesSchema = z.object({
  primaryTerminalCommission: commission,
  secondaryTerminalCommission: commission,
  transferCommission: commission,
  layawayDueDays: z
    .number({ invalid_type_error: 'Debe ser un número entero' })
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1 día')
    .max(365, 'Máximo 365 días')
    .optional(),
  labelWidthMm: labelMm,
  labelHeightMm: labelMm,
  flexibleInventory: z.boolean({ invalid_type_error: 'Valor inválido' }).optional(),
  printTickets: z.boolean({ invalid_type_error: 'Valor inválido' }).optional(),
  ticketFixedComment: z
    .string({ invalid_type_error: 'Texto inválido' })
    .max(1000, 'Máximo 1000 caracteres')
    .nullable()
    .optional(),
  chargeIva: z.boolean({ invalid_type_error: 'Valor inválido' }).optional(),
  usdEnabled: z.boolean({ invalid_type_error: 'Valor inválido' }).optional(),
  usdRateMode: z
    .enum(['FIXED', 'AUTOMATIC'], {
      errorMap: () => ({ message: 'Elige Fijo o Automático' }),
    })
    .nullable()
    .optional(),
  usdFixedRate: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .positive('Debe ser mayor a 0')
    .nullable()
    .optional(),
  cutoffType: z
    .enum(['WEEKLY', 'MONTHLY_FIXED'], {
      errorMap: () => ({ message: 'Tipo de corte inválido' }),
    })
    .optional(),
  cutoffWeekday: z
    .number({ invalid_type_error: 'Día de la semana inválido' })
    .int()
    .min(1, 'Día inválido')
    .max(7, 'Día inválido')
    .nullable()
    .optional(),
  cutoffDaySlots: z
    .array(
      z
        .number({ invalid_type_error: 'Día del mes inválido' })
        .int()
        .min(1, 'Día entre 1 y 31')
        .max(31, 'Día entre 1 y 31'),
    )
    .optional(),
})

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  try {
    const preferences = await prisma.businessPreferences.upsert({
      where: { tenantId: req.user!.tenantId },
      update: {},
      create: { tenantId: req.user!.tenantId, cutoffDaySlots: [] },
    })
    return res.json(preferences)
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/', async (req, res) => {
  try {
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
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
