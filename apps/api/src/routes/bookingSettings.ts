import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import {
  appointmentsInRange,
  assertIsoDate,
  effectivePause,
  tenantTimezone,
  todayIso,
  upcomingClosures,
  validateClosureRange,
} from '../services/bookingAvailability.service.js'

/**
 * Vacaciones y pausa de reservas en línea (dueño del negocio).
 * Ninguna acción cancela citas: solo se informan las que caen en el periodo.
 */
const router = Router()
router.use(authenticate, authorize('BUSINESS'))

async function currentState(tenantId: string) {
  const timezone = await tenantTimezone(tenantId)
  const today = todayIso(timezone)
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { bookingPaused: true, bookingPauseMessage: true, bookingPauseUntil: true },
  })
  return {
    today,
    timezone,
    pause: effectivePause(tenant, today),
    closures: await upcomingClosures(tenantId, today),
  }
}

router.get('/', async (req, res) => {
  try {
    return res.json(await currentState(requireTenantId(req.user!)))
  } catch (e) {
    return sendError(res, e)
  }
})

const pauseSchema = z.object({
  paused: z.boolean(),
  message: z.string().trim().max(280).nullable().optional(),
  until: z.string().nullable().optional(),
})

router.put('/pause', async (req, res) => {
  try {
    const parsed = pauseSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    const tenantId = requireTenantId(req.user!)
    const timezone = await tenantTimezone(tenantId)
    const today = todayIso(timezone)
    const until = parsed.data.paused ? parsed.data.until?.trim() || null : null
    if (until) {
      assertIsoDate(until, 'La fecha de regreso')
      if (until <= today) throw new HttpError(400, 'La fecha de regreso debe ser posterior a hoy')
    }
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        bookingPaused: parsed.data.paused,
        bookingPauseMessage: parsed.data.paused ? parsed.data.message?.trim() || null : null,
        bookingPauseUntil: until,
      },
    })
    return res.json(await currentState(tenantId))
  } catch (e) {
    return sendError(res, e)
  }
})

const closureSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  label: z.string().trim().min(1).max(60),
  publicMessage: z.string().trim().max(280).nullable().optional(),
})

/** Vista previa: qué citas ya agendadas caen en ese periodo (antes de guardar). */
router.get('/closures/preview', async (req, res) => {
  try {
    const startDate = String(req.query.startDate ?? '')
    const endDate = String(req.query.endDate ?? '')
    const tenantId = requireTenantId(req.user!)
    const timezone = await tenantTimezone(tenantId)
    validateClosureRange(startDate, endDate, todayIso(timezone))
    return res.json({ appointments: await appointmentsInRange(tenantId, startDate, endDate, timezone) })
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/closures', async (req, res) => {
  try {
    const parsed = closureSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Escribe el motivo y las fechas' })
    const tenantId = requireTenantId(req.user!)
    const timezone = await tenantTimezone(tenantId)
    const { startDate, endDate, label } = parsed.data
    validateClosureRange(startDate, endDate, todayIso(timezone))

    const count = await prisma.businessClosure.count({ where: { tenantId, endDate: { gte: todayIso(timezone) } } })
    if (count >= 50) throw new HttpError(400, 'Tienes demasiados cierres programados. Borra alguno antes de agregar otro.')

    const closure = await prisma.businessClosure.create({
      data: { tenantId, startDate, endDate, label, publicMessage: parsed.data.publicMessage?.trim() || null },
      select: { id: true, startDate: true, endDate: true, label: true, publicMessage: true },
    })
    const appointments = await appointmentsInRange(tenantId, startDate, endDate, timezone)
    return res.status(201).json({ closure, appointments, ...(await currentState(tenantId)) })
  } catch (e) {
    return sendError(res, e)
  }
})

router.delete('/closures/:id', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    const { count } = await prisma.businessClosure.deleteMany({ where: { id: getParam(req.params.id), tenantId } })
    if (count === 0) throw new HttpError(404, 'No encontramos ese cierre')
    return res.json(await currentState(tenantId))
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
