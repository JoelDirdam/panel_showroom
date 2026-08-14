import { prisma } from '../lib/prisma.js'
import { HttpError } from '../lib/httpError.js'
import type { BusinessHourInput, UpdateBusinessHourInput } from '../schemas/businessHours.js'

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

function defaultHour(tenantId: string, dayOfWeek: number) {
  const weekend = dayOfWeek === 0 || dayOfWeek === 6
  return {
    tenantId,
    dayOfWeek,
    openTime: '09:00',
    closeTime: '18:00',
    isClosed: weekend,
  }
}

export async function listBusinessHours(tenantId: string) {
  const existing = await prisma.businessHour.findMany({
    where: { tenantId },
    orderBy: { dayOfWeek: 'asc' },
  })
  const have = new Set(existing.map((h) => h.dayOfWeek))
  const missing = WEEKDAYS.filter((d) => !have.has(d)).map((d) => defaultHour(tenantId, d))
  if (missing.length > 0) {
    await prisma.businessHour.createMany({ data: missing, skipDuplicates: true })
    return prisma.businessHour.findMany({
      where: { tenantId },
      orderBy: { dayOfWeek: 'asc' },
    })
  }
  return existing
}

export async function replaceBusinessHours(tenantId: string, days: BusinessHourInput[]) {
  await listBusinessHours(tenantId)
  await prisma.$transaction(
    days.map((day) =>
      prisma.businessHour.update({
        where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: day.dayOfWeek } },
        data: {
          openTime: day.openTime,
          closeTime: day.closeTime,
          isClosed: day.isClosed,
        },
      }),
    ),
  )
  return prisma.businessHour.findMany({
    where: { tenantId },
    orderBy: { dayOfWeek: 'asc' },
  })
}

export async function updateBusinessHour(tenantId: string, id: string, input: UpdateBusinessHourInput) {
  const existing = await prisma.businessHour.findFirst({ where: { id, tenantId } })
  if (!existing) throw new HttpError(404, 'Horario no encontrado')

  const next = {
    openTime: input.openTime ?? existing.openTime,
    closeTime: input.closeTime ?? existing.closeTime,
    isClosed: input.isClosed ?? existing.isClosed,
  }
  if (!next.isClosed && next.closeTime <= next.openTime) {
    throw new HttpError(400, 'closeTime debe ser posterior a openTime')
  }

  if (input.dayOfWeek !== undefined && input.dayOfWeek !== existing.dayOfWeek) {
    throw new HttpError(400, 'No se puede cambiar el día de la semana')
  }

  return prisma.businessHour.update({
    where: { id },
    data: {
      openTime: next.openTime,
      closeTime: next.closeTime,
      isClosed: next.isClosed,
    },
  })
}
