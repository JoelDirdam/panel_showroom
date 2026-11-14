import axios, { isAxiosError } from 'axios'
import { HttpError } from '../lib/httpError.js'
import { prisma } from '../lib/prisma.js'
import { getFeatureFlags } from '../lib/entitlements.js'
import { sendTemplateMessage } from '../modules/whatsapp/index.js'
import {
  normalizeWhatsappPhone,
  platformCredentials,
  reminderTemplate,
  remindersEnabled,
} from './appointmentReminders.service.js'

const GRAPH = 'https://graph.facebook.com/v19.0'

/** Mismo texto que la plantilla aprobada en la cuenta de COSDI. */
const TEMPLATE_BODY =
  'Hola {{1}}, te recordamos tu cita en {{2}} ({{3}}) el *{{4}}*. Si necesitas cambiarla, responde a este mensaje.'
const TEMPLATE_EXAMPLE = ['María', 'Estética Luna', 'Corte de cabello', 'viernes 14 de noviembre a las 10:00 a.m']

function graphMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string; error_user_msg?: string } } | undefined
    return data?.error?.error_user_msg || data?.error?.message || fallback
  }
  return fallback
}

async function graphGet<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const { data } = await axios.get<T>(`${GRAPH}/${path}`, {
    timeout: 15_000,
    params,
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}

type TemplateRow = { name: string; status: string; language: string }

async function findTemplate(wabaId: string, token: string): Promise<TemplateRow | null> {
  const { name, language } = reminderTemplate()
  const res = await graphGet<{ data?: TemplateRow[] }>(
    `${encodeURIComponent(wabaId)}/message_templates`,
    token,
    { name, fields: 'name,status,language', limit: '20' },
  )
  const rows = (res.data ?? []).filter((t) => t.name === name)
  return rows.find((t) => t.language === language) ?? null
}

/** Busca la plantilla de recordatorio en la cuenta del negocio; si no existe, la solicita a Meta. */
async function ensureTemplate(wabaId: string, token: string): Promise<string> {
  const existing = await findTemplate(wabaId, token)
  if (existing) return existing.status
  const { name, language } = reminderTemplate()
  try {
    const { data } = await axios.post<{ status?: string }>(
      `${GRAPH}/${encodeURIComponent(wabaId)}/message_templates`,
      {
        name,
        language,
        category: 'UTILITY',
        components: [{ type: 'BODY', text: TEMPLATE_BODY, example: { body_text: [TEMPLATE_EXAMPLE] } }],
      },
      { timeout: 15_000, headers: { Authorization: `Bearer ${token}` } },
    )
    return data.status ?? 'PENDING'
  } catch (err) {
    throw new HttpError(400, `No se pudo crear la plantilla de recordatorio: ${graphMessage(err, 'error de Meta')}`)
  }
}

export async function getRemindersStatus(tenantId: string) {
  const config = await prisma.whatsappConfig.upsert({ where: { tenantId }, create: { tenantId }, update: {} })
  const ownConnected = Boolean(config.isActive && config.phoneNumberId && config.accessToken)
  const ownReady = ownConnected && config.templateStatus === 'APPROVED'
  const platformReady = Boolean(platformCredentials())
  const mode: 'own' | 'platform' | 'none' = ownReady ? 'own' : platformReady ? 'platform' : 'none'
  return {
    schedulerEnabled: remindersEnabled(),
    remindersEnabled: config.remindersEnabled,
    mode,
    hoursBefore: Number(process.env.WHATSAPP_REMINDER_HOURS_BEFORE?.trim()) || 24,
    own: {
      connected: ownConnected,
      phoneNumberId: config.phoneNumberId,
      wabaId: config.wabaId,
      displayPhoneNumber: config.displayPhoneNumber,
      verifiedName: config.verifiedName,
      templateStatus: config.templateStatus,
    },
  }
}

export async function connectOwnNumber(
  tenantId: string,
  input: { phoneNumberId: string; wabaId: string; accessToken: string },
) {
  const phoneNumberId = input.phoneNumberId.trim()
  const wabaId = input.wabaId.trim()
  const accessToken = input.accessToken.trim()

  const taken = await prisma.whatsappConfig.findFirst({
    where: { phoneNumberId, tenantId: { not: tenantId } },
    select: { id: true },
  })
  if (taken) throw new HttpError(409, 'Ese número ya está conectado a otro negocio')

  let phone: { display_phone_number?: string; verified_name?: string }
  try {
    phone = await graphGet(encodeURIComponent(phoneNumberId), accessToken, {
      fields: 'display_phone_number,verified_name',
    })
  } catch (err) {
    throw new HttpError(
      400,
      `Meta no reconoció el número o el token: ${graphMessage(err, 'revisa el identificador del número y el token')}`,
    )
  }

  let templateStatus: string
  try {
    templateStatus = await ensureTemplate(wabaId, accessToken)
  } catch (err) {
    if (err instanceof HttpError) throw err
    throw new HttpError(
      400,
      `No se pudo leer la cuenta de WhatsApp Business: ${graphMessage(err, 'revisa el identificador de la cuenta')}`,
    )
  }

  // Suscribe la app a la cuenta para recibir respuestas (necesario para Citas + IA). Best-effort.
  await axios
    .post(`${GRAPH}/${encodeURIComponent(wabaId)}/subscribed_apps`, null, {
      timeout: 15_000,
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    .catch(() => undefined)

  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId }, select: { planType: true } })
  const aiEnabled = getFeatureFlags(sub?.planType).includes('ai')

  const data = {
    phoneNumberId,
    wabaId,
    accessToken,
    isActive: true,
    aiEnabled,
    templateStatus,
    displayPhoneNumber: phone.display_phone_number ?? '',
    verifiedName: phone.verified_name ?? '',
  }
  await prisma.whatsappConfig.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  })
  return getRemindersStatus(tenantId)
}

export async function refreshTemplateStatus(tenantId: string) {
  const config = await prisma.whatsappConfig.findUnique({ where: { tenantId } })
  if (config?.isActive && config.wabaId && config.accessToken) {
    try {
      const row = await findTemplate(config.wabaId, config.accessToken)
      await prisma.whatsappConfig.update({
        where: { tenantId },
        data: { templateStatus: row?.status ?? '' },
      })
    } catch (err) {
      throw new HttpError(400, `No se pudo consultar a Meta: ${graphMessage(err, 'el token pudo haber vencido')}`)
    }
  }
  return getRemindersStatus(tenantId)
}

export async function disconnectOwnNumber(tenantId: string) {
  await prisma.whatsappConfig.updateMany({
    where: { tenantId },
    data: {
      isActive: false,
      phoneNumberId: '',
      wabaId: '',
      accessToken: '',
      templateStatus: '',
      displayPhoneNumber: '',
      verifiedName: '',
    },
  })
  return getRemindersStatus(tenantId)
}

export async function setRemindersEnabled(tenantId: string, enabled: boolean) {
  await prisma.whatsappConfig.upsert({
    where: { tenantId },
    create: { tenantId, remindersEnabled: enabled },
    update: { remindersEnabled: enabled },
  })
  return getRemindersStatus(tenantId)
}

/** Envía un recordatorio de ejemplo al teléfono indicado, con el mismo número que usarán los reales. */
export async function sendTestReminder(tenantId: string, rawPhone: string) {
  const to = normalizeWhatsappPhone(rawPhone)
  if (!to) throw new HttpError(400, 'Teléfono inválido. Usa 10 dígitos.')
  const [config, tenant] = await Promise.all([
    prisma.whatsappConfig.findUnique({ where: { tenantId } }),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } }),
  ])
  const own =
    config?.isActive && config.phoneNumberId && config.accessToken && config.templateStatus === 'APPROVED'
      ? { phoneNumberId: config.phoneNumberId, token: config.accessToken }
      : null
  const creds = own ?? platformCredentials()
  if (!creds) throw new HttpError(503, 'Los recordatorios por WhatsApp aún no están disponibles')
  const { name, language } = reminderTemplate()
  await sendTemplateMessage(
    {
      to,
      templateName: name,
      languageCode: language,
      bodyParams: ['cliente de prueba', tenant.name, 'Servicio de ejemplo', 'mañana a las 10:00 a.m.'],
    },
    creds.token,
    creds.phoneNumberId,
  )
  return { ok: true, sentFrom: own ? 'own' : 'platform' }
}
