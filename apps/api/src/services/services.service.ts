import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { HttpError } from '../lib/httpError.js'
import type { CreateServiceInput, UpdateServiceInput } from '../schemas/services.js'

export async function listServices(tenantId: string, includeInactive: boolean) {
  return prisma.service.findMany({
    where: {
      tenantId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: 'asc' },
  })
}

export async function getService(tenantId: string, id: string) {
  const service = await prisma.service.findFirst({ where: { id, tenantId } })
  if (!service) throw new HttpError(404, 'Servicio no encontrado')
  return service
}

export async function createService(tenantId: string, input: CreateServiceInput) {
  return prisma.service.create({
    data: {
      tenantId,
      name: input.name,
      durationMinutes: input.durationMinutes,
      price: new Prisma.Decimal(input.price.toFixed(2)),
      isActive: input.isActive ?? true,
    },
  })
}

export async function updateService(tenantId: string, id: string, input: UpdateServiceInput) {
  await getService(tenantId, id)
  return prisma.service.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.price !== undefined ? { price: new Prisma.Decimal(input.price.toFixed(2)) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })
}

export async function deleteService(tenantId: string, id: string) {
  await getService(tenantId, id)
  const futureLinked = await prisma.appointment.count({
    where: {
      tenantId,
      serviceId: id,
      startTime: { gte: new Date() },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  })
  if (futureLinked > 0) {
    return prisma.service.update({
      where: { id },
      data: { isActive: false },
    })
  }
  await prisma.service.delete({ where: { id } })
  return null
}
