import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import {
  materializeRulesForRange,
  parseRangeQuery,
  saveWeeklyRules,
  validateDayRules,
} from '../lib/weeklySchedule.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const settingsSchema = z.object({
  stockDeliveryEnabled: z.boolean(),
  cutPickupEnabled: z.boolean(),
  timezone: z.string().min(1).max(64).optional(),
})

const weeklyRulesSchema = z.object({
  type: z.enum(['STOCK_DELIVERY', 'CUT_PICKUP']),
  intervalMinutes: z.coerce.number().int().min(15).max(60),
  days: z
    .array(
      z.object({
        weekday: z.coerce.number().int().min(1).max(7),
        startTime: z.string(),
        endTime: z.string(),
      }),
    )
    .min(1),
})

const appointmentSchema = z.object({
  slotId: z.string().min(1),
  notes: z.string().max(1000).optional().nullable(),
})

router.use(authenticate)

async function getOrCreateSettings(tenantId: string) {
  return prisma.agendaSettings.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  })
}

router.get('/settings', async (req, res) => {
  const settings = await getOrCreateSettings(req.user!.tenantId)
  return res.json(settings)
})

router.patch('/settings', authorize('BUSINESS'), async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const settings = await prisma.agendaSettings.upsert({
    where: { tenantId: req.user!.tenantId },
    create: { tenantId: req.user!.tenantId, ...parsed.data },
    update: parsed.data,
  })
  return res.json(settings)
})

router.get('/weekly-rules', async (req, res) => {
  const typeRaw = typeof req.query.type === 'string' ? req.query.type : undefined
  if (typeRaw && typeRaw !== 'STOCK_DELIVERY' && typeRaw !== 'CUT_PICKUP') {
    return res.status(400).json({ error: 'Tipo inválido' })
  }
  const type = typeRaw as 'STOCK_DELIVERY' | 'CUT_PICKUP' | undefined
  const rules = await prisma.weeklyScheduleRule.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(type ? { type } : {}),
    },
    orderBy: [{ type: 'asc' }, { weekday: 'asc' }],
  })
  return res.json(rules)
})

router.put('/weekly-rules', authorize('BUSINESS'), async (req, res) => {
  const parsed = weeklyRulesSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const validationError = validateDayRules(parsed.data.days, parsed.data.intervalMinutes)
  if (validationError) return res.status(400).json({ error: validationError })

  const settings = await getOrCreateSettings(req.user!.tenantId)
  const now = new Date()
  const materializeTo = new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000)

  try {
    const result = await saveWeeklyRules({
      tenantId: req.user!.tenantId,
      type: parsed.data.type,
      intervalMinutes: parsed.data.intervalMinutes,
      days: parsed.data.days,
      timeZone: settings.timezone,
      materializeFrom: now,
      materializeTo,
    })
    return res.json({
      rules: result.rules,
      deletedFree: result.deletedFree,
      materialized: result.expected,
    })
  } catch (e) {
    return res.status(400).json({ error: e instanceof Error ? e.message : 'No se pudo guardar' })
  }
})

router.delete('/weekly-rules/:type', authorize('BUSINESS'), async (req, res) => {
  const type = getParam(req.params.type)
  if (type !== 'STOCK_DELIVERY' && type !== 'CUT_PICKUP') {
    return res.status(400).json({ error: 'Tipo inválido' })
  }

  const deleted = await prisma.$transaction(async (tx) => {
    await tx.weeklyScheduleRule.deleteMany({
      where: { tenantId: req.user!.tenantId, type },
    })
    const free = await tx.scheduleSlot.findMany({
      where: {
        tenantId: req.user!.tenantId,
        type,
        startAt: { gt: new Date() },
        appointment: null,
      },
      select: { id: true },
    })
    if (free.length > 0) {
      await tx.scheduleSlot.deleteMany({ where: { id: { in: free.map((s) => s.id) } } })
    }
    return free.length
  })

  return res.json({ deletedFree: deleted })
})

router.get('/slots', async (req, res) => {
  const settings = await getOrCreateSettings(req.user!.tenantId)
  const range = parseRangeQuery(
    typeof req.query.from === 'string' ? req.query.from : undefined,
    typeof req.query.to === 'string' ? req.query.to : undefined,
  )
  if ('error' in range) return res.status(400).json({ error: range.error })

  const enabledTypes = [
    ...(settings.stockDeliveryEnabled ? (['STOCK_DELIVERY'] as const) : []),
    ...(settings.cutPickupEnabled ? (['CUT_PICKUP'] as const) : []),
  ]

  if (enabledTypes.length > 0) {
    await materializeRulesForRange({
      tenantId: req.user!.tenantId,
      from: range.from,
      to: range.to,
      timeZone: settings.timezone,
      types: [...enabledTypes],
    })
  }

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      tenantId: req.user!.tenantId,
      startAt: { gte: range.from, lt: range.to },
      ...(req.user!.role === 'BRAND'
        ? {
            active: true,
            startAt: { gte: new Date(Math.max(range.from.getTime(), Date.now())), lt: range.to },
            type: { in: enabledTypes },
          }
        : {}),
    },
    orderBy: { startAt: 'asc' },
    include: {
      appointment: {
        include: {
          brand: { select: { id: true, name: true, whatsapp: true } },
          bookedBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (req.user!.role === 'BUSINESS') return res.json(slots)

  return res.json(
    slots.map((slot) => ({
      id: slot.id,
      type: slot.type,
      startAt: slot.startAt,
      endAt: slot.endAt,
      active: slot.active,
      booked: Boolean(slot.appointment),
      ownAppointment:
        slot.appointment?.brandId === req.user!.brandId ? slot.appointment : null,
    })),
  )
})

router.delete('/slots/:id', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const slot = await prisma.scheduleSlot.findFirst({
    where: { id, tenantId: req.user!.tenantId },
    include: { appointment: { select: { id: true } } },
  })
  if (!slot) return res.status(404).json({ error: 'Horario no encontrado' })
  if (slot.appointment) {
    return res.status(409).json({ error: 'No se puede eliminar un horario reservado' })
  }

  await prisma.scheduleSlot.delete({ where: { id } })
  return res.status(204).send()
})

router.get('/appointments', async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(req.user!.role === 'BRAND' ? { brandId: req.user!.brandId ?? '__missing__' } : {}),
    },
    orderBy: { slot: { startAt: 'asc' } },
    include: {
      slot: true,
      brand: { select: { id: true, name: true, whatsapp: true } },
      bookedBy: { select: { id: true, name: true } },
    },
  })
  return res.json(appointments)
})

router.post('/appointments', authorize('BRAND'), async (req, res) => {
  if (!req.user!.brandId) {
    return res.status(400).json({ error: 'El usuario no tiene una marca vinculada' })
  }
  const parsed = appointmentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })

  const settings = await getOrCreateSettings(req.user!.tenantId)
  const slot = await prisma.scheduleSlot.findFirst({
    where: {
      id: parsed.data.slotId,
      tenantId: req.user!.tenantId,
      active: true,
      startAt: { gt: new Date() },
    },
  })
  if (!slot) return res.status(404).json({ error: 'Horario no disponible' })

  const typeEnabled =
    slot.type === 'STOCK_DELIVERY' ? settings.stockDeliveryEnabled : settings.cutPickupEnabled
  if (!typeEnabled) return res.status(409).json({ error: 'Este tipo de cita está deshabilitado' })

  try {
    const appointment = await prisma.appointment.create({
      data: {
        tenantId: req.user!.tenantId,
        brandId: req.user!.brandId,
        slotId: slot.id,
        bookedById: req.user!.id,
        notes: parsed.data.notes?.trim() || null,
      },
      include: { slot: true, brand: { select: { id: true, name: true } } },
    })
    return res.status(201).json(appointment)
  } catch {
    return res.status(409).json({ error: 'El horario ya fue reservado' })
  }
})

router.delete('/appointments/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const appointment = await prisma.appointment.findFirst({
    where: {
      id,
      tenantId: req.user!.tenantId,
      ...(req.user!.role === 'BRAND' ? { brandId: req.user!.brandId ?? '__missing__' } : {}),
    },
    include: { slot: { select: { startAt: true } } },
  })
  if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' })
  if (req.user!.role === 'BRAND' && appointment.slot.startAt <= new Date()) {
    return res.status(409).json({ error: 'No se puede cancelar una cita pasada' })
  }

  await prisma.appointment.delete({ where: { id } })
  return res.status(204).send()
})

export default router
