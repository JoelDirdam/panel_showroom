import { z } from 'zod'

export const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Hora inválida (HH:mm)')

const businessHourFields = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  openTime: hhmmSchema,
  closeTime: hhmmSchema,
  isClosed: z.boolean(),
  /** Descanso opcional (ej. comida). Ambos o ninguno; null lo quita. */
  breakStart: hhmmSchema.nullable().optional(),
  breakEnd: hhmmSchema.nullable().optional(),
})

function refineHours(
  val: {
    isClosed: boolean
    openTime: string
    closeTime: string
    breakStart?: string | null
    breakEnd?: string | null
  },
  ctx: z.RefinementCtx,
) {
  if (!val.isClosed && val.closeTime <= val.openTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'closeTime debe ser posterior a openTime',
      path: ['closeTime'],
    })
  }
  const hasStart = !!val.breakStart
  const hasEnd = !!val.breakEnd
  if (hasStart !== hasEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'El descanso necesita hora de inicio y de fin',
      path: ['breakEnd'],
    })
  } else if (!val.isClosed && hasStart && hasEnd) {
    if (!(val.openTime < val.breakStart! && val.breakStart! < val.breakEnd! && val.breakEnd! < val.closeTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El descanso debe quedar dentro del horario y terminar después de empezar',
        path: ['breakStart'],
      })
    }
  }
}

export const businessHourSchema = businessHourFields.superRefine(refineHours)

export const updateBusinessHourSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    openTime: hhmmSchema.optional(),
    closeTime: hhmmSchema.optional(),
    isClosed: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.isClosed === false && val.openTime && val.closeTime && val.closeTime <= val.openTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'closeTime debe ser posterior a openTime',
        path: ['closeTime'],
      })
    }
  })

export const weekBusinessHoursSchema = z
  .array(businessHourSchema)
  .length(7)
  .superRefine((days, ctx) => {
    const set = new Set(days.map((d) => d.dayOfWeek))
    if (set.size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe incluir los 7 días de la semana (0-6) sin repetir',
      })
    }
  })

export type BusinessHourInput = z.infer<typeof businessHourSchema>
export type UpdateBusinessHourInput = z.infer<typeof updateBusinessHourSchema>
