import axios, { isAxiosError } from 'axios'
import { HttpError } from '../../lib/httpError.js'
import { prisma } from '../../lib/prisma.js'
import type {
  InteractiveButton,
  WhatsappGraphErrorBody,
  WhatsappGraphSendResponse,
} from './types.js'

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0'
const MAX_INTERACTIVE_BUTTONS = 3
const MAX_BUTTON_TITLE_LENGTH = 20

export async function findActiveConfigByPhoneNumberId(phoneNumberId: string) {
  if (!phoneNumberId) return null
  return prisma.whatsappConfig.findFirst({
    where: { phoneNumberId, isActive: true },
    select: {
      id: true,
      tenantId: true,
      phoneNumberId: true,
      accessToken: true,
      systemPrompt: true,
    },
  })
}

export async function findActiveConfigByTenantId(tenantId: string) {
  if (!tenantId) return null
  return prisma.whatsappConfig.findFirst({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      tenantId: true,
      phoneNumberId: true,
      accessToken: true,
      systemPrompt: true,
    },
  })
}

function graphErrorMessage(data: unknown): string {
  const body = data as WhatsappGraphErrorBody | undefined
  const message = body?.error?.message
  if (typeof message === 'string' && message.trim()) return message.trim()
  return 'Error al enviar mensaje a WhatsApp'
}

function toHttpError(err: unknown): HttpError {
  if (err instanceof HttpError) return err
  if (isAxiosError(err)) {
    const status = err.response?.status
    const safeStatus = status !== undefined && status >= 400 && status < 600 ? status : 502
    return new HttpError(safeStatus, graphErrorMessage(err.response?.data))
  }
  return new HttpError(502, 'Error al enviar mensaje a WhatsApp')
}

async function postMessage(
  phoneNumberId: string,
  tenantToken: string,
  body: Record<string, unknown>,
): Promise<WhatsappGraphSendResponse> {
  if (!phoneNumberId || !tenantToken) {
    throw new HttpError(400, 'Credenciales de WhatsApp incompletas')
  }

  try {
    const { data } = await axios.post<WhatsappGraphSendResponse>(
      `${GRAPH_API_BASE}/${encodeURIComponent(phoneNumberId)}/messages`,
      body,
      {
        timeout: 15_000,
        headers: {
          Authorization: `Bearer ${tenantToken}`,
          'Content-Type': 'application/json',
        },
      },
    )
    return data
  } catch (err) {
    throw toHttpError(err)
  }
}

export async function sendTextMessage(
  to: string,
  text: string,
  tenantToken: string,
  phoneNumberId: string,
): Promise<WhatsappGraphSendResponse> {
  if (!to || !text) {
    throw new HttpError(400, 'Destinatario y texto son obligatorios')
  }

  return postMessage(phoneNumberId, tenantToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  })
}

export async function sendInteractiveButtons(
  to: string,
  text: string,
  buttons: ReadonlyArray<InteractiveButton>,
  tenantToken: string,
  phoneNumberId: string,
): Promise<WhatsappGraphSendResponse> {
  if (!to || !text) {
    throw new HttpError(400, 'Destinatario y texto son obligatorios')
  }
  if (buttons.length < 1 || buttons.length > MAX_INTERACTIVE_BUTTONS) {
    throw new HttpError(400, 'WhatsApp permite entre 1 y 3 botones interactivos')
  }

  const replyButtons = buttons.map((button, index) => {
    const id = button.id.trim()
    const title = button.title.trim()
    if (!id) {
      throw new HttpError(400, `El botón ${index + 1} no tiene id`)
    }
    if (!title || title.length > MAX_BUTTON_TITLE_LENGTH) {
      throw new HttpError(
        400,
        `El título del botón debe tener entre 1 y ${MAX_BUTTON_TITLE_LENGTH} caracteres`,
      )
    }
    return {
      type: 'reply' as const,
      reply: { id, title },
    }
  })

  return postMessage(phoneNumberId, tenantToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text },
      action: { buttons: replyButtons },
    },
  })
}
