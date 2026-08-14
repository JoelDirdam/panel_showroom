import { z } from 'zod'

export const upsertWhatsappConfigSchema = z.object({
  phoneNumberId: z.string().max(64),
  wabaId: z.string().max(64),
  accessToken: z.string().max(4096),
  webhookVerifyToken: z.string().max(256),
  systemPrompt: z.string().max(20000),
  isActive: z.boolean(),
})

export const patchWhatsappConfigSchema = upsertWhatsappConfigSchema.partial()

export type UpsertWhatsappConfigInput = z.infer<typeof upsertWhatsappConfigSchema>
export type PatchWhatsappConfigInput = z.infer<typeof patchWhatsappConfigSchema>
