export interface InboundTextMessage {
  tenantPhoneNumberId: string
  customerPhone: string
  messageText: string
  messageId: string
}

export interface InteractiveButton {
  id: string
  title: string
}

export interface WhatsappGraphMessage {
  id: string
}

export interface WhatsappGraphSendResponse {
  messaging_product: string
  contacts?: ReadonlyArray<{ input: string; wa_id: string }>
  messages: WhatsappGraphMessage[]
}

export interface WhatsappGraphErrorBody {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
    fbtrace_id?: string
  }
}

interface WhatsappMetadata {
  display_phone_number?: string
  phone_number_id?: string
}

interface WhatsappTextBody {
  body?: string
}

interface WhatsappInboundMessage {
  from?: string
  id?: string
  type?: string
  text?: WhatsappTextBody
}

interface WhatsappChangeValue {
  metadata?: WhatsappMetadata
  messages?: WhatsappInboundMessage[]
  statuses?: unknown[]
}

interface WhatsappChange {
  field?: string
  value?: WhatsappChangeValue
}

interface WhatsappEntry {
  id?: string
  changes?: WhatsappChange[]
}

export interface WhatsappWebhookPayload {
  object?: string
  entry?: WhatsappEntry[]
}

export type InboundMessageHandler = (message: InboundTextMessage) => void | Promise<void>
