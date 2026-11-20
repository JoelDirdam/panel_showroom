import { prisma } from '../lib/prisma.js'
import { RETENTION, daysAgo, monthsAgo, yearsAgo } from '../lib/retention.js'
import { deleteTenantCompletely, isProtectedTenantSlug } from '../lib/accountData.js'
import { emailConfigured, sendRenewalNotice, sendRetentionNotice } from '../lib/email.js'
import { getStripe, isStripeConfigured } from '../lib/stripe.js'

/**
 * Tareas periódicas de cumplimiento:
 *
 * 1. Aviso de renovación automática: correo al titular antes de cada cobro
 *    (renovación mensual o primer cobro al terminar la prueba con tarjeta).
 * 2. Conservación de datos (ver lib/retention.ts): limpia datos técnicos
 *    vencidos, registros sin verificar y cuentas inactivas (con aviso previo).
 *
 * Variables de entorno:
 * - COMPLIANCE_SCHEDULER_DISABLED=true   apaga todo el programador.
 * - RETENTION_PURGE_DISABLED=true        no elimina cuentas (inactivas / sin verificar);
 *                                        la limpieza técnica y los avisos de renovación siguen.
 */

const TICK_MS = 6 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_ACCOUNTS_PER_RUN = 20

const PLAN_NAMES: Record<string, string> = {
  NEGOCIO: 'Negocio',
  CLINICA: 'Clínica',
  RESTAURANTE: 'Restaurante',
  MARCA: 'Marca',
  CITAS_RECORDATORIOS: 'Recordatorios',
  CITAS_PANEL: 'Citas',
  CITAS_IA: 'Citas + IA',
}

export function planDisplayName(planType: string): string {
  return PLAN_NAMES[planType] ?? planType
}

const purgeEnabled = (): boolean => process.env.RETENTION_PURGE_DISABLED?.trim().toLowerCase() !== 'true'

// --- 1. Aviso de renovación automática ----------------------------------------

const priceCache = new Map<string, number | null>()

/** Importe mensual (MXN, con IVA incluido) según el precio contratado en Stripe. */
async function priceAmountMxn(priceId: string | null): Promise<number | null> {
  if (!priceId || !isStripeConfigured()) return null
  if (priceCache.has(priceId)) return priceCache.get(priceId) ?? null
  try {
    const price = await getStripe().prices.retrieve(priceId)
    const amount = price.currency === 'mxn' && typeof price.unit_amount === 'number' ? price.unit_amount / 100 : null
    priceCache.set(priceId, amount)
    return amount
  } catch {
    return null
  }
}

export async function runRenewalNotices(now: Date = new Date()): Promise<number> {
  const windowEnd = new Date(now.getTime() + RETENTION.renewalNoticeDays * DAY_MS)
  const subs = await prisma.tenantSubscription.findMany({
    where: {
      externalSubscriptionId: { not: null },
      cancelAtPeriodEnd: false,
      // Las cuentas de prueba no reciben avisos automáticos.
      tenant: { isTest: false },
      OR: [
        { status: 'ACTIVE', currentPeriodEndsAt: { gt: now, lte: windowEnd } },
        { status: 'TRIALING', trialEndsAt: { gt: now, lte: windowEnd } },
      ],
    },
    include: {
      tenant: {
        select: {
          users: {
            where: { role: 'BUSINESS', deletedAt: null },
            orderBy: { createdAt: 'asc' },
            take: 1,
            select: { email: true, name: true },
          },
        },
      },
    },
    take: 200,
  })

  let sent = 0
  for (const sub of subs) {
    const firstCharge = sub.status === 'TRIALING'
    const chargeDate = firstCharge ? sub.trialEndsAt : sub.currentPeriodEndsAt
    if (!chargeDate) continue
    // Ya se avisó de este cobro.
    if (sub.renewalNoticeFor && sub.renewalNoticeFor.getTime() === chargeDate.getTime()) continue
    const owner = sub.tenant.users[0]
    if (!owner) continue

    const ok = await sendRenewalNotice({
      to: owner.email,
      name: owner.name,
      planName: planDisplayName(sub.planType),
      chargeDate,
      amountMxn: await priceAmountMxn(sub.priceId),
      firstCharge,
    })
    if (ok) {
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { renewalNoticeFor: chargeDate },
      })
      sent += 1
    }
  }
  return sent
}

// --- 2. Conservación de datos ---------------------------------------------------

export interface InactiveTenant {
  id: string
  name: string
  slug: string
  /** Fin de la prueba o del último periodo pagado. */
  accessEndedAt: Date
  noticeSentAt: Date | null
  /** Fecha a partir de la cual puede eliminarse (si ya se avisó con la anticipación debida). */
  deleteAfter: Date
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d
}

/**
 * Cuentas sin suscripción vigente desde hace casi el plazo de inactividad
 * (entran a la lista cuando toca avisarles). Nunca incluye negocios protegidos,
 * de prueba, sin suscripción registrada (cuentas anteriores a los planes) ni con SUPER_ADMIN.
 */
export async function findInactiveTenants(now: Date = new Date()): Promise<InactiveTenant[]> {
  // Fin de acceso anterior a (hoy - plazo + días de aviso)
  const noticeCutoff = new Date(
    monthsAgo(RETENTION.inactiveAccountMonths, now).getTime() + RETENTION.inactiveNoticeDays * DAY_MS,
  )
  const subs = await prisma.tenantSubscription.findMany({
    where: {
      trialEndsAt: { lt: noticeCutoff },
      OR: [{ currentPeriodEndsAt: null }, { currentPeriodEndsAt: { lt: noticeCutoff } }],
      // Las cuentas de prueba nunca se eliminan por inactividad.
      tenant: { isTest: false },
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          retentionNoticeSentAt: true,
          users: { select: { role: true } },
        },
      },
    },
    orderBy: { trialEndsAt: 'asc' },
    take: 500,
  })

  const result: InactiveTenant[] = []
  for (const sub of subs) {
    const t = sub.tenant
    if (isProtectedTenantSlug(t.slug)) continue
    if (t.users.some((u) => u.role === 'SUPER_ADMIN')) continue
    const paid = sub.currentPeriodEndsAt
    const accessEndedAt = paid && paid > sub.trialEndsAt ? paid : sub.trialEndsAt
    if (accessEndedAt >= noticeCutoff) continue
    const byInactivity = addMonths(accessEndedAt, RETENTION.inactiveAccountMonths)
    const byNotice = t.retentionNoticeSentAt
      ? new Date(t.retentionNoticeSentAt.getTime() + RETENTION.inactiveNoticeDays * DAY_MS)
      : new Date(now.getTime() + RETENTION.inactiveNoticeDays * DAY_MS)
    result.push({
      id: t.id,
      name: t.name,
      slug: t.slug,
      accessEndedAt,
      noticeSentAt: t.retentionNoticeSentAt,
      deleteAfter: byInactivity > byNotice ? byInactivity : byNotice,
    })
  }
  return result
}

async function purgeInactiveTenants(now: Date): Promise<{ noticed: number; deleted: number }> {
  let noticed = 0
  let deleted = 0

  // Una cuenta que volvió a tener acceso vigente ya no está en proceso de eliminación.
  await prisma.tenant.updateMany({
    where: {
      retentionNoticeSentAt: { not: null },
      subscription: {
        OR: [{ trialEndsAt: { gt: now } }, { currentPeriodEndsAt: { gt: now } }],
      },
    },
    data: { retentionNoticeSentAt: null },
  })

  const candidates = (await findInactiveTenants(now)).slice(0, MAX_ACCOUNTS_PER_RUN)
  for (const candidate of candidates) {
    if (!candidate.noticeSentAt) {
      // Sin correo configurado no se puede avisar, y sin aviso no se elimina nada.
      if (!emailConfigured()) continue
      const owners = await prisma.user.findMany({
        where: { tenantId: candidate.id, role: 'BUSINESS', deletedAt: null },
        select: { email: true, name: true },
      })
      let anySent = false
      for (const owner of owners) {
        const ok = await sendRetentionNotice({
          to: owner.email,
          name: owner.name,
          businessName: candidate.name,
          deleteAfter: candidate.deleteAfter,
        })
        anySent = anySent || ok
      }
      if (anySent) {
        await prisma.tenant.update({ where: { id: candidate.id }, data: { retentionNoticeSentAt: now } })
        noticed += 1
      }
      continue
    }

    if (now < candidate.deleteAfter) continue
    try {
      await deleteTenantCompletely(candidate.id, 'retention_inactive')
      deleted += 1
    } catch (err) {
      console.error(`[retention] no se pudo eliminar el negocio inactivo ${candidate.slug}`, err)
    }
  }
  return { noticed, deleted }
}

/** Registros que nunca verificaron su correo ni eligieron plan. */
async function purgeUnverifiedSignups(now: Date): Promise<number> {
  const cutoff = daysAgo(RETENTION.unverifiedSignupDays, now)
  const tenants = await prisma.tenant.findMany({
    where: {
      onboardingComplete: false,
      isTest: false,
      createdAt: { lt: cutoff },
      subscription: { is: null },
      users: { every: { emailVerifiedAt: null, role: 'BUSINESS' } },
    },
    select: { id: true, slug: true, _count: { select: { users: true, sales: true, brands: true } } },
    take: MAX_ACCOUNTS_PER_RUN,
  })
  let deleted = 0
  for (const t of tenants) {
    // Doble seguro: solo cuentas vacías que se quedaron en el primer paso.
    if (t._count.users === 0 || t._count.sales > 0 || t._count.brands > 0) continue
    try {
      await deleteTenantCompletely(t.id, 'retention_unverified')
      deleted += 1
    } catch (err) {
      console.error(`[retention] no se pudo eliminar el registro sin verificar ${t.slug}`, err)
    }
  }
  return deleted
}

/** Datos técnicos y evidencia legal cuyo plazo ya venció. */
async function purgeExpiredRecords(now: Date) {
  const codeCutoff = new Date(now.getTime() - RETENTION.verificationCodeHours * 60 * 60 * 1000)
  const evidenceCutoff = yearsAgo(RETENTION.evidenceYears, now)

  // Evidencia que quedó sin cuenta (borrado en cascada): desde hoy corre su plazo.
  await prisma.termsAcceptance.updateMany({
    where: { userId: null, userDeletedAt: null },
    data: { userDeletedAt: now },
  })
  await prisma.consentEvent.updateMany({
    where: { userId: null, userDeletedAt: null },
    data: { userDeletedAt: now },
  })

  const [emailCodes, smsCodes, webhooks, acceptances, consents, deletionLogs, claims, adminAudit] = await Promise.all([
    prisma.emailVerificationCode.deleteMany({ where: { expiresAt: { lt: codeCutoff } } }),
    prisma.smsVerificationCode.deleteMany({ where: { expiresAt: { lt: codeCutoff } } }),
    prisma.processedWebhookEvent.deleteMany({
      where: { createdAt: { lt: daysAgo(RETENTION.webhookEventDays, now) } },
    }),
    prisma.termsAcceptance.deleteMany({ where: { userDeletedAt: { lt: evidenceCutoff } } }),
    prisma.consentEvent.deleteMany({ where: { userDeletedAt: { lt: evidenceCutoff } } }),
    prisma.accountDeletionLog.deleteMany({ where: { deletedAt: { lt: evidenceCutoff } } }),
    prisma.copyrightClaim.deleteMany({
      where: { resolvedAt: { lt: yearsAgo(RETENTION.copyrightClaimYears, now) } },
    }),
    prisma.adminAuditLog.deleteMany({
      where: { createdAt: { lt: yearsAgo(RETENTION.adminAuditYears, now) } },
    }),
  ])
  return {
    codes: emailCodes.count + smsCodes.count,
    webhooks: webhooks.count,
    evidence: acceptances.count + consents.count + deletionLogs.count,
    claims: claims.count,
    adminAudit: adminAudit.count,
  }
}

export async function runRetention(now: Date = new Date()) {
  const records = await purgeExpiredRecords(now)
  let unverified = 0
  let inactive = { noticed: 0, deleted: 0 }
  if (purgeEnabled()) {
    unverified = await purgeUnverifiedSignups(now)
    inactive = await purgeInactiveTenants(now)
  }
  return { records, unverified, inactive }
}

/** Estado del programador, para el panel de estado de la plataforma. */
export const complianceSchedulerStatus = {
  running: false,
  lastRunAt: null as Date | null,
  lastRenewalNotices: 0,
  lastRetention: null as Awaited<ReturnType<typeof runRetention>> | null,
  lastError: null as string | null,
}

export function startComplianceScheduler(): void {
  if (process.env.COMPLIANCE_SCHEDULER_DISABLED?.trim().toLowerCase() === 'true') {
    console.log('[compliance] programador desactivado (COMPLIANCE_SCHEDULER_DISABLED=true)')
    return
  }
  console.log(`[compliance] programador activo (eliminación por conservación: ${purgeEnabled() ? 'sí' : 'no'})`)
  complianceSchedulerStatus.running = true
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    complianceSchedulerStatus.lastError = null
    try {
      const notices = await runRenewalNotices()
      complianceSchedulerStatus.lastRenewalNotices = notices
      if (notices > 0) console.log(`[compliance] avisos de renovación enviados: ${notices}`)
    } catch (err) {
      complianceSchedulerStatus.lastError = `Avisos de renovación: ${err instanceof Error ? err.message : String(err)}`
      console.error('[compliance] avisos de renovación fallaron', err)
    }
    try {
      const r = await runRetention()
      complianceSchedulerStatus.lastRetention = r
      const touched =
        r.unverified + r.inactive.noticed + r.inactive.deleted + r.records.evidence + r.records.claims
      if (touched > 0) console.log('[compliance] conservación de datos:', JSON.stringify(r))
    } catch (err) {
      complianceSchedulerStatus.lastError = `Conservación de datos: ${err instanceof Error ? err.message : String(err)}`
      console.error('[compliance] conservación de datos falló', err)
    } finally {
      complianceSchedulerStatus.lastRunAt = new Date()
      running = false
    }
  }
  setTimeout(() => void tick(), 60_000)
  setInterval(() => void tick(), TICK_MS)
}
