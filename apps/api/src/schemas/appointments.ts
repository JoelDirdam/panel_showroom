import { z } from 'zod'

export const appointmentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'])

function refineRange(
  val: { startTime?: Date; endTime?: Date },
  ctx: z.RefinementCtx,
) {
  if (val.startTime && val.endTime && val.endTime <= val.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endTime debe ser posterior a startTime',
      path: ['endTime'],
    })
  }
}

export const createAppointmentSchema = z
  .object({
    serviceId: z.string().min(1).optional().nullable(),
    customerName: z.string().trim().min(1).max(200),
    customerPhone: z.string().trim().min(5).max(30),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    notes: z.string().max(1000).optional().nullable(),
    status: appointmentStatusSchema.optional(),
  })
  .superRefine(refineRange)

export const updateAppointmentSchema = z
  .object({
    serviceId: z.string().min(1).optional().nullable(),
    customerName: z.string().trim().min(1).max(200).optional(),
    customerPhone: z.string().trim().min(5).max(30).optional(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    notes: z.string().max(1000).optional().nullable(),
    status: appointmentStatusSchema.optional(),
  })
  .superRefine(refineRange)

export const listAppointmentsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: appointmentStatusSchema.optional(),
})

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
