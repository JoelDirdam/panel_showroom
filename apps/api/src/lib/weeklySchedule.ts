import type { ScheduleType, WeeklyScheduleRule } from '@prisma/client'
import { prisma } from './prisma.js'
import {
  parseTimeHm,
  utcToZonedParts,
  zonedIsoWeekday,
  zonedLocalToUtc,
} from './timezone.js'

const MAX_RANGE_DAYS = 92

export type DayRuleInput = {
  weekday: number
  startTime: string
  endTime: string
}

export function validateDayRules(
  days: DayRuleInput[],
  intervalMinutes: number,
): string | null {
  if (![15, 30, 60].includes(intervalMinutes)) {
    return 'El intervalo debe ser 15, 30 o 60 minutos'
  }
  if (days.length === 0) return 'Selecciona al menos un día'
  const seen = new Set<number>()
  for (const day of days) {
    if (day.weekday < 1 || day.weekday > 7) return 'Día de semana inválido'
    if (seen.has(day.weekday)) return 'Día duplicado'
    seen.add(day.weekday)
    const start = parseTimeHm(day.startTime)
    const end = parseTimeHm(day.endTime)
    if (!start || !end) return 'Formato de hora inválido (usa HH:mm)'
    const startMin = start.hour * 60 + start.minute
    const endMin = end.hour * 60 + end.minute
    if (endMin <= startMin) return 'La hora final debe ser posterior a la inicial'
    if (endMin - startMin < intervalMinutes) {
      return 'El rango es menor que el intervalo elegido'
    }
  }
  return null
}

function eachCalendarDay(from: Date, to: Date, timeZone: string) {
  const startParts = utcToZonedParts(from, timeZone)
  const endParts = utcToZonedParts(to, timeZone)
  let cursor = zonedLocalToUtc(startParts.year, startParts.month, startParts.day, 0, 0, timeZone)
  const end = zonedLocalToUtc(endParts.year, endParts.month, endParts.day, 23, 59, timeZone)
  const days: { year: number; month: number; day: number }[] = []
  while (cursor <= end) {
    days.push(utcToZonedParts(cursor, timeZone))
    const next = new Date(cursor.getTime() + 36 * 60 * 60 * 1000)
    const p = utcToZonedParts(next, timeZone)
    cursor = zonedLocalToUtc(p.year, p.month, p.day, 0, 0, timeZone)
  }
  return days
}

export function buildSlotsForRules(
  rules: Pick<WeeklyScheduleRule, 'id' | 'type' | 'weekday' | 'startTime' | 'endTime' | 'intervalMinutes'>[],
  from: Date,
  to: Date,
  timeZone: string,
  tenantId: string,
) {
  const byWeekday = new Map(rules.map((r) => [r.weekday, r]))
  const slots: {
    tenantId: string
    type: ScheduleType
    startAt: Date
    endAt: Date
    ruleId: string
    active: boolean
  }[] = []

  for (const cal of eachCalendarDay(from, to, timeZone)) {
    const weekday = zonedIsoWeekday(cal.year, cal.month, cal.day, timeZone)
    const rule = byWeekday.get(weekday)
    if (!rule) continue
    const start = parseTimeHm(rule.startTime)!
    const end = parseTimeHm(rule.endTime)!
    const dayStart = zonedLocalToUtc(cal.year, cal.month, cal.day, start.hour, start.minute, timeZone)
    const dayEnd = zonedLocalToUtc(cal.year, cal.month, cal.day, end.hour, end.minute, timeZone)
    const intervalMs = rule.intervalMinutes * 60 * 1000
    for (let t = dayStart.getTime(); t + intervalMs <= dayEnd.getTime(); t += intervalMs) {
      const startAt = new Date(t)
      const endAt = new Date(t + intervalMs)
      if (endAt <= from || startAt >= to) continue
      if (startAt <= new Date()) continue
      slots.push({
        tenantId,
        type: rule.type,
        startAt,
        endAt,
        ruleId: rule.id,
        active: true,
      })
    }
  }
  return slots
}

export function parseRangeQuery(fromRaw?: string, toRaw?: string): { from: Date; to: Date } | { error: string } {
  const now = new Date()
  const from = fromRaw ? new Date(fromRaw) : now
  const to = toRaw
    ? new Date(toRaw)
    : new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: 'Rango de fechas inválido' }
  }
  if (to <= from) return { error: 'to debe ser posterior a from' }
  const days = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)
  if (days > MAX_RANGE_DAYS) {
    return { error: `El rango no puede superar ${MAX_RANGE_DAYS} días` }
  }
  return { from, to }
}

/** Materialize rule occurrences in [from, to). Idempotent via unique + skipDuplicates. */
export async function materializeRulesForRange(opts: {
  tenantId: string
  from: Date
  to: Date
  timeZone: string
  types?: ScheduleType[]
}) {
  const rules = await prisma.weeklyScheduleRule.findMany({
    where: {
      tenantId: opts.tenantId,
      active: true,
      ...(opts.types ? { type: { in: opts.types } } : {}),
    },
  })
  if (rules.length === 0) return { created: 0 }

  const slots = buildSlotsForRules(rules, opts.from, opts.to, opts.timeZone, opts.tenantId)
  if (slots.length === 0) return { created: 0 }

  const result = await prisma.scheduleSlot.createMany({
    data: slots,
    skipDuplicates: true,
  })
  return { created: result.count }
}

/** Replace rules for a type and prune future free slots that no longer match. */
export async function saveWeeklyRules(opts: {
  tenantId: string
  type: ScheduleType
  intervalMinutes: number
  days: DayRuleInput[]
  timeZone: string
  materializeFrom: Date
  materializeTo: Date
}) {
  const validationError = validateDayRules(opts.days, opts.intervalMinutes)
  if (validationError) throw new Error(validationError)

  return prisma.$transaction(async (tx) => {
    await tx.weeklyScheduleRule.deleteMany({
      where: { tenantId: opts.tenantId, type: opts.type },
    })

    await tx.weeklyScheduleRule.createMany({
      data: opts.days.map((day) => ({
        tenantId: opts.tenantId,
        type: opts.type,
        weekday: day.weekday,
        startTime: day.startTime,
        endTime: day.endTime,
        intervalMinutes: opts.intervalMinutes,
        active: true,
      })),
    })

    const rules = await tx.weeklyScheduleRule.findMany({
      where: { tenantId: opts.tenantId, type: opts.type, active: true },
    })

    const expected = buildSlotsForRules(
      rules,
      opts.materializeFrom,
      opts.materializeTo,
      opts.timeZone,
      opts.tenantId,
    )
    const expectedKeys = new Set(
      expected.map((s) => `${s.startAt.toISOString()}|${s.endAt.toISOString()}`),
    )

    const futureFree = await tx.scheduleSlot.findMany({
      where: {
        tenantId: opts.tenantId,
        type: opts.type,
        startAt: { gt: new Date() },
        appointment: null,
      },
      select: { id: true, startAt: true, endAt: true },
    })

    const toDelete = futureFree
      .filter((s) => !expectedKeys.has(`${s.startAt.toISOString()}|${s.endAt.toISOString()}`))
      .map((s) => s.id)

    if (toDelete.length > 0) {
      await tx.scheduleSlot.deleteMany({ where: { id: { in: toDelete } } })
    }

    if (expected.length > 0) {
      await tx.scheduleSlot.createMany({
        data: expected,
        skipDuplicates: true,
      })
    }

    // Attach ruleId on matching free slots that already existed (skipDuplicates left them)
    for (const rule of rules) {
      const ruleSlots = expected.filter((s) => s.ruleId === rule.id)
      for (const slot of ruleSlots) {
        await tx.scheduleSlot.updateMany({
          where: {
            tenantId: opts.tenantId,
            type: opts.type,
            startAt: slot.startAt,
            endAt: slot.endAt,
            ruleId: null,
          },
          data: { ruleId: rule.id, active: true },
        })
      }
    }

    return {
      rules,
      deletedFree: toDelete.length,
      expected: expected.length,
    }
  })
}
