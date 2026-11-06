import { zonedLocalToUtc, zonedIsoWeekday, parseTimeHm } from '../../lib/timezone.js'

export interface OccupiedRange {
  startTime: Date
  endTime: Date
}

export interface FreeBlock {
  start: string
  end: string
}

function padHm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toMinutes(hhmm: string): number | null {
  const parsed = parseTimeHm(hhmm)
  if (!parsed) return null
  return parsed.hour * 60 + parsed.minute
}

function fromMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, total))
  return padHm(Math.floor(clamped / 60) % 24, clamped % 60)
}

function clipToDay(startMin: number, endMin: number, openMin: number, closeMin: number) {
  return {
    start: Math.max(startMin, openMin),
    end: Math.min(endMin, closeMin),
  }
}

/** JS weekday 0=Sun … 6=Sat for a calendar date in a timezone. */
export function zonedJsWeekday(year: number, month: number, day: number, timeZone: string): number {
  return zonedIsoWeekday(year, month, day, timeZone) % 7
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const probe = new Date(Date.UTC(year, month - 1, day))
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null
  }
  return { year, month, day }
}

export function dayBoundsUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): { start: Date; end: Date } {
  const start = zonedLocalToUtc(year, month, day, 0, 0, timeZone)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  const end = zonedLocalToUtc(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), 0, 0, timeZone)
  return { start, end }
}

export function findFreeBlocks(params: {
  openTime: string
  closeTime: string
  durationMinutes: number
  appointments: OccupiedRange[]
  year: number
  month: number
  day: number
  timeZone: string
}): FreeBlock[] {
  const openMin = toMinutes(params.openTime)
  const closeMin = toMinutes(params.closeTime)
  if (openMin === null || closeMin === null || closeMin <= openMin) return []
  if (params.durationMinutes < 15 || params.durationMinutes > 480) return []

  const dayStart = zonedLocalToUtc(params.year, params.month, params.day, 0, 0, params.timeZone)
  const occupied: Array<{ start: number; end: number }> = []

  for (const appt of params.appointments) {
    const startMin = Math.round((appt.startTime.getTime() - dayStart.getTime()) / 60000)
    const endMin = Math.round((appt.endTime.getTime() - dayStart.getTime()) / 60000)
    const clipped = clipToDay(startMin, endMin, openMin, closeMin)
    if (clipped.end > clipped.start) occupied.push(clipped)
  }

  occupied.sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []
  for (const range of occupied) {
    const last = merged[merged.length - 1]
    if (!last || range.start > last.end) {
      merged.push({ ...range })
    } else {
      last.end = Math.max(last.end, range.end)
    }
  }

  const gaps: FreeBlock[] = []
  let cursor = openMin
  for (const block of merged) {
    if (block.start - cursor >= params.durationMinutes) {
      gaps.push({ start: fromMinutes(cursor), end: fromMinutes(block.start) })
    }
    cursor = Math.max(cursor, block.end)
  }
  if (closeMin - cursor >= params.durationMinutes) {
    gaps.push({ start: fromMinutes(cursor), end: fromMinutes(closeMin) })
  }
  return gaps
}
