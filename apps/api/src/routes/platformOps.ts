import { createHash } from 'node:crypto'
import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { getStripe, isStripeConfigured } from '../lib/stripe.js'
import { audit } from '../lib/audit.js'
import { getStripeRevenue } from '../lib/stripeRevenue.js'
import { getPlatformHealth } from '../lib/health.js'
import { REAL_ACCOUNT_USER, TEST_ACCOUNT_USER } from '../lib/testAccounts.js'
import { syncStripeSubscription } from '../modules/billing/stripeSync.js'
import { isProtectedTenantSlug } from '../lib/accountData.js'
import { sendReactivationNotice, sendSuspensionNotice, sendTermsUpdateNotice } from '../lib/email.js'
import {
  TERMS_CONTENT as DRAFT_CONTENT,
  TERMS_SUMMARY as DRAFT_SUMMARY,
  TERMS_TITLE as DRAFT_TITLE,
  TERMS_VERSION as DRAFT_VERSION,
} from '../legal/terms-content.js'

/**
 * Operaciones del panel de plataforma. Se monta DENTRO de routes/platform.ts,
 * que ya exige SUPER_ADMIN con verificación en dos pasos.
 */
const router = Router()

const DAY_MS = 24 * 60 * 60 * 1000
const sha256 = (text: string): string => createHash('sha256').update(text).digest('hex')

async function tenantOwners(tenantId: string) {
  return prisma.user.findMany({
    where: { tenantId, role: 'BUSINESS', deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: { email: true, name: true },
  })
}

// ---------------------------------------------------------------------------
// Extender la prueba
// ---------------------------------------------------------------------------

const extendSchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().trim().max(300).optional().nullable(),
})

router.post('/tenants/:id/extend-trial', async (req, res) => {
  try {
    const id = getParam(req.params.id)
    const parsed = extendSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Indica de 1 a 365 días' })
    const { days, reason } = parsed.data

    const tenant = await prisma.tenant.findUnique({ where: { id }, include: { subscription: true } })
    if (!tenant) throw new HttpError(404, 'Negocio no encontrado')
    const sub = tenant.subscription
    if (!sub) throw new HttpError(400, 'Este negocio aún no elige un plan, así que no tiene prueba que extender.')

    const now = new Date()
    if (sub.status === 'ACTIVE' && sub.currentPeriodEndsAt && sub.currentPeriodEndsAt > now) {
      throw new HttpError(409, 'El negocio ya paga su plan: no hay prueba que extender.')
    }

    const base = sub.trialEndsAt > now ? sub.trialEndsAt : now
    const newEnd = new Date(base.getTime() + days * DAY_MS)
    let stripeUpdated = false

    if (sub.externalSubscriptionId) {
      if (!isStripeConfigured()) throw new HttpError(503, 'Stripe no está configurado en este entorno')
      const stripeSub = await getStripe().subscriptions.retrieve(sub.externalSubscriptionId)
      if (stripeSub.status === 'trialing') {
        // Con tarjeta registrada: el primer cobro se mueve a la nueva fecha.
        const updated = await getStripe().subscriptions.update(sub.externalSubscriptionId, {
          trial_end: Math.floor(newEnd.getTime() / 1000),
          proration_behavior: 'none',
        })
        await syncStripeSubscription(updated)
        stripeUpdated = true
      } else if (['active', 'past_due', 'unpaid', 'incomplete'].includes(stripeSub.status)) {
        throw new HttpError(
          409,
          `La suscripción en Stripe está "${stripeSub.status}". Resuélvelo desde Stripe (por ejemplo, con un cupón) en lugar de extender la prueba.`,
        )
      }
    }

    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { trialEndsAt: newEnd, status: 'TRIALING' },
    })

    await audit(req, 'tenant.extend_trial', { type: 'tenant', id, label: tenant.name }, {
      days,
      reason: reason || null,
      previousTrialEndsAt: sub.trialEndsAt,
      previousStatus: sub.status,
      newTrialEndsAt: newEnd,
      stripeUpdated,
    })

    return res.json({ ok: true, trialEndsAt: newEnd, stripeUpdated })
  } catch (e) {
    return sendError(res, e)
  }
})

// ---------------------------------------------------------------------------
// Suspender / reactivar
// ---------------------------------------------------------------------------

const suspendSchema = z.object({
  reason: z.string().trim().min(5, 'Escribe el motivo (lo verá el negocio)').max(500),
  notify: z.boolean().optional().default(true),
})

router.post('/tenants/:id/suspend', async (req, res) => {
  try {
    const id = getParam(req.params.id)
    const parsed = suspendSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' })
    }
    const { reason, notify } = parsed.data

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: { subscription: true, users: { select: { role: true } } },
    })
    if (!tenant) throw new HttpError(404, 'Negocio no encontrado')
    if (tenant.users.some((u) => u.role === 'SUPER_ADMIN')) throw new HttpError(400, 'No se puede suspender este negocio')
    if (!tenant.active) throw new HttpError(409, 'El negocio ya está suspendido')

    // Mientras esté suspendido no se le cobra: las facturas de Stripe se anulan.
    let billingPaused = false
    const externalId = tenant.subscription?.externalSubscriptionId
    if (externalId) {
      if (!isStripeConfigured()) throw new HttpError(503, 'Stripe no está configurado: no se puede pausar el cobro')
      const stripeSub = await getStripe().subscriptions.retrieve(externalId)
      if (['active', 'trialing', 'past_due', 'unpaid'].includes(stripeSub.status)) {
        if (!stripeSub.pause_collection) {
          await getStripe().subscriptions.update(externalId, { pause_collection: { behavior: 'void' } })
        }
        billingPaused = true
      }
    }

    await prisma.tenant.update({
      where: { id },
      data: { active: false, suspendedAt: new Date(), suspendedReason: reason },
    })

    let notified = 0
    if (notify) {
      for (const owner of await tenantOwners(id)) {
        if (await sendSuspensionNotice({ to: owner.email, name: owner.name, businessName: tenant.name, reason, billingPaused })) {
          notified += 1
        }
      }
    }

    await audit(req, 'tenant.suspend', { type: 'tenant', id, label: tenant.name }, {
      reason,
      billingPaused,
      notified,
      protectedSlug: isProtectedTenantSlug(tenant.slug),
    })
    return res.json({ ok: true, billingPaused, notified })
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/tenants/:id/reactivate', async (req, res) => {
  try {
    const id = getParam(req.params.id)
    const notify = req.body?.notify !== false
    const tenant = await prisma.tenant.findUnique({ where: { id }, include: { subscription: true } })
    if (!tenant) throw new HttpError(404, 'Negocio no encontrado')
    if (tenant.active) throw new HttpError(409, 'El negocio no está suspendido')

    let billingResumed = false
    const externalId = tenant.subscription?.externalSubscriptionId
    if (externalId && isStripeConfigured()) {
      const stripeSub = await getStripe().subscriptions.retrieve(externalId)
      if (stripeSub.pause_collection) {
        await getStripe().subscriptions.update(externalId, { pause_collection: '' })
        billingResumed = true
      }
    } else if (externalId) {
      throw new HttpError(503, 'Stripe no está configurado: no se puede reanudar el cobro')
    }

    await prisma.tenant.update({
      where: { id },
      data: { active: true, suspendedAt: null, suspendedReason: null },
    })

    let notified = 0
    if (notify) {
      for (const owner of await tenantOwners(id)) {
        if (await sendReactivationNotice({ to: owner.email, name: owner.name, businessName: tenant.name })) notified += 1
      }
    }

    await audit(req, 'tenant.reactivate', { type: 'tenant', id, label: tenant.name }, {
      previousReason: tenant.suspendedReason,
      suspendedAt: tenant.suspendedAt,
      billingResumed,
      notified,
    })
    return res.json({ ok: true, billingResumed, notified })
  } catch (e) {
    return sendError(res, e)
  }
})

// ---------------------------------------------------------------------------
// Cuenta de prueba
// ---------------------------------------------------------------------------

router.post('/tenants/:id/test-flag', async (req, res) => {
  try {
    const id = getParam(req.params.id)
    if (typeof req.body?.isTest !== 'boolean') throw new HttpError(400, 'Indica isTest: true o false')
    const isTest: boolean = req.body.isTest
    const tenant = await prisma.tenant.findUnique({ where: { id }, select: { id: true, name: true, isTest: true } })
    if (!tenant) throw new HttpError(404, 'Negocio no encontrado')
    if (tenant.isTest === isTest) return res.json({ ok: true, isTest })

    await prisma.tenant.update({ where: { id }, data: { isTest } })
    await audit(req, isTest ? 'tenant.mark_test' : 'tenant.unmark_test', { type: 'tenant', id, label: tenant.name })
    return res.json({ ok: true, isTest })
  } catch (e) {
    return sendError(res, e)
  }
})

// ---------------------------------------------------------------------------
// Bitácora
// ---------------------------------------------------------------------------

router.get('/audit-log', async (req, res) => {
  const take = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const action = typeof req.query.action === 'string' ? req.query.action.trim() : ''
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const targetId = typeof req.query.targetId === 'string' ? req.query.targetId.trim() : ''
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(action ? { action: { startsWith: action } } : {}),
    ...(targetId ? { targetId } : {}),
    ...(q
      ? {
          OR: [
            { targetLabel: { contains: q, mode: 'insensitive' } },
            { actorEmail: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.adminAuditLog.count({ where }),
  ])
  return res.json({ items, total, take, skip })
})

// ---------------------------------------------------------------------------
// Ingresos reales (Stripe)
// ---------------------------------------------------------------------------

router.get('/revenue', async (req, res) => {
  try {
    return res.json(await getStripeRevenue(req.query.refresh === '1'))
  } catch (e) {
    console.error('[platform] no se pudieron leer los ingresos de Stripe', e)
    return res.status(502).json({ error: 'No se pudo consultar Stripe en este momento. Intenta de nuevo en unos minutos.' })
  }
})

// ---------------------------------------------------------------------------
// Términos y condiciones
// ---------------------------------------------------------------------------

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/** Usuarios a los que se puede avisar por correo de unos términos nuevos. */const TERMS_RECIPIENTS_BASE: Prisma.UserWhereInput = {
  deletedAt: null,
  role: { not: 'SUPER_ADMIN' },
  emailVerifiedAt: { not: null },
}

router.get('/terms', async (_req, res) => {
  const [docs, accepted, activeUsers, realRecipients, testRecipients] = await Promise.all([
    prisma.termsDocument.findMany({ orderBy: { publishedAt: 'desc' } }),
    prisma.termsAcceptance.groupBy({ by: ['version'], where: { userId: { not: null } }, _count: { _all: true } }),
    prisma.user.count({ where: { deletedAt: null, role: { not: 'SUPER_ADMIN' } } }),
    prisma.user.count({ where: { ...TERMS_RECIPIENTS_BASE, ...REAL_ACCOUNT_USER } }),
    prisma.user.count({ where: { ...TERMS_RECIPIENTS_BASE, ...TEST_ACCOUNT_USER } }),
  ])
  const counts = new Map(accepted.map((a) => [a.version, a._count._all]))
  const current = docs[0] ?? null
  const draftPublished = docs.find((d) => d.version === DRAFT_VERSION)
  return res.json({
    activeUsers,
    recipients: { real: realRecipients, test: testRecipients },
    current: current && {
      version: current.version,
      title: current.title,
      summary: current.summary,
      content: current.content,
      publishedAt: current.publishedAt,
      acceptedBy: counts.get(current.version) ?? 0,
    },
    versions: docs.map((d) => ({
      version: d.version,
      title: d.title,
      summary: d.summary,
      publishedAt: d.publishedAt,
      contentHash: sha256(d.content),
      acceptedBy: counts.get(d.version) ?? 0,
    })),
    // Borrador que viene con el código (src/legal/terms-content.ts).
    draft: {
      version: DRAFT_VERSION,
      title: DRAFT_TITLE,
      summary: DRAFT_SUMMARY,
      content: DRAFT_CONTENT,
      published: Boolean(draftPublished),
      publishedWithSameText: draftPublished ? draftPublished.content === DRAFT_CONTENT : false,
    },
  })
})

const publishSchema = z.object({
  version: z.string().trim().regex(/^\d+(\.\d+){0,2}$/, 'La versión debe ser como 1.3 o 2.0'),
  title: z.string().trim().min(5).max(200),
  summary: z.string().trim().min(10, 'Resume qué cambió (lo verán los usuarios)').max(2000),
  content: z.string().trim().min(200, 'El texto de los términos es demasiado corto').max(200_000),
  confirm: z.literal(true),
  /**
   * A quién avisar por correo: nadie, las cuentas reales (nunca las de prueba)
   * o solo las cuentas de prueba (para revisar el correo antes de mandarlo a todos).
   * `notifyUsers: true` (versión anterior del panel) equivale a 'real'.
   */
  notify: z.enum(['none', 'real', 'test']).optional(),
  notifyUsers: z.boolean().optional(),
})

let notifying = false

/**
 * Publica una versión NUEVA. No hay edición: una versión publicada no se
 * modifica nunca. Al publicarla, todos deben aceptarla al entrar.
 */
router.post('/terms', async (req, res) => {
  try {
    const parsed = publishSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos inválidos' })
    }
    const { version, title, summary, content } = parsed.data
    const notify = parsed.data.notify ?? (parsed.data.notifyUsers ? 'real' : 'none')

    const current = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
    if (await prisma.termsDocument.findUnique({ where: { version } })) {
      throw new HttpError(409, `La versión ${version} ya existe. Las versiones publicadas no se modifican: usa un número nuevo.`)
    }
    if (current && compareVersions(version, current.version) <= 0) {
      throw new HttpError(400, `La versión nueva debe ser mayor que la vigente (${current.version}).`)
    }
    if (current && current.content.trim() === content) {
      throw new HttpError(400, 'El texto es idéntico al de la versión vigente.')
    }

    const doc = await prisma.termsDocument.create({
      data: { version, title, summary, content, publishedAt: new Date() },
    })

    let queued = 0
    if (notify !== 'none') {
      const recipients = await prisma.user.findMany({
        where: {
          ...TERMS_RECIPIENTS_BASE,
          ...(notify === 'test' ? TEST_ACCOUNT_USER : REAL_ACCOUNT_USER),
        },
        select: { email: true, name: true },
      })
      queued = recipients.length
      if (!notifying && recipients.length) {
        notifying = true
        // En segundo plano y pausado para respetar el límite del proveedor de correo.
        void (async () => {
          let sent = 0
          try {
            for (const r of recipients) {
              if (await sendTermsUpdateNotice({ to: r.email, name: r.name, version, summary })) sent += 1
              await new Promise((resolve) => setTimeout(resolve, 600))
            }
          } finally {
            notifying = false
            console.log(`[terms] aviso de la versión ${version}: ${sent}/${recipients.length} correos enviados`)
          }
        })()
      }
    }

    await audit(req, 'terms.publish', { type: 'terms', id: doc.id, label: `v${version}` }, {
      previousVersion: current?.version ?? null,
      contentHash: sha256(content),
      notify,
      queued,
    })
    return res.status(201).json({ ok: true, version: doc.version, publishedAt: doc.publishedAt, queued })
  } catch (e) {
    return sendError(res, e)
  }
})

// ---------------------------------------------------------------------------
// Estado de salud
// ---------------------------------------------------------------------------

router.get('/health', async (_req, res) => {
  try {
    return res.json(await getPlatformHealth())
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
