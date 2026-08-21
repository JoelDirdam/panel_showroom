import { z } from 'zod'

export const toggleAiSchema = z.object({
  aiEnabled: z.boolean(),
})

export type ToggleAiInput = z.infer<typeof toggleAiSchema>
