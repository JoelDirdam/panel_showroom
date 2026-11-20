import { prisma } from '../lib/prisma.js'
import { appUrl } from '../lib/stripe.js'
import { sendTextMessage } from '../modules/whatsapp/index.js'
import { normalizeWhatsappPhone, platformCredentials } from './appointmentReminders.service.js'

/**
 * Respuestas de los clientes al recordatorio de cita por WhatsApp.
 *
 * El recordatorio con botones lleva en cada botón un payload `APPT_<ACCIÓN>:<idCita>`:
 * - CONFIRM     -> la cita queda Confirmada.
 * - CANCEL      -> la cita queda Cancelada y se libera el horario.
 * - RESCHEDULE  -> se cancela la cita y se manda el link para elegir otro horario.
 *
 * Los mensajes de texto al número de COSDI (que solo envía recordatorios) reciben una
 * respuesta automática con el contacto del negocio, en lugar de perderse.
 */

export type ReplyAction = 'CONFIRM' | 'CANCEL' | 'RESCHEDULE'

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const PAYLOAD_RE = /^APPT_(CONFIRM|CANCEL|RESCHEDULE):([A-Za-z0-9_-]{10,40})$/

export function buttonPayload(action: ReplyAction, appointmentId: string): string {
  return `APPT_${action}:${appointmentId}`
}

export function parseButtonPayload(payload: string): { action: ReplyAction; appointmentId: string } | null {
  const m = PAYLOAD_RE.exec(payload.trim())
  return m ? { action: m[1] as ReplyAction, appointmentId: m[2] } : null
}

function bookingLink(slug: string): string {
  return `${appUrl()}/reservar/${encodeURIComponent(slug)}`
}

function formatWhen(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('es-MX', { timeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  const time = new Intl.DateTimeFormat('es-MX', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
  return `${day} a las ${time}`
}

/** Credenciales para contestar desde el mismo número que recibió el mensaje. */
async function credentialsFor(phoneNumberId: string): Promise<{ phoneNumberId: string; token: string } | null> {
  const platform = platformCredentials()
  if (platform && platform.phoneNumberId === phoneNumberId) return platform
  const config = await prisma.whatsappConfig.findFirst({
    where: { phoneNumberId, isActive: true },
    select: { phoneNumberId: true, accessToken: true },
  })
  return config?.accessToken ? { phoneNumberId: config.phoneNumberId, token: config.accessToken } : null
}

async function reply(phoneNumberId: string, to: string, text: string): Promise<void> {
  const creds = await credentialsFor(phoneNumberId)
  if (!creds) {
    console.warn('[appointment-replies] sin credenciales para contestar', { phoneNumberId })
    return
  }
  try {
    await sendTextMessage(to, text, creds.token, creds.phoneNumberId)
  } catch (err) {
    console.error('[appointment-replies] no se pudo contestar', err instanceof Error ? err.message : err)
  }
}

export interface ButtonReplyInput {
  tenantPhoneNumberId: string
  customerPhone: string
  payload: string
}

/** Aplica la respuesta del cliente a su cita y le contesta. Devuelve la acción aplicada. */
export async function handleAppointmentButtonReply(input: ButtonReplyInput): Promise<ReplyAction | null> {
  const parsed = parseButtonPayload(input.payload)
  if (!parsed) return null

  const appt = await prisma.appointment.findUnique({
    where: { id: parsed.appointmentId },
    include: {
      tenant: { select: { name: true, slug: true, active: true } },
      service: { select: { name: true } },
    },
  })
  // Solo el cliente de la cita puede responder por ella.
  const from = normalizeWhatsappPhone(input.customerPhone)
  if (!appt || !from || normalizeWhatsappPhone(appt.customerPhone) !== from) {
    console.warn('[appointment-replies] respuesta que no corresponde a una cita', { appointmentId: parsed.appointmentId })
    return null
  }

  const settings = await prisma.agendaSettings.findUnique({ where: { tenantId: appt.tenantId }, select: { timezone: true } })
  const when = formatWhen(appt.startTime, settings?.timezone?.trim() || DEFAULT_TIMEZONE)
  const link = bookingLink(appt.tenant.slug)
  const name = appt.customerName.trim().split(/\s+/)[0] || ''

  const active = (appt.status === 'PENDING' || appt.status === 'CONFIRMED') && appt.startTime > new Date()
  if (!active) {
    const already =
      appt.status === 'CANCELLED'
        ? `Tu cita del ${when} en ${appt.tenant.name} ya estaba cancelada.`
        : `Tu cita del ${when} en ${appt.tenant.name} ya no está activa.`
    await reply(input.tenantPhoneNumberId, from, `${already} Si quieres agendar otra, entra aquí: ${link}`)
    return null
  }

  const now = new Date()
  if (parsed.action === 'CONFIRM') {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: 'CONFIRMED', customerReply: 'CONFIRM', customerRepliedAt: now },
    })
    await reply(
      input.tenantPhoneNumberId,
      from,
      `¡Gracias${name ? `, ${name}` : ''}! Tu cita en ${appt.tenant.name} quedó confirmada para el ${when}. Te esperamos.`,
    )
  } else {
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { status: 'CANCELLED', customerReply: parsed.action, customerRepliedAt: now },
    })
    const text =
      parsed.action === 'CANCEL'
        ? `Listo, cancelamos tu cita del ${when} en ${appt.tenant.name}. Gracias por avisar: así otra persona puede usar ese horario. Si quieres agendar de nuevo: ${link}`
        : `Listo, liberamos tu horario del ${when} en ${appt.tenant.name}. Elige tu nuevo día y hora aquí: ${link}`
    await reply(input.tenantPhoneNumberId, from, text)
  }
  return parsed.action
}

/**
 * Texto libre enviado al número de COSDI: ese número solo manda recordatorios, así que
 * se contesta con el negocio de su cita más reciente para que no se pierda el mensaje.
 */
const lastAutoReply = new Map<string, number>()
const AUTO_REPLY_EVERY_MS = 12 * 60 * 60 * 1000

export async function handlePlatformTextMessage(input: { tenantPhoneNumberId: string; customerPhone: string }): Promise<void> {
  const from = normalizeWhatsappPhone(input.customerPhone)
  if (!from) return
  // Una respuesta automática por número cada 12 h: no contestar cada mensaje.
  const last = lastAutoReply.get(from)
  if (last && Date.now() - last < AUTO_REPLY_EVERY_MS) return
  lastAutoReply.set(from, Date.now())
  if (lastAutoReply.size > 5000) lastAutoReply.clear()
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const recent = await prisma.appointment.findMany({
    where: { reminderSentAt: { gte: since } },
    orderBy: { reminderSentAt: 'desc' },
    take: 500,
    select: { customerPhone: true, tenant: { select: { name: true, slug: true } } },
  })
  const match = recent.find((a) => normalizeWhatsappPhone(a.customerPhone) === from)
  const text = match
    ? `Hola, este número solo envía recordatorios de cita de ${match.tenant.name}. Para confirmar, cancelar o cambiar tu cita usa los botones del recordatorio, o agenda aquí: ${bookingLink(match.tenant.slug)}`
    : 'Hola, este número solo envía recordatorios de cita. Para cualquier cambio, comunícate directamente con el negocio donde agendaste.'
  await reply(input.tenantPhoneNumberId, from, text)
}
