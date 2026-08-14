import type { AppointmentStatus, Prisma } from '@prisma/client'
import { Prisma as PrismaNS } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../lib/httpError.js'
import type { CreateAppointmentInput, UpdateAppointmentInput } from '../schemas/appointments.js'

const ACTIVE_STATUSES: AppointmentStatus[] = ['PENDING', 'CONFIRMED']

const appointmentInclude = {
  service: { select: { id: true, name: true, durationMinutes: true, price: true, isActive: true } },
} satisfies Prisma.AppointmentInclude

function isOverlapDbError(e: unknown): boolean {
  if (e instanceof PrismaNS.PrismaClientKnownRequestError && (e.code === 'P2004' || e.code === 'P2010')) {
    return true
  }
  const msg = e instanceof Error ? e.message : String(e)
  return (
    msg.includes('Appointment_no_overlap') ||
    msg.includes('23P01') ||
    msg.includes('exclusion constraint')
  )
}

export async function assertNoOverlap(params: {
  tenantId: string
  startTime: Date
  endTime: Date
  excludeId?: string
  tx?: Prisma.TransactionClient
}) {
  const db = params.tx ?? prisma
  const clash = await db.appointment.findFirst({
    where: {
      tenantId: params.tenantId,
      status: { in: ACTIVE_STATUSES },
      startTime: { lt: params.endTime },
      endTime: { gt: params.startTime },
      ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
    },
    select: { id: true },
  })
  if (clash) {
    throw new HttpError(409, 'El horario se solapa con otra cita')
  }
}

async function assertService(tenantId: string, serviceId: string | null | undefined) {
  if (!serviceId) return
  const service = await prisma.service.findFirst({
    where: { id: serviceId, tenantId },
  })
  if (!service) throw new HttpError(400, 'Servicio no encontrado')
  if (!service.isActive) throw new HttpError(400, 'El servicio está inactivo')
}

export async function listAppointments(
  tenantId: string,
  filters: { from?: Date; to?: Date; status?: AppointmentStatus },
) {
  return prisma.appointment.findMany({
    where: {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.from || filters.to
        ? {
            startTime: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lt: filters.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startTime: 'asc' },
    include: appointmentInclude,
  })
}

export async function getAppointment(tenantId: string, id: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id, tenantId },
    include: appointmentInclude,
  })
  if (!appointment) throw new HttpError(404, 'Cita no encontrada')
  return appointment
}

export async function createAppointment(tenantId: string, input: CreateAppointmentInput) {
  await assertService(tenantId, input.serviceId)
  try {
    return await prisma.$transaction(async (tx) => {
      await assertNoOverlap({
        tenantId,
        startTime: input.startTime,
        endTime: input.endTime,
        tx,
      })
      return tx.appointment.create({
        data: {
          tenantId,
          serviceId: input.serviceId ?? null,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          startTime: input.startTime,
          endTime: input.endTime,
          notes: input.notes?.trim() || null,
          status: input.status ?? 'PENDING',
        },
        include: appointmentInclude,
      })
    })
  } catch (e) {
    if (e instanceof HttpError) throw e
    if (isOverlapDbError(e)) throw new HttpError(409, 'El horario se solapa con otra cita')
    throw e
  }
}

export async function updateAppointment(tenantId: string, id: string, input: UpdateAppointmentInput) {
  const existing = await getAppointment(tenantId, id)
  if (input.serviceId !== undefined) {
    await assertService(tenantId, input.serviceId)
  }

  const nextStart = input.startTime ?? existing.startTime
  const nextEnd = input.endTime ?? existing.endTime
  if (nextEnd <= nextStart) {
    throw new HttpError(400, 'endTime debe ser posterior a startTime')
  }

  const nextStatus = input.status ?? existing.status
  const needsOverlap =
    ACTIVE_STATUSES.includes(nextStatus) &&
    (input.startTime !== undefined || input.endTime !== undefined || input.status !== undefined)

  try {
    return await prisma.$transaction(async (tx) => {
      if (needsOverlap) {
        await assertNoOverlap({
          tenantId,
          startTime: nextStart,
          endTime: nextEnd,
          excludeId: id,
          tx,
        })
      }
      return tx.appointment.update({
        where: { id },
        data: {
          ...(input.serviceId !== undefined ? { serviceId: input.serviceId } : {}),
          ...(input.customerName !== undefined ? { customerName: input.customerName } : {}),
          ...(input.customerPhone !== undefined ? { customerPhone: input.customerPhone } : {}),
          ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
          ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
          ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
        include: appointmentInclude,
      })
    })
  } catch (e) {
    if (e instanceof HttpError) throw e
    if (isOverlapDbError(e)) throw new HttpError(409, 'El horario se solapa con otra cita')
    throw e
  }
}

export async function cancelAppointment(tenantId: string, id: string) {
  return updateAppointment(tenantId, id, { status: 'CANCELLED' })
}
