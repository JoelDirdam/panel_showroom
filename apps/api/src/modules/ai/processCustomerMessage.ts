import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { prisma } from '../../lib/prisma.js'
import { ensurePrincipalSucursal } from '../../lib/sucursal.js'
import { listBusinessHours } from '../../services/businessHours.service.js'
import { listServices } from '../../services/services.service.js'
import { findActiveConfigByTenantId, sendTextMessage } from '../whatsapp/whatsapp.service.js'
import { runConversationLlm, createOpenAiClient } from './llm.js'
import { buildSystemPrompt } from './prompt.js'
import { normalizeCustomerPhone, sanitizeIncomingMessage, sanitizeOutgoingMessage } from './sanitize.js'
import type { AiRuntimeContext } from './types.js'
import { FALLBACK_CUSTOMER_MESSAGE } from './types.js'

const HISTORY_LIMIT = 16
const DEFAULT_TIMEZONE = 'America/Mexico_City'

async function loadTimezone(tenantId: string): Promise<string> {
  const settings = await prisma.agendaSettings.findUnique({
    where: { tenantId },
    select: { timezone: true },
  })
  return settings?.timezone?.trim() || DEFAULT_TIMEZONE
}

function toHistory(
  messages: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>,
): ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role === 'USER' ? 'user' : 'assistant',
    content: m.content,
  }))
}

export async function processCustomerMessage(
  tenantId: string,
  customerPhone: string,
  userMessage: string,
): Promise<void> {
  const phone = normalizeCustomerPhone(customerPhone)
  const text = sanitizeIncomingMessage(userMessage)
  if (!tenantId || !phone || !text) return

  try {
    const conversation = await prisma.conversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone: phone } },
      create: { tenantId, customerPhone: phone },
      update: {},
    })

    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: text,
      },
    })

    if (!conversation.aiEnabled) return

    const [tenant, sucursales, services, businessHours, waConfig, timezone, recent] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      ensurePrincipalSucursal(tenantId),
      listServices(tenantId, false),
      listBusinessHours(tenantId),
      findActiveConfigByTenantId(tenantId),
      loadTimezone(tenantId),
      prisma.conversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_LIMIT,
        select: { role: true, content: true },
      }),
    ])

    const tenantName = tenant?.name?.trim() || 'el negocio'
    const sucursalMode: AiRuntimeContext['sucursalMode'] = sucursales.length > 1 ? 'multi' : 'single'
    let selectedSucursalId = conversation.selectedSucursalId
    if (sucursalMode === 'single' && sucursales[0] && selectedSucursalId !== sucursales[0].id) {
      selectedSucursalId = sucursales[0].id
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { selectedSucursalId },
      })
    } else if (selectedSucursalId && !sucursales.some((s) => s.id === selectedSucursalId)) {
      selectedSucursalId = null
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { selectedSucursalId: null },
      })
    }

    const ctx: AiRuntimeContext = {
      tenantId,
      tenantName,
      customerPhone: phone,
      conversationId: conversation.id,
      sucursalMode,
      sucursales,
      selectedSucursalId,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price.toString(),
      })),
      businessHours: businessHours.map((h) => ({
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        isClosed: h.isClosed,
      })),
      timezone,
      extraBusinessPrompt: waConfig?.systemPrompt ?? '',
    }

    const history = toHistory([...recent].reverse().slice(0, -1))
    const systemPrompt = buildSystemPrompt(ctx)

    let reply = FALLBACK_CUSTOMER_MESSAGE
    const client = createOpenAiClient()
    if (!client) {
      console.error('[ai] OPENAI_API_KEY is not set; sending fallback')
    } else {
      try {
        reply = await runConversationLlm({
          client,
          systemPrompt,
          history,
          userMessage: text,
          ctx,
        })
      } catch (err) {
        console.error('[ai] LLM call failed', err)
        reply = FALLBACK_CUSTOMER_MESSAGE
      }
    }

    const outgoing = sanitizeOutgoingMessage(reply) || FALLBACK_CUSTOMER_MESSAGE

    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: outgoing,
      },
    })

    if (!waConfig?.accessToken || !waConfig.phoneNumberId) {
      console.error('[ai] WhatsApp credentials missing; reply stored but not sent', {
        tenantId,
        conversationId: conversation.id,
      })
      return
    }

    try {
      await sendTextMessage(phone, outgoing, waConfig.accessToken, waConfig.phoneNumberId)
    } catch (err) {
      console.error('[ai] sendTextMessage failed', err)
    }
  } catch (err) {
    console.error('[ai] processCustomerMessage failed', err)
  }
}
