import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  price: z.coerce.number().nonnegative(),
  isActive: z.boolean().optional(),
})

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  price: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
