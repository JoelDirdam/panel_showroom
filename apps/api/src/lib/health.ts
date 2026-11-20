import { prisma } from './prisma.js'
import { getStripe, isStripeConfigured, priceIdForPlan } from './stripe.js'
import { remindersEnabled, reminderSchedulerStatus } from '../services/appointmentReminders.service.js'
import { complianceSchedulerStatus } from '../services/compliance.service.js'

/**
 * Estado de salud de la plataforma para el panel del SUPER_ADMIN.
 * Cada revisión es independiente: si una falla o tarda, las demás se muestran.
 * No devuelve secretos, solo si están configurados.
 */

export type CheckStatus = 'ok' | 'warn' | 'error' | 'off'

export interface HealthCheck {
  key: string
  group: string
  label: string
  status: CheckStatus
  detail: string
}

const TIMEOUT_MS = 6000
const REQUIRED_STRIPE_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
]

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label}: sin respuesta en ${TIMEOUT_MS / 1000} s`)), TIMEOUT_MS)),
  ])
}

const env = (name: string): string => process.env[name]?.trim() ?? ''
const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' }).format(d) : 'nunca'

async function checkDatabase(): Promise<HealthCheck> {
  const started = Date.now()
  await prisma.$queryRaw`SELECT 1`
  const ms = Date.now() - started
  return {
    key: 'db',
    group: 'Infraestructura',
    label: 'Base de datos',
    status: ms > 1000 ? 'warn' : 'ok',
    detail: `Responde en ${ms} ms`,
  }
}

async function checkEmail(): Promise<HealthCheck> {
  const base = { key: 'email', group: 'Correo', label: 'Envío de correo (Resend)' }
  const key = env('RESEND_API_KEY')
  const from = env('EMAIL_FROM')
  if (!key || !from) {
    return {
      ...base,
      status: process.env.NODE_ENV === 'production' && env('RAILWAY_ENVIRONMENT_NAME') === 'production' ? 'error' : 'off',
      detail: 'Sin RESEND_API_KEY / EMAIL_FROM: no se envían códigos, avisos de cobro ni de conservación.',
    }
  }
  const domain = /@([^>\s]+)>?\s*$/.exec(from)?.[1]?.toLowerCase() ?? ''
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (res.status === 401 || res.status === 403) {
    return {
      ...base,
      status: 'ok',
      detail: `Configurado (remitente ${domain || from}). La clave es solo de envío, así que no se puede consultar el estado del dominio.`,
    }
  }
  if (!res.ok) return { ...base, status: 'warn', detail: `Resend respondió ${res.status} al consultar dominios.` }
  const body = (await res.json()) as { data?: { name: string; status: string }[] }
  const match = body.data?.find((d) => d.name.toLowerCase() === domain)
  if (!match) return { ...base, status: 'error', detail: `El dominio ${domain} no está dado de alta en Resend.` }
  return {
    ...base,
    status: match.status === 'verified' ? 'ok' : 'error',
    detail: match.status === 'verified' ? `Dominio ${domain} verificado.` : `Dominio ${domain} en estado "${match.status}".`,
  }
}

async function checkStripe(): Promise<HealthCheck[]> {
  const group = 'Cobros'
  if (!isStripeConfigured()) {
    return [{ key: 'stripe', group, label: 'Stripe', status: 'off', detail: 'Sin STRIPE_SECRET_KEY: el cobro con tarjeta está apagado.' }]
  }
  const stripe = getStripe()
  const mode = env('STRIPE_SECRET_KEY').startsWith('sk_live') ? 'real' : 'de prueba'
  const checks: HealthCheck[] = []

  const account = await withTimeout(stripe.accounts.retrieveCurrent(), 'Stripe')
  checks.push({
    key: 'stripe',
    group,
    label: 'Cuenta de Stripe',
    status: account.charges_enabled ? 'ok' : 'error',
    detail: account.charges_enabled
      ? `Modo ${mode}. Cobros habilitados.`
      : `Modo ${mode}. La cuenta NO tiene los cobros habilitados (revisa el panel de Stripe).`,
  })

  const endpoints = await withTimeout(stripe.webhookEndpoints.list({ limit: 100 }), 'Stripe')
  const ownHosts = [env('API_PUBLIC_URL'), env('RAILWAY_PUBLIC_DOMAIN'), env('RAILWAY_SERVICE_API_URL')]
    .filter(Boolean)
    .map((h) => h.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase())
  const candidates = endpoints.data.filter((e) => e.url.endsWith('/api/billing/webhook'))
  const ours = candidates.find((e) => ownHosts.some((h) => e.url.toLowerCase().includes(h))) ?? candidates[0]
  if (!ours) {
    checks.push({ key: 'stripe-webhook', group, label: 'Webhook de Stripe', status: 'error', detail: 'No hay un webhook hacia /api/billing/webhook: los pagos no se reflejarían en las cuentas.' })
  } else {
    const missing = REQUIRED_STRIPE_EVENTS.filter((e) => !ours.enabled_events.includes(e) && !ours.enabled_events.includes('*'))
    const last = await prisma.processedWebhookEvent.findFirst({ orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
    checks.push({
      key: 'stripe-webhook',
      group,
      label: 'Webhook de Stripe',
      status: ours.status !== 'enabled' || missing.length ? 'error' : env('STRIPE_WEBHOOK_SECRET') ? 'ok' : 'error',
      detail:
        ours.status !== 'enabled'
          ? `El webhook ${ours.url} está "${ours.status}".`
          : missing.length
            ? `Faltan eventos: ${missing.join(', ')}.`
            : !env('STRIPE_WEBHOOK_SECRET')
              ? 'Falta STRIPE_WEBHOOK_SECRET: se rechazarían todos los avisos de Stripe.'
              : `Activo (${ours.url}). Último aviso recibido: ${fmt(last?.createdAt ?? null)}.`,
    })
  }

  const plans = ['NEGOCIO', 'CITAS_PANEL', 'CITAS_IA', 'CITAS_RECORDATORIOS'] as const
  const withPrice = plans.filter((p) => priceIdForPlan(p))
  checks.push({
    key: 'stripe-prices',
    group,
    label: 'Precios de los planes',
    status: withPrice.length ? 'ok' : 'warn',
    detail: withPrice.length
      ? `Con cobro en línea: ${withPrice.join(', ')}. Sin precio: ${plans.filter((p) => !withPrice.includes(p)).join(', ') || 'ninguno'}.`
      : 'Ningún plan tiene precio configurado.',
  })
  if (!env('STRIPE_TAX_RATE_ID')) {
    checks.push({ key: 'stripe-tax', group, label: 'IVA en Stripe', status: 'warn', detail: 'Sin STRIPE_TAX_RATE_ID: los recibos no desglosan el IVA.' })
  }
  return checks
}

async function checkWhatsapp(): Promise<HealthCheck[]> {
  const group = 'WhatsApp'
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [connected, sent24h, failed7d] = await Promise.all([
    prisma.whatsappConfig.count({ where: { isActive: true } }),
    prisma.appointment.count({ where: { reminderSentAt: { gte: dayAgo } } }),
    prisma.appointment.count({
      where: { reminderSentAt: null, reminderAttempts: { gte: 3 }, startTime: { gte: weekAgo } },
    }),
  ])

  const enabled = remindersEnabled()
  const platformNumber = Boolean(env('WHATSAPP_PHONE_NUMBER_ID') && env('WHATSAPP_ACCESS_TOKEN'))
  const s = reminderSchedulerStatus
  const checks: HealthCheck[] = [
    {
      key: 'wa-reminders',
      group,
      label: 'Recordatorios de cita',
      status: !enabled ? 'off' : s.lastError || failed7d > 0 ? 'warn' : 'ok',
      detail: !enabled
        ? 'Programador apagado (WHATSAPP_REMINDERS_ENABLED no es "true").'
        : `Última revisión: ${fmt(s.lastTickAt)}${s.lastError ? ` (error: ${s.lastError})` : ''}. Enviados en 24 h: ${sent24h}. Fallidos en 7 días: ${failed7d}.`,
    },
    {
      key: 'wa-numbers',
      group,
      label: 'Números conectados',
      status: connected > 0 || platformNumber ? 'ok' : enabled ? 'warn' : 'off',
      detail: `${connected} negocio(s) con número propio. Número de la plataforma: ${platformNumber ? 'configurado' : 'no configurado'}.`,
    },
  ]
  return checks
}

function checkAi(): HealthCheck {
  const key = env('OPENAI_API_KEY')
  const baseUrl = env('OPENAI_BASE_URL')
  return {
    key: 'ai',
    group: 'WhatsApp',
    label: 'Asistente de IA',
    status: key ? 'ok' : 'off',
    detail: key
      ? `Modelo ${env('OPENAI_MODEL') || 'gpt-4o-mini'} vía ${baseUrl ? baseUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '') : 'api.openai.com'}.`
      : 'Sin OPENAI_API_KEY: el asistente no responde (plan Citas + IA).',
  }
}

function checkSchedulersAndConfig(): HealthCheck[] {
  const c = complianceSchedulerStatus
  const purgeOn = env('RETENTION_PURGE_DISABLED').toLowerCase() !== 'true'
  const retention = c.lastRetention
  const prod = env('RAILWAY_ENVIRONMENT_NAME') === 'production'
  return [
    {
      key: 'compliance',
      group: 'Tareas automáticas',
      label: 'Avisos de renovación y conservación de datos',
      status: !c.running ? 'warn' : c.lastError ? 'error' : 'ok',
      detail: !c.running
        ? 'Programador apagado (COMPLIANCE_SCHEDULER_DISABLED=true): no se envían avisos de renovación.'
        : `Se ejecuta cada 6 h. Última vez: ${fmt(c.lastRunAt)}${c.lastError ? ` — ${c.lastError}` : ''}. Avisos de renovación: ${c.lastRenewalNotices}.${
            retention
              ? ` Cuentas avisadas: ${retention.inactive.noticed}, eliminadas: ${retention.inactive.deleted + retention.unverified}.`
              : ''
          } Eliminación automática: ${purgeOn ? 'activa' : 'apagada'}.`,
    },
    {
      key: 'unsubscribe',
      group: 'Configuración',
      label: 'Baja de correos con un clic',
      status: env('API_PUBLIC_URL') ? 'ok' : 'warn',
      detail: env('API_PUBLIC_URL')
        ? `API_PUBLIC_URL = ${env('API_PUBLIC_URL')}`
        : 'Falta API_PUBLIC_URL: los correos de marketing no llevan la baja con un clic de Gmail/Outlook (el enlace del pie sí funciona).',
    },
    {
      key: 'totp-key',
      group: 'Configuración',
      label: 'Clave de cifrado del 2FA',
      status: env('TOTP_ENC_KEY') ? 'ok' : 'warn',
      detail: env('TOTP_ENC_KEY')
        ? 'TOTP_ENC_KEY definida.'
        : 'Se deriva de JWT_SECRET: si cambias JWT_SECRET, todos tendrán que volver a configurar su 2FA.',
    },
    {
      key: 'app-url',
      group: 'Configuración',
      label: 'URL del panel',
      status: env('APP_URL') || !prod ? 'ok' : 'warn',
      detail: env('APP_URL') ? `APP_URL = ${env('APP_URL')}` : 'Sin APP_URL: se usa el primer CORS_ORIGIN para los enlaces de los correos.',
    },
  ]
}

async function settle<T>(group: string, label: string, key: string, run: () => Promise<T>): Promise<T | HealthCheck> {
  try {
    return await withTimeout(run(), label)
  } catch (err) {
    return { key, group, label, status: 'error', detail: err instanceof Error ? err.message : String(err) }
  }
}

export async function getPlatformHealth() {
  const results = await Promise.all([
    settle('Infraestructura', 'Base de datos', 'db', checkDatabase),
    settle('Correo', 'Envío de correo (Resend)', 'email', checkEmail),
    settle('Cobros', 'Stripe', 'stripe', checkStripe),
    settle('WhatsApp', 'Recordatorios de cita', 'wa-reminders', checkWhatsapp),
  ])
  const checks: HealthCheck[] = [...results.flat(), checkAi(), ...checkSchedulersAndConfig()]
  const worst: CheckStatus = checks.some((c) => c.status === 'error')
    ? 'error'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : 'ok'
  return {
    status: worst,
    checkedAt: new Date().toISOString(),
    environment: env('RAILWAY_ENVIRONMENT_NAME') || process.env.NODE_ENV || 'local',
    deploymentId: env('RAILWAY_DEPLOYMENT_ID') || null,
    uptimeSeconds: Math.round(process.uptime()),
    node: process.version,
    checks,
  }
}
