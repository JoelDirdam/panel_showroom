import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { getParam } from '../lib/params.js'
import { rateLimit } from '../lib/rateLimit.js'
import { listBusinessHours } from '../services/businessHours.service.js'
import { createAppointment } from '../services/appointments.service.js'
import {
  dayBoundsUtc,
  findFreeBlocks,
  parseIsoDate,
  zonedJsWeekday,
} from '../modules/ai/availability.js'
import { parseTimeHm, zonedLocalToUtc } from '../lib/timezone.js'

/**
 * Reserva pública (sin login): el cliente del negocio agenda desde /reservar/:slug.
 * No pasa por el gate de suscripción a propósito: aunque el negocio esté congelado
 * por falta de pago, sus clientes pueden seguir agendando (el negocio las ve al pagar).
 */
const router = Router()

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const SLOT_STEP_MINUTES = 30
const MIN_LEAD_MINUTES = 30
const MAX_DAYS_AHEAD = 90

async function loadTenant(slugRaw: string) {
  const slug = slugRaw.trim().toLowerCase()
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, active: true, logoUrl: true, address: true, socialUrl: true },
  })
  if (!tenant || !tenant.active) throw new HttpError(404, 'Negocio no encontrado')
  return tenant
}

async function loadTimezone(tenantId: string): Promise<string> {
  const settings = await prisma.agendaSettings.findUnique({
    where: { tenantId },
    select: { timezone: true },
  })
  return settings?.timezone?.trim() || DEFAULT_TIMEZONE
}

async function resolveSucursal(tenantId: string, sucursalId: string | undefined) {
  const sucursales = await prisma.sucursal.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  })
  if (sucursales.length === 0) return { sucursales, sucursalId: null as string | null }
  if (sucursales.length === 1) return { sucursales, sucursalId: sucursales[0].id }
  if (!sucursalId) throw new HttpError(400, 'Elige una sucursal')
  if (!sucursales.some((s) => s.id === sucursalId)) throw new HttpError(400, 'Sucursal no válida')
  return { sucursales, sucursalId }
}

function hmToMinutes(hm: string): number {
  const parsed = parseTimeHm(hm)
  return parsed ? parsed.hour * 60 + parsed.minute : 0
}

function minutesToHm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

async function computeSlots(params: {
  tenantId: string
  timezone: string
  date: string
  durationMinutes: number
  sucursalId: string | null
}): Promise<string[]> {
  const parsed = parseIsoDate(params.date)
  if (!parsed) throw new HttpError(400, 'Fecha inválida')

  const dayStartUtc = dayBoundsUtc(parsed.year, parsed.month, parsed.day, params.timezone).start
  const now = Date.now()
  if (dayStartUtc.getTime() > now + MAX_DAYS_AHEAD * 86_400_000) {
    throw new HttpError(400, 'Fecha demasiado lejana')
  }

  const hours = await listBusinessHours(params.tenantId)
  const weekday = zonedJsWeekday(parsed.year, parsed.month, parsed.day, params.timezone)
  const day = hours.find((h) => h.dayOfWeek === weekday)
  if (!day || day.isClosed) return []

  const { start, end } = dayBoundsUtc(parsed.year, parsed.month, parsed.day, params.timezone)
  const busy = await prisma.appointment.findMany({
    where: {
      tenantId: params.tenantId,
      sucursalId: params.sucursalId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
    select: { startTime: true, endTime: true },
  })

  const blocks = findFreeBlocks({
    openTime: day.openTime,
    closeTime: day.closeTime,
    breakStart: day.breakStart,
    breakEnd: day.breakEnd,
    durationMinutes: params.durationMinutes,
    appointments: busy,
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    timeZone: params.timezone,
  })

  const slots: string[] = []
  for (const block of blocks) {
    const from = hmToMinutes(block.start)
    const to = hmToMinutes(block.end)
    // Alinea a rejilla de 30 min para que las opciones sean limpias.
    const first = Math.ceil(from / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES
    for (let t = first; t + params.durationMinutes <= to; t += SLOT_STEP_MINUTES) {
      const startUtc = zonedLocalToUtc(
        parsed.year,
        parsed.month,
        parsed.day,
        Math.floor(t / 60),
        t % 60,
        params.timezone,
      )
      if (startUtc.getTime() < now + MIN_LEAD_MINUTES * 60_000) continue
      slots.push(minutesToHm(t))
    }
  }
  return slots
}

router.get('/:slug', async (req, res) => {
  try {
    const tenant = await loadTenant(getParam(req.params.slug))
    const [services, sucursales, hours] = await Promise.all([
      prisma.service.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, name: true, durationMinutes: true, price: true },
        orderBy: { name: 'asc' },
      }),
      prisma.sucursal.findMany({
        where: { tenantId: tenant.id, isActive: true },
        select: { id: true, name: true, address: true },
        orderBy: { name: 'asc' },
      }),
      listBusinessHours(tenant.id),
    ])
    return res.json({
      business: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        address: tenant.address,
        socialUrl: tenant.socialUrl,
      },
      services,
      sucursales,
      hours: hours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
        breakStart: h.breakStart,
        breakEnd: h.breakEnd,
      })),
      maxDaysAhead: MAX_DAYS_AHEAD,
    })
  } catch (e) {
    return sendError(res, e)
  }
})

const availabilityQuery = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string().min(1),
  sucursalId: z.string().min(1).optional(),
})

router.get(
  '/:slug/availability',
  rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'public-avail' }),
  async (req, res) => {
    try {
      const parsed = availabilityQuery.safeParse(req.query)
      if (!parsed.success) return res.status(400).json({ error: 'Parámetros inválidos' })
      const tenant = await loadTenant(getParam(req.params.slug))
      const service = await prisma.service.findFirst({
        where: { id: parsed.data.serviceId, tenantId: tenant.id, isActive: true },
      })
      if (!service) throw new HttpError(404, 'Servicio no encontrado')
      const { sucursalId } = await resolveSucursal(tenant.id, parsed.data.sucursalId)
      const timezone = await loadTimezone(tenant.id)
      const slots = await computeSlots({
        tenantId: tenant.id,
        timezone,
        date: parsed.data.date,
        durationMinutes: service.durationMinutes,
        sucursalId,
      })
      return res.json({ date: parsed.data.date, slots })
    } catch (e) {
      return sendError(res, e)
    }
  },
)

const bookSchema = z.object({
  serviceId: z.string().min(1),
  sucursalId: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(8).max(20),
  notes: z.string().trim().max(500).optional(),
})

router.post(
  '/:slug/appointments',
  rateLimit({ windowMs: 10 * 60_000, max: 10, keyPrefix: 'public-book' }),
  async (req, res) => {
    try {
      const parsed = bookSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Revisa tus datos: nombre y teléfono son obligatorios' })
      }
      const input = parsed.data
      const tenant = await loadTenant(getParam(req.params.slug))
      const service = await prisma.service.findFirst({
        where: { id: input.serviceId, tenantId: tenant.id, isActive: true },
      })
      if (!service) throw new HttpError(404, 'Servicio no encontrado')
      const { sucursalId } = await resolveSucursal(tenant.id, input.sucursalId)
      const timezone = await loadTimezone(tenant.id)

      // Revalida contra la disponibilidad real: nunca confiar en la hora que manda el navegador.
      const slots = await computeSlots({
        tenantId: tenant.id,
        timezone,
        date: input.date,
        durationMinutes: service.durationMinutes,
        sucursalId,
      })
      if (!slots.includes(input.time)) {
        throw new HttpError(409, 'Ese horario ya no está disponible. Elige otro.')
      }

      const parsedDate = parseIsoDate(input.date)!
      const time = parseTimeHm(input.time)!
      const startTime = zonedLocalToUtc(
        parsedDate.year,
        parsedDate.month,
        parsedDate.day,
        time.hour,
        time.minute,
        timezone,
      )
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000)

      const appointment = await createAppointment(tenant.id, {
        serviceId: service.id,
        sucursalId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        startTime,
        endTime,
        notes: input.notes ? `[Reserva en línea] ${input.notes}` : '[Reserva en línea]',
        status: 'PENDING',
      })

      return res.status(201).json({
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        service: { name: service.name, durationMinutes: service.durationMinutes },
        business: { name: tenant.name },
      })
    } catch (e) {
      return sendError(res, e)
    }
  },
)

export default router
