import type { InboundButtonReply, InboundTextMessage, WhatsappWebhookPayload } from './types.js'

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function tenantPhoneNumberIdFromMetadata(metadata: unknown): string {
  const record = asRecord(metadata)
  if (!record) return ''
  return asString(record.phone_number_id) || asString(record.display_phone_number)
}

/**
 * Extrae solo mensajes de texto de usuario. Ignora statuses, echoes y tipos no-texto.
 */
export function parseInboundTextMessages(payload: unknown): InboundTextMessage[] {
  const root = asRecord(payload) as WhatsappWebhookPayload | null
  if (!root) return []

  const extracted: InboundTextMessage[] = []

  for (const entry of asArray(root.entry)) {
    const entryRecord = asRecord(entry)
    if (!entryRecord) continue

    for (const change of asArray(entryRecord.changes)) {
      const changeRecord = asRecord(change)
      if (!changeRecord) continue

      const value = asRecord(changeRecord.value)
      if (!value) continue

      const tenantPhoneNumberId = tenantPhoneNumberIdFromMetadata(value.metadata)
      if (!tenantPhoneNumberId) continue

      for (const message of asArray(value.messages)) {
        const msg = asRecord(message)
        if (!msg) continue
        if (asString(msg.type) !== 'text') continue

        const customerPhone = asString(msg.from)
        const messageId = asString(msg.id)
        const text = asRecord(msg.text)
        const messageText = asString(text?.body)

        if (!customerPhone || !messageId || !messageText) continue

        extracted.push({
          tenantPhoneNumberId,
          customerPhone,
          messageText,
          messageId,
        })
      }
    }
  }

  return extracted
}

/**
 * Extrae las respuestas con botón: botones de plantilla (type "button", con payload)
 * y botones interactivos (type "interactive" -> button_reply.id).
 */
export function parseInboundButtonReplies(payload: unknown): InboundButtonReply[] {
  const root = asRecord(payload) as WhatsappWebhookPayload | null
  if (!root) return []
  const out: InboundButtonReply[] = []
  for (const entry of asArray(root.entry)) {
    for (const change of asArray(asRecord(entry)?.changes)) {
      const value = asRecord(asRecord(change)?.value)
      if (!value) continue
      const tenantPhoneNumberId = tenantPhoneNumberIdFromMetadata(value.metadata)
      if (!tenantPhoneNumberId) continue
      for (const message of asArray(value.messages)) {
        const msg = asRecord(message)
        if (!msg) continue
        const type = asString(msg.type)
        let buttonPayload = ''
        let text = ''
        if (type === 'button') {
          const button = asRecord(msg.button)
          buttonPayload = asString(button?.payload)
          text = asString(button?.text)
        } else if (type === 'interactive') {
          const reply = asRecord(asRecord(msg.interactive)?.button_reply)
          buttonPayload = asString(reply?.id)
          text = asString(reply?.title)
        }
        const customerPhone = asString(msg.from)
        const messageId = asString(msg.id)
        if (!buttonPayload || !customerPhone || !messageId) continue
        out.push({ tenantPhoneNumberId, customerPhone, messageId, payload: buttonPayload, text })
      }
    }
  }
  return out
}
