import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize, requireSuperAdminTwoFactor } from '../middleware/auth.js'
import { sendError } from '../lib/httpError.js'
import { clientIp } from '../lib/clientIp.js'
import { deleteTenantCompletely, isProtectedTenantSlug } from '../lib/accountData.js'
import { getTrackerSettings, saveTrackerSettings, trackersSchema } from '../lib/platformSettings.js'
import { RETENTION } from '../lib/retention.js'
import { findInactiveTenants } from '../services/compliance.service.js'
import { emailConfigured } from '../lib/email.js'
import { audit } from '../lib/audit.js'
import platformOps from './platformOps.js'

import { REAL_ACCOUNT_USER } from '../lib/testAccounts.js'

const router = Router()

// El panel de plataforma exige sesión de SUPER_ADMIN con verificación en dos pasos activa.
router.use(authenticate, authorize('SUPER_ADMIN'), requireSuperAdminTwoFactor)

/** Las cuentas de prueba (Tenant.isTest) no cuentan en las estadísticas del panel. */
const REAL_TENANT = { isTest: false } as const

router.get('/stats', async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    tenants,
    brands,
    products,
    sales,
    employees,
    salesAgg,
    recentSales,
    salesLast30Agg,
    trialing,
    activeSubs,
    expiredSubs,
  ] = await Promise.all([
    prisma.tenant.count({ where: REAL_TENANT }),
    prisma.brand.count({ where: { tenant: REAL_TENANT } }),
    prisma.product.count({ where: { brand: { tenant: REAL_TENANT } } }),
    prisma.sale.count({ where: { tenant: REAL_TENANT } }),
    prisma.employee.count({ where: { tenant: REAL_TENANT } }),
    prisma.sale.aggregate({ where: { tenant: REAL_TENANT }, _sum: { total: true } }),
    prisma.sale.count({ where: { tenant: REAL_TENANT, soldAt: { gte: thirtyDaysAgo } } }),
    prisma.sale.aggregate({
      where: { tenant: REAL_TENANT, soldAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
    }),
    prisma.tenantSubscription.count({ where: { tenant: REAL_TENANT, status: 'TRIALING' } }),
    prisma.tenantSubscription.count({ where: { tenant: REAL_TENANT, status: 'ACTIVE' } }),
    prisma.tenantSubscription.count({ where: { tenant: REAL_TENANT, status: 'EXPIRED' } }),
  ])

  return res.json({
    tenants,
    brands,
    products,
    sales,
    employees,
    salesTotalSum: salesAgg._sum.total ? Number(salesAgg._sum.total) : 0,
    salesLast30Days: recentSales,
    salesLast30Sum: salesLast30Agg._sum.total ? Number(salesLast30Agg._sum.total) : 0,
    trialingTenants: trialing,
    activeSubscriptions: activeSubs,
    expiredSubscriptions: expiredSubs,
  })
})

router.get('/tenants', async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          brands: true,
          sales: true,
          employees: true,
        },
      },
    },
  })

  const productCounts = await prisma.product.groupBy({
    by: ['brandId'],
    _count: { _all: true },
  })
  const brandTenant = await prisma.brand.findMany({
    select: { id: true, tenantId: true },
  })
  const brandToTenant = new Map(brandTenant.map((b) => [b.id, b.tenantId]))
  const productsByTenant = new Map<string, number>()
  for (const row of productCounts) {
    const tid = brandToTenant.get(row.brandId)
    if (!tid) continue
    productsByTenant.set(tid, (productsByTenant.get(tid) || 0) + row._count._all)
  }

  return res.json(
    tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      active: t.active,
      suspendedAt: t.suspendedAt,
      isTest: t.isTest,
      rfc: t.rfc,
      onboardingComplete: t.onboardingComplete,
      createdAt: t.createdAt,
      subscription: t.subscription
        ? {
            planType: t.subscription.planType,
            status: t.subscription.status,
            trialEndsAt: t.subscription.trialEndsAt,
          }
        : null,
      counts: {
        users: t._count.users,
        brands: t._count.brands,
        sales: t._count.sales,
        employees: t._count.employees,
        products: productsByTenant.get(t.id) || 0,
      },
    })),
  )
})

router.get('/tenants/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscription: true,
      preferences: true,
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      brands: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          _count: { select: { products: true } },
        },
      },
      employees: {
        select: { id: true, name: true, email: true, phone: true, active: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { sales: true } },
    },
  })
  if (!tenant) {
    return res.status(404).json({ error: 'Negocio no encontrado' })
  }

  const salesAgg = await prisma.sale.aggregate({
    where: { tenantId: id },
    _sum: { total: true },
    _count: true,
  })

  return res.json({
    ...tenant,
    salesSummary: {
      count: salesAgg._count,
      totalSum: salesAgg._sum.total ? Number(salesAgg._sum.total) : 0,
    },
  })
})

router.get('/tenants/:id/brands', async (req, res) => {
  const id = getParam(req.params.id)
  const brands = await prisma.brand.findMany({
    where: { tenantId: id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return res.json(brands)
})

router.get('/tenants/:id/products', async (req, res) => {
  const id = getParam(req.params.id)
  const take = Math.min(Number(req.query.limit) || 50, 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const products = await prisma.product.findMany({
    where: { brand: { tenantId: id } },
    include: {
      brand: { select: { id: true, name: true } },
      stock: { select: { quantity: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  })
  const total = await prisma.product.count({ where: { brand: { tenantId: id } } })
  return res.json({ items: products, total, take, skip })
})

router.get('/tenants/:id/sales', async (req, res) => {
  const id = getParam(req.params.id)
  const take = Math.min(Number(req.query.limit) || 50, 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const sales = await prisma.sale.findMany({
    where: { tenantId: id },
    include: {
      attendedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { soldAt: 'desc' },
    take,
    skip,
  })
  const total = await prisma.sale.count({ where: { tenantId: id } })
  return res.json({ items: sales, total, take, skip })
})

router.delete('/tenants/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const confirm =
    (typeof req.query.confirm === 'string' ? req.query.confirm : undefined) ??
    (typeof req.body?.confirm === 'string' ? req.body.confirm : undefined)

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { users: { select: { id: true, role: true } } },
  })
  if (!tenant) {
    return res.status(404).json({ error: 'Negocio no encontrado' })
  }

  if (isProtectedTenantSlug(tenant.slug)) {
    return res.status(400).json({ error: 'Este negocio no se puede eliminar' })
  }

  if (!confirm || confirm !== tenant.slug) {
    return res.status(400).json({ error: 'Escribe el slug del negocio para confirmar la eliminación' })
  }

  const hasSuperAdmin = tenant.users.some((u) => u.role === 'SUPER_ADMIN')
  if (hasSuperAdmin) {
    return res.status(400).json({ error: 'No se puede eliminar un negocio con un usuario SUPER_ADMIN' })
  }

  try {
    // Cancela la suscripción en Stripe, borra archivos y conserva solo la evidencia legal.
    await deleteTenantCompletely(id, 'super_admin', clientIp(req))
  } catch (e) {
    return sendError(res, e)
  }
  await audit(req, 'tenant.delete', { type: 'tenant', id, label: tenant.name }, { slug: tenant.slug })

  return res.json({ ok: true, deletedId: id, slug: tenant.slug })
})

/**
 * Borra usuarios huérfanos (sin tenant asignado). Nunca borra SUPER_ADMIN.
 * Pensado para limpiar cuentas de QA/pruebas que quedaron sin tenant tras
 * un fallo a medio flujo de onboarding.
 */
router.delete('/users/:id', async (req, res) => {
  const id = getParam(req.params.id)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  if (user.role === 'SUPER_ADMIN') {
    return res.status(400).json({ error: 'No se puede eliminar un SUPER_ADMIN' })
  }
  if (user.tenantId) {
    return res.status(400).json({ error: 'Solo se pueden eliminar usuarios huérfanos (sin negocio asignado)' })
  }

  await prisma.user.delete({ where: { id } })
  await audit(req, 'user.delete_orphan', { type: 'user', id, label: user.email })

  return res.json({ ok: true, deletedId: id, email: user.email })
})

// ---------------------------------------------------------------------------
// Analítica de la plataforma
// ---------------------------------------------------------------------------

type MonthRow = { month: Date; count: bigint }

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

router.get('/analytics', async (_req, res) => {
  const now = new Date()
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    signupRows,
    deletionRows,
    funnelRows,
    subsByPlan,
    withCard,
    cancelScheduled,
    paidLast30,
    promoRows,
    usersTotal,
    usersTwoFactor,
    usersMarketing,
    usersVerified,
    acceptancesTotal,
    openClaims,
    tenantsTotal,
    tenantsLast30,
  ] = await Promise.all([
    prisma.$queryRaw<MonthRow[]>(Prisma.sql`
      SELECT date_trunc('month', "createdAt") AS month, count(*)::bigint AS count
      FROM "Tenant" WHERE "createdAt" >= ${since} AND "isTest" = false GROUP BY 1 ORDER BY 1`),
    prisma.$queryRaw<MonthRow[]>(Prisma.sql`
      SELECT date_trunc('month', "deletedAt") AS month, count(*)::bigint AS count
      FROM "AccountDeletionLog" WHERE "deletedAt" >= ${since} AND "scope" = 'TENANT' GROUP BY 1 ORDER BY 1`),
    prisma.user.groupBy({
      by: ['onboardingStep'],
      where: { role: 'BUSINESS', deletedAt: null, ...REAL_ACCOUNT_USER },
      _count: { _all: true },
    }),
    prisma.tenantSubscription.groupBy({ by: ['planType', 'status'], where: { tenant: REAL_TENANT }, _count: { _all: true } }),
    prisma.tenantSubscription.count({ where: { tenant: REAL_TENANT, externalSubscriptionId: { not: null } } }),
    prisma.tenantSubscription.count({
      where: { tenant: REAL_TENANT, cancelAtPeriodEnd: true, status: { in: ['ACTIVE', 'TRIALING'] } },
    }),
    prisma.tenantSubscription.count({ where: { tenant: REAL_TENANT, lastPaymentAt: { gte: thirtyDaysAgo } } }),
    prisma.tenantSubscription.groupBy({
      by: ['promoCodeUsed'],
      where: { tenant: REAL_TENANT, promoCodeUsed: { not: null } },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { deletedAt: null, role: { not: 'SUPER_ADMIN' }, ...REAL_ACCOUNT_USER } }),
    prisma.user.count({
      where: { deletedAt: null, role: { not: 'SUPER_ADMIN' }, totpEnabledAt: { not: null }, ...REAL_ACCOUNT_USER },
    }),
    prisma.user.count({ where: { deletedAt: null, marketingOptIn: true, ...REAL_ACCOUNT_USER } }),
    prisma.user.count({ where: { deletedAt: null, role: 'BUSINESS', emailVerifiedAt: { not: null }, ...REAL_ACCOUNT_USER } }),
    prisma.termsAcceptance.count({ where: { OR: [{ user: null }, { user: REAL_ACCOUNT_USER }] } }),
    prisma.copyrightClaim.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
    prisma.tenant.count({ where: REAL_TENANT }),
    prisma.tenant.count({ where: { ...REAL_TENANT, createdAt: { gte: thirtyDaysAgo } } }),
  ])

  const signupMap = new Map(signupRows.map((r) => [monthKey(new Date(r.month)), Number(r.count)]))
  const deletionMap = new Map(deletionRows.map((r) => [monthKey(new Date(r.month)), Number(r.count)]))
  const months: { month: string; signups: number; deletions: number }[] = []
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1))
    const key = monthKey(d)
    months.push({ month: key, signups: signupMap.get(key) ?? 0, deletions: deletionMap.get(key) ?? 0 })
  }

  // Embudo acumulado: cuántas cuentas llegaron AL MENOS a cada paso.
  const order = ['REGISTERED', 'EMAIL_VERIFIED', 'PLAN_SELECTED', 'BUSINESS_CREATED', 'DONE'] as const
  const byStep = new Map(funnelRows.map((r) => [r.onboardingStep as string, r._count._all]))
  const registered = order.reduce((sum, step) => sum + (byStep.get(step) ?? 0), 0)
  const reached = (from: number) => order.slice(from).reduce((sum, step) => sum + (byStep.get(step) ?? 0), 0)
  const activePaying = subsByPlan
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + r._count._all, 0)

  return res.json({
    months,
    totals: { tenants: tenantsTotal, tenantsLast30Days: tenantsLast30 },
    funnel: [
      { step: 'Cuenta creada', count: registered },
      { step: 'Correo verificado', count: usersVerified },
      { step: 'Plan elegido', count: reached(2) },
      { step: 'Negocio configurado', count: reached(4) },
      { step: 'Tarjeta registrada', count: withCard },
      { step: 'Suscripción activa (pagando)', count: activePaying },
    ],
    subscriptions: subsByPlan.map((r) => ({ planType: r.planType, status: r.status, count: r._count._all })),
    billing: { withCard, cancelScheduled, paidLast30Days: paidLast30 },
    promoUsage: promoRows
      .map((r) => ({ code: r.promoCodeUsed as string, count: r._count._all }))
      .sort((a, b) => b.count - a.count),
    users: { total: usersTotal, twoFactor: usersTwoFactor, marketingOptIn: usersMarketing },
    legal: { termsAcceptances: acceptancesTotal, openCopyrightClaims: openClaims },
  })
})

// ---------------------------------------------------------------------------
// Códigos de promoción
// ---------------------------------------------------------------------------

const promoCodeField = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[A-Za-z0-9_-]+$/, 'Solo letras, números, guion y guion bajo')
  .transform((v) => v.toUpperCase())

const PROMO_PLAN_TYPES = ['NEGOCIO', 'CITAS_RECORDATORIOS', 'CITAS_PANEL', 'CITAS_IA'] as const

/** Campos de descuento: porcentaje O monto fijo, por N mensualidades, opcionalmente solo en ciertos planes. */
const promoDiscountFields = {
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  discountAmountMxn: z.number().int().min(1).max(100_000).nullable().optional(),
  discountMonths: z.number().int().min(1).max(36).nullable().optional(),
  planTypes: z.array(z.enum(PROMO_PLAN_TYPES)).max(PROMO_PLAN_TYPES.length).optional(),
}

function promoBenefitIssue(
  v: { trialDays?: number; discountPercent?: number | null; discountAmountMxn?: number | null },
  ctx: z.RefinementCtx,
) {
  if (v.discountPercent && v.discountAmountMxn) {
    ctx.addIssue({ code: 'custom', message: 'Usa porcentaje o monto fijo, no ambos', path: ['discountAmountMxn'] })
  }
}

const promoCreateSchema = z
  .object({
    code: promoCodeField,
    trialDays: z.number().int().min(0).max(365),
    maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    note: z.string().trim().max(300).nullable().optional(),
    active: z.boolean().optional(),
    ...promoDiscountFields,
  })
  .superRefine((v, ctx) => {
    promoBenefitIssue(v, ctx)
    if (v.trialDays === 0 && !v.discountPercent && !v.discountAmountMxn) {
      ctx.addIssue({ code: 'custom', message: 'El código debe dar días de prueba o un descuento', path: ['trialDays'] })
    }
  })

const promoUpdateSchema = z.object({
  ...promoDiscountFields,
  trialDays: z.number().int().min(0).max(365).optional(),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  note: z.string().trim().max(300).nullable().optional(),
  active: z.boolean().optional(),
}).superRefine(promoBenefitIssue)

router.get('/promo-codes', async (_req, res) => {
  const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(codes)
})

router.post('/promo-codes', async (req, res) => {
  const parsed = promoCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { code, trialDays, maxUses, expiresAt, note, active } = parsed.data
  const { discountPercent, discountAmountMxn, discountMonths, planTypes } = parsed.data
  const existing = await prisma.promoCode.findUnique({ where: { code } })
  if (existing) return res.status(409).json({ error: 'Ya existe un código con ese nombre' })
  const takenByReferral = await prisma.tenant.findUnique({ where: { referralCode: code }, select: { id: true } })
  if (takenByReferral) return res.status(409).json({ error: 'Ese código ya es el código de recomendación de un negocio' })
  const hasDiscount = Boolean(discountPercent || discountAmountMxn)
  const created = await prisma.promoCode.create({
    data: {
      code,
      trialDays,
      discountPercent: discountPercent ?? null,
      discountAmountMxn: discountPercent ? null : (discountAmountMxn ?? null),
      discountMonths: hasDiscount ? (discountMonths ?? 1) : null,
      planTypes: planTypes ?? [],
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      note: note || null,
      active: active ?? true,
    },
  })
  await audit(req, 'promo.create', { type: 'promo', id: created.id, label: created.code }, {
    trialDays: created.trialDays,
    discountPercent: created.discountPercent,
    discountAmountMxn: created.discountAmountMxn,
    discountMonths: created.discountMonths,
    planTypes: created.planTypes,
    maxUses: created.maxUses,
    expiresAt: created.expiresAt,
    active: created.active,
  })
  return res.status(201).json(created)
})

/** Editar, activar o desactivar. El nombre del código no se cambia (ya pudo haberse compartido). */
router.patch('/promo-codes/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = promoUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const existing = await prisma.promoCode.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Código no encontrado' })
  const { trialDays, maxUses, expiresAt, note, active } = parsed.data
  const { discountPercent, discountAmountMxn, discountMonths, planTypes } = parsed.data
  const updated = await prisma.promoCode.update({
    where: { id },
    data: {
      ...(trialDays !== undefined ? { trialDays } : {}),
      ...(discountPercent !== undefined ? { discountPercent } : {}),
      ...(discountAmountMxn !== undefined ? { discountAmountMxn } : {}),
      ...(discountMonths !== undefined ? { discountMonths } : {}),
      ...(planTypes !== undefined ? { planTypes } : {}),
      ...(maxUses !== undefined ? { maxUses } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
      ...(note !== undefined ? { note: note || null } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  })
  const action =
    active !== undefined && active !== existing.active ? (active ? 'promo.activate' : 'promo.deactivate') : 'promo.update'
  await audit(req, action, { type: 'promo', id, label: existing.code }, { changes: parsed.data })
  return res.json(updated)
})

/** Quitar un código. Las pruebas ya otorgadas con él no cambian. */
router.delete('/promo-codes/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const existing = await prisma.promoCode.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Código no encontrado' })
  await prisma.promoCode.delete({ where: { id } })
  await audit(req, 'promo.delete', { type: 'promo', id, label: existing.code }, { usedCount: existing.usedCount })
  return res.json({ ok: true, deletedId: id, code: existing.code })
})

// ---------------------------------------------------------------------------
// Rastreadores (Google Analytics, Meta Pixel, Hotjar)
// ---------------------------------------------------------------------------

router.get('/settings/trackers', async (_req, res) => {
  return res.json(await getTrackerSettings())
})

router.put('/settings/trackers', async (req, res) => {
  const parsed = trackersSchema.safeParse(req.body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message
    return res.status(400).json({ error: first || 'Datos inválidos', details: parsed.error.flatten() })
  }
  const previous = await getTrackerSettings()
  const saved = await saveTrackerSettings(parsed.data)
  await audit(req, 'settings.trackers', { type: 'settings', id: 'trackers', label: 'Rastreadores' }, {
    before: previous,
    after: saved,
  })
  return res.json(saved)
})

// ---------------------------------------------------------------------------
// Centro legal: aceptaciones de términos, consentimientos, bajas y reclamos
// ---------------------------------------------------------------------------

function paging(query: Record<string, unknown>) {
  const take = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
  const skip = Math.max(Number(query.offset) || 0, 0)
  return { take, skip }
}

/** Quién aceptó qué versión de los términos y cuándo. */
router.get('/legal/acceptances', async (req, res) => {
  const { take, skip } = paging(req.query)
  const search = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const where: Prisma.TermsAcceptanceWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { signedName: { contains: search, mode: 'insensitive' } },
          { version: search },
        ],
      }
    : {}
  const [items, total, versions] = await Promise.all([
    prisma.termsAcceptance.findMany({
      where,
      orderBy: { acceptedAt: 'desc' },
      take,
      skip,
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    }),
    prisma.termsAcceptance.count({ where }),
    prisma.termsDocument.findMany({
      orderBy: { publishedAt: 'desc' },
      select: { version: true, title: true, publishedAt: true },
    }),
  ])
  return res.json({ items, total, take, skip, versions })
})

router.get('/legal/consents', async (req, res) => {
  const { take, skip } = paging(req.query)
  const [items, total] = await Promise.all([
    prisma.consentEvent.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.consentEvent.count(),
  ])
  return res.json({ items, total, take, skip })
})

router.get('/legal/deletions', async (req, res) => {
  const { take, skip } = paging(req.query)
  const [items, total] = await Promise.all([
    prisma.accountDeletionLog.findMany({ orderBy: { deletedAt: 'desc' }, take, skip }),
    prisma.accountDeletionLog.count(),
  ])
  return res.json({ items, total, take, skip })
})

router.get('/legal/copyright-claims', async (req, res) => {
  const { take, skip } = paging(req.query)
  const [items, total] = await Promise.all([
    prisma.copyrightClaim.findMany({ orderBy: { createdAt: 'desc' }, take, skip }),
    prisma.copyrightClaim.count(),
  ])
  return res.json({ items, total, take, skip })
})

const claimUpdateSchema = z.object({
  status: z.enum(['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED']).optional(),
  adminNote: z.string().trim().max(4000).nullable().optional(),
})

router.patch('/legal/copyright-claims/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = claimUpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
  const existing = await prisma.copyrightClaim.findUnique({ where: { id } })
  if (!existing) return res.status(404).json({ error: 'Reclamo no encontrado' })
  const { status, adminNote } = parsed.data
  const closing = status === 'RESOLVED' || status === 'REJECTED'
  const updated = await prisma.copyrightClaim.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status, resolvedAt: closing ? existing.resolvedAt ?? new Date() : null } : {}),
      ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
    },
  })
  await audit(req, 'copyright_claim.update', { type: 'copyright_claim', id, label: existing.claimantEmail }, {
    from: existing.status,
    to: updated.status,
  })
  return res.json(updated)
})

/** Política de conservación vigente y cuentas inactivas próximas a eliminarse. */
router.get('/retention', async (_req, res) => {
  const candidates = await findInactiveTenants()
  return res.json({
    policy: RETENTION,
    purgeEnabled: process.env.RETENTION_PURGE_DISABLED?.trim().toLowerCase() !== 'true',
    emailConfigured: emailConfigured(),
    inactiveTenants: candidates,
  })
})

// Extender prueba, suspender, bitácora, ingresos, términos y estado.
router.use(platformOps)

export default router
