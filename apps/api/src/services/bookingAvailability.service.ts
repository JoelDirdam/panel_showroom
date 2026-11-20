import { prisma } from '../lib/prisma.js'
import { HttpError } from '../lib/httpError.js'
import { utcToZonedParts } from '../lib/timezone.js'
import { dayBoundsUtc, parseIsoDate } from '../modules/ai/availability.js'

/**
 * Vacaciones y pausa de reservas.
 *
 * - Una pausa detiene las reservas NUEVAS del link público y del asistente de IA.
 *   No cancela citas existentes y el negocio puede seguir creando citas desde su panel.
 * - Un cierre (BusinessClosure) bloquea uno o varios días completos (fechas locales,
 *   inclusivas). Mismo efecto, pero solo en esas fechas.
 */

export const DEFAULT_TIMEZONE = 'America/Mexico_City'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_CLOSURE_DAYS = 120

export async function tenantTimezone(tenantId: string): Promise<string> {
  const settings = await prisma.agendaSettings.findUnique({ where: { tenantId }, select: { timezone: true } })
  return settings?.timezone?.trim() || DEFAULT_TIMEZONE
}

export function todayIso(timeZone: string, now: Date = new Date()): string {
  const p = utcToZonedParts(now, timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export interface PauseState {
  paused: boolean
  message: string | null
  until: string | null
}

/** La pausa termina sola al pasar `bookingPauseUntil` (se reanuda ese mismo día). */
export function effectivePause(
  tenant: { bookingPaused: boolean; bookingPauseMessage: string | null; bookingPauseUntil: string | null },
  today: string,
): PauseState {
  const active = tenant.bookingPaused && (!tenant.bookingPauseUntil || today < tenant.bookingPauseUntil)
  return {
    paused: active,
    message: active ? tenant.bookingPauseMessage : null,
    until: active ? tenant.bookingPauseUntil : null,
  }
}

export interface ClosureInfo {
  id: string
  startDate: string
  endDate: string
  label: string
  publicMessage: string | null
}

/** Cierres que terminan hoy o después (los pasados ya no importan para reservar). */
export async function upcomingClosures(tenantId: string, today: string): Promise<ClosureInfo[]> {
  return prisma.businessClosure.findMany({
    where: { tenantId, endDate: { gte: today } },
    select: { id: true, startDate: true, endDate: true, label: true, publicMessage: true },
    orderBy: { startDate: 'asc' },
  })
}

export function closureForDate(closures: ClosureInfo[], date: string): ClosureInfo | null {
  return closures.find((c) => c.startDate <= date && date <= c.endDate) ?? null
}

/**
 * ¿Se puede reservar en línea esta fecha? Devuelve el motivo si no.
 * Lo usan el link público y el asistente de IA.
 */
export async function onlineBookingBlock(
  tenantId: string,
  date: string,
  timeZone: string,
): Promise<{ blocked: false } | { blocked: true; reason: 'PAUSED' | 'CLOSED'; message: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { bookingPaused: true, bookingPauseMessage: true, bookingPauseUntil: true },
  })
  if (!tenant) return { blocked: false }
  const today = todayIso(timeZone)
  const pause = effectivePause(tenant, today)
  if (pause.paused) {
    return {
      blocked: true,
      reason: 'PAUSED',
      message:
        pause.message?.trim() ||
        (pause.until
          ? `Las reservas en línea están en pausa hasta el ${pause.until}.`
          : 'Las reservas en línea están en pausa por ahora.'),
    }
  }
  const closure = await prisma.businessClosure.findFirst({
    where: { tenantId, startDate: { lte: date }, endDate: { gte: date } },
    select: { label: true, publicMessage: true },
  })
  if (closure) {
    return {
      blocked: true,
      reason: 'CLOSED',
      message: closure.publicMessage?.trim() || `El negocio no atiende ese día (${closure.label}).`,
    }
  }
  return { blocked: false }
}

export function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE.test(value) || !parseIsoDate(value)) throw new HttpError(400, `${field} no es una fecha válida`)
}

export function daysBetween(start: string, end: string): number {
  const a = Date.UTC(Number(start.slice(0, 4)), Number(start.slice(5, 7)) - 1, Number(start.slice(8, 10)))
  const b = Date.UTC(Number(end.slice(0, 4)), Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)))
  return Math.round((b - a) / 86_400_000) + 1
}

export function validateClosureRange(startDate: string, endDate: string, today: string): void {
  assertIsoDate(startDate, 'La fecha de inicio')
  assertIsoDate(endDate, 'La fecha de fin')
  if (endDate < startDate) throw new HttpError(400, 'La fecha de fin debe ser igual o posterior a la de inicio')
  if (endDate < today) throw new HttpError(400, 'Ese periodo ya pasó')
  if (daysBetween(startDate, endDate) > MAX_CLOSURE_DAYS) {
    throw new HttpError(400, `Un cierre puede durar máximo ${MAX_CLOSURE_DAYS} días. Para más tiempo, pausa las reservas.`)
  }
}

/** Citas activas (pendientes o confirmadas) que caen dentro del periodo, para avisar al negocio. */
export async function appointmentsInRange(tenantId: string, startDate: string, endDate: string, timeZone: string) {
  const s = parseIsoDate(startDate)!
  const e = parseIsoDate(endDate)!
  const from = dayBoundsUtc(s.year, s.month, s.day, timeZone).start
  const to = dayBoundsUtc(e.year, e.month, e.day, timeZone).end
  return prisma.appointment.findMany({
    where: { tenantId, status: { in: ['PENDING', 'CONFIRMED'] }, startTime: { gte: from, lt: to } },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      startTime: true,
      service: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 200,
  })
}
