import { prisma } from '../lib/prisma.js'
import { sendTemplateMessage } from '../modules/whatsapp/index.js'
import { buttonPayload } from './appointmentReplies.service.js'

/**
 * Recordatorios de cita por WhatsApp.
 *
 * Variables de entorno:
 * - WHATSAPP_REMINDERS_ENABLED=true        activa el programador (por defecto apagado)
 * - WHATSAPP_REMINDER_TEMPLATE             nombre de la plantilla aprobada (def. recordatorio_cita)
 * - WHATSAPP_REMINDER_LANG                 idioma de la plantilla (def. es_MX)
 * - WHATSAPP_REMINDER_HOURS_BEFORE         horas de anticipación (def. 24)
 * - WHATSAPP_REMINDER_BUTTONS=true         usa la plantilla con botones (Sí asistiré / Cancelar cita /
 *                                          Cambiar día) en el número de COSDI. Activar solo cuando Meta
 *                                          la apruebe.
 * - WHATSAPP_REMINDER_BUTTONS_TEMPLATE     nombre de esa plantilla (def. recordatorio_cita_botones)
 * - WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN
 *       número y token de la plataforma COSDI, usados cuando el negocio no tiene
 *       su propia configuración activa (modo piloto).
 *
 * Plantilla esperada (cuerpo con 4 variables):
 *   "Hola {{1}}, te recordamos tu cita en {{2}} ({{3}}) el {{4}}. Si necesitas cambiarla, responde a este mensaje."
 */

const DEFAULT_TIMEZONE = 'America/Mexico_City'
const MAX_ATTEMPTS = 3
const TICK_MS = 5 * 60 * 1000
const BATCH_SIZE = 50

function envString(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback
}

export function remindersEnabled(): boolean {
  return process.env.WHATSAPP_REMINDERS_ENABLED?.trim().toLowerCase() === 'true'
}

/** Normaliza a formato internacional sin "+" (México: 10 dígitos -> 52 + número). */
export function normalizeWhatsappPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `52${digits}`
  if (digits.length === 12 && digits.startsWith('52')) return digits
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

function formatWhen(date: Date, timeZone: string): string {
  const day = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
  const time = new Intl.DateTimeFormat('es-MX', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
  return `${day} a las ${time}`
}

/** Plantilla con botones (solo número de COSDI): cuerpo con las mismas 4 variables + 3 respuestas rápidas. */
export function buttonsTemplate(): { name: string; language: string } | null {
  if (process.env.WHATSAPP_REMINDER_BUTTONS?.trim().toLowerCase() !== 'true') return null
  return {
    name: envString('WHATSAPP_REMINDER_BUTTONS_TEMPLATE', 'recordatorio_cita_botones'),
    language: envString('WHATSAPP_REMINDER_LANG', 'es_MX'),
  }
}

export function reminderTemplate(): { name: string; language: string } {
  return {
    name: envString('WHATSAPP_REMINDER_TEMPLATE', 'recordatorio_cita'),
    language: envString('WHATSAPP_REMINDER_LANG', 'es_MX'),
  }
}

export function platformCredentials(): { phoneNumberId: string; token: string } | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? ''
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() ?? ''
  return phoneNumberId && token ? { phoneNumberId, token } : null
}

export async function runReminderTick(now: Date = new Date()): Promise<number> {
  const hoursBefore = Number(envString('WHATSAPP_REMINDER_HOURS_BEFORE', '24')) || 24
  const templateName = envString('WHATSAPP_REMINDER_TEMPLATE', 'recordatorio_cita')
  const languageCode = envString('WHATSAPP_REMINDER_LANG', 'es_MX')
  const horizon = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000)

  const due = await prisma.appointment.findMany({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      reminderSentAt: null,
      reminderAttempts: { lt: MAX_ATTEMPTS },
      startTime: { gt: now, lte: horizon },
      tenant: {
        active: true,
        // Cuenta pausada o cancelada: no se envían recordatorios.
        OR: [{ subscription: null }, { subscription: { status: { in: ['TRIALING', 'ACTIVE'] } } }],
      },
    },
    include: {
      tenant: { select: { id: true, name: true } },
      service: { select: { name: true } },
    },
    orderBy: { startTime: 'asc' },
    take: BATCH_SIZE,
  })

  if (due.length === 0) return 0

  const platform = platformCredentials()
  let sent = 0

  for (const appt of due) {
    const to = normalizeWhatsappPhone(appt.customerPhone)
    if (!to) {
      // Teléfono inválido: no tiene caso reintentar.
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderAttempts: MAX_ATTEMPTS },
      })
      continue
    }

    const tenantConfig = await prisma.whatsappConfig.findFirst({
      where: { tenantId: appt.tenantId, isActive: true },
      select: { phoneNumberId: true, accessToken: true, templateStatus: true },
    })
    const prefs = await prisma.whatsappConfig.findUnique({
      where: { tenantId: appt.tenantId },
      select: { remindersEnabled: true },
    })
    if (prefs && !prefs.remindersEnabled) continue

    // Número propio solo si su plantilla ya fue aprobada por Meta; si no, sale del número de COSDI.
    // ('' = configuración anterior a este control: se respeta como antes.)
    const ownReady =
      Boolean(tenantConfig?.phoneNumberId && tenantConfig.accessToken) &&
      (tenantConfig!.templateStatus === 'APPROVED' || tenantConfig!.templateStatus === '')
    const creds = ownReady
      ? { phoneNumberId: tenantConfig!.phoneNumberId, token: tenantConfig!.accessToken }
      : platform
    if (!creds) continue

    const settings = await prisma.agendaSettings.findUnique({
      where: { tenantId: appt.tenantId },
      select: { timezone: true },
    })
    const timeZone = settings?.timezone?.trim() || DEFAULT_TIMEZONE

    // Botones solo desde el número de COSDI (los números propios usan su plantilla aprobada).
    const withButtons = ownReady ? null : buttonsTemplate()

    try {
      const sentMsg = await sendTemplateMessage(
        {
          to,
          templateName: withButtons?.name ?? templateName,
          languageCode: withButtons?.language ?? languageCode,
          ...(withButtons
            ? {
                quickReplyPayloads: [
                  buttonPayload('CONFIRM', appt.id),
                  buttonPayload('CANCEL', appt.id),
                  buttonPayload('RESCHEDULE', appt.id),
                ],
              }
            : {}),
          bodyParams: [
            appt.customerName.trim() || 'cliente',
            appt.tenant.name,
            appt.service?.name ?? 'tu cita',
            formatWhen(appt.startTime, timeZone),
          ],
        },
        creds.token,
        creds.phoneNumberId,
      )
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderSentAt: new Date(), reminderMessageId: sentMsg.messages?.[0]?.id ?? null },
      })
      sent += 1
    } catch (err) {
      console.error(
        '[reminders] fallo al enviar',
        { appointmentId: appt.id },
        err instanceof Error ? err.message : err,
      )
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { reminderAttempts: { increment: 1 } },
      })
    }
  }

  return sent
}

/** Estado del programador, para el panel de estado de la plataforma. */
export const reminderSchedulerStatus = {
  running: false,
  lastTickAt: null as Date | null,
  lastSent: 0,
  lastError: null as string | null,
}

export function startReminderScheduler(): void {
  if (!remindersEnabled()) {
    console.log('[reminders] desactivados (WHATSAPP_REMINDERS_ENABLED != true)')
    return
  }
  console.log('[reminders] programador activo')
  reminderSchedulerStatus.running = true
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const sent = await runReminderTick()
      reminderSchedulerStatus.lastSent = sent
      reminderSchedulerStatus.lastError = null
      if (sent > 0) console.log(`[reminders] enviados: ${sent}`)
    } catch (err) {
      reminderSchedulerStatus.lastError = err instanceof Error ? err.message : String(err)
      console.error('[reminders] tick falló', err)
    } finally {
      reminderSchedulerStatus.lastTickAt = new Date()
      running = false
    }
  }
  setTimeout(() => void tick(), 30_000)
  setInterval(() => void tick(), TICK_MS)
}
