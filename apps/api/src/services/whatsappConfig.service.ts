import { prisma } from '../lib/prisma.js'
import type { PatchWhatsappConfigInput, UpsertWhatsappConfigInput } from '../schemas/whatsappConfig.js'

function maskSecret(value: string): string {
  if (!value) return ''
  if (value.length <= 4) return '****'
  return `****${value.slice(-4)}`
}

function resolveSecret(incoming: string | undefined, current: string): string | undefined {
  if (incoming === undefined) return undefined
  if (!incoming || incoming.startsWith('****')) return current
  return incoming
}

function toPublic(config: {
  id: string
  tenantId: string
  phoneNumberId: string
  wabaId: string
  accessToken: string
  webhookVerifyToken: string
  systemPrompt: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...config,
    accessToken: maskSecret(config.accessToken),
    webhookVerifyToken: maskSecret(config.webhookVerifyToken),
  }
}

export async function getWhatsappConfig(tenantId: string) {
  const config = await prisma.whatsappConfig.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  })
  return toPublic(config)
}

export async function upsertWhatsappConfig(tenantId: string, input: UpsertWhatsappConfigInput) {
  const current = await prisma.whatsappConfig.findUnique({ where: { tenantId } })
  const config = await prisma.whatsappConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessToken: resolveSecret(input.accessToken, '') ?? '',
      webhookVerifyToken: resolveSecret(input.webhookVerifyToken, '') ?? '',
      systemPrompt: input.systemPrompt,
      isActive: input.isActive,
    },
    update: {
      phoneNumberId: input.phoneNumberId,
      wabaId: input.wabaId,
      accessToken: resolveSecret(input.accessToken, current?.accessToken ?? '') ?? current?.accessToken ?? '',
      webhookVerifyToken:
        resolveSecret(input.webhookVerifyToken, current?.webhookVerifyToken ?? '') ??
        current?.webhookVerifyToken ??
        '',
      systemPrompt: input.systemPrompt,
      isActive: input.isActive,
    },
  })
  return toPublic(config)
}

export async function patchWhatsappConfig(tenantId: string, input: PatchWhatsappConfigInput) {
  const current = await prisma.whatsappConfig.upsert({
    where: { tenantId },
    create: { tenantId },
    update: {},
  })
  const config = await prisma.whatsappConfig.update({
    where: { tenantId },
    data: {
      ...(input.phoneNumberId !== undefined ? { phoneNumberId: input.phoneNumberId } : {}),
      ...(input.wabaId !== undefined ? { wabaId: input.wabaId } : {}),
      ...(input.accessToken !== undefined
        ? { accessToken: resolveSecret(input.accessToken, current.accessToken) ?? current.accessToken }
        : {}),
      ...(input.webhookVerifyToken !== undefined
        ? {
            webhookVerifyToken:
              resolveSecret(input.webhookVerifyToken, current.webhookVerifyToken) ?? current.webhookVerifyToken,
          }
        : {}),
      ...(input.systemPrompt !== undefined ? { systemPrompt: input.systemPrompt } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  })
  return toPublic(config)
}
