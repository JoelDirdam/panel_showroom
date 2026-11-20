import type Stripe from 'stripe'
import { getStripe, isStripeConfigured } from './stripe.js'
import { prisma } from './prisma.js'

/**
 * Ingresos reales leídos de Stripe (no estimados): cobros pagados y
 * reembolsos de los últimos 12 meses, e ingreso mensual recurrente (MRR) de
 * las suscripciones activas. Importes en MXN con IVA incluido.
 * Se guarda en memoria 5 minutos para no consultar Stripe en cada visita.
 * No cuenta a los clientes de Stripe de cuentas de prueba (Tenant.isTest).
 */

const CACHE_MS = 5 * 60 * 1000
const MAX_ITEMS = 5000

export interface RevenueMonth {
  month: string
  gross: number
  refunds: number
  net: number
  invoices: number
}

export interface StripeRevenue {
  configured: true
  mode: 'live' | 'test'
  currency: 'mxn'
  months: RevenueMonth[]
  totals: { gross12m: number; refunds12m: number; net12m: number; grossThisMonth: number }
  mrr: number
  /** Cobros esperados en los próximos 30 días (suscripciones que se renuevan). */
  expectedNext30Days: number
  subscriptions: {
    active: number
    trialing: number
    pastDue: number
    canceling: number
    paused: number
  }
  lastPaymentAt: string | null
  /** Movimientos en otra moneda que no se sumaron. */
  ignoredOtherCurrency: number
  truncated: boolean
  fetchedAt: string
}

let cache: { at: number; value: StripeRevenue } | null = null

const monthKey = (unix: number): string => {
  const d = new Date(unix * 1000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

const toMxn = (cents: number): number => Math.round(cents) / 100

/** Importe mensual equivalente de una suscripción (centavos). */
function monthlyAmount(sub: Stripe.Subscription): number {
  let total = 0
  for (const item of sub.items.data) {
    const price = item.price
    if (price.currency !== 'mxn' || !price.recurring || typeof price.unit_amount !== 'number') continue
    const qty = item.quantity ?? 1
    const every = price.recurring.interval_count || 1
    const perMonth =
      price.recurring.interval === 'month'
        ? 1 / every
        : price.recurring.interval === 'year'
          ? 1 / (12 * every)
          : price.recurring.interval === 'week'
            ? 52 / 12 / every
            : 365 / 12 / every
    total += price.unit_amount * qty * perMonth
  }
  return total
}

const customerOf = (c: string | { id: string } | null | undefined): string | null =>
  !c ? null : typeof c === 'string' ? c : c.id

/** Clientes de Stripe que pertenecen a negocios de prueba. */
async function testCustomerIds(): Promise<Set<string>> {
  const rows = await prisma.tenantSubscription.findMany({
    where: { tenant: { isTest: true }, externalCustomerId: { not: null } },
    select: { externalCustomerId: true },
  })
  return new Set(rows.map((r) => r.externalCustomerId as string))
}

function periodEndUnix(sub: Stripe.Subscription): number | null {
  const fromItem = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)?.current_period_end
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end
  return fromItem ?? legacy ?? null
}

export async function getStripeRevenue(force = false): Promise<StripeRevenue | { configured: false }> {
  if (!isStripeConfigured()) return { configured: false }
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.value

  const stripe = getStripe()
  const now = new Date()
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const sinceUnix = Math.floor(since.getTime() / 1000)

  const [allInvoices, allRefunds, allSubscriptions, testCustomers] = await Promise.all([
    stripe.invoices.list({ status: 'paid', created: { gte: sinceUnix }, limit: 100 }).autoPagingToArray({ limit: MAX_ITEMS }),
    stripe.refunds
      .list({ created: { gte: sinceUnix }, limit: 100, expand: ['data.charge'] })
      .autoPagingToArray({ limit: MAX_ITEMS }),
    stripe.subscriptions.list({ status: 'all', limit: 100 }).autoPagingToArray({ limit: MAX_ITEMS }),
    testCustomerIds(),
  ])
  const isTest = (c: string | null) => Boolean(c && testCustomers.has(c))
  const invoices = allInvoices.filter((i) => !isTest(customerOf(i.customer)))
  const refunds = allRefunds.filter((r) => {
    const charge = r.charge && typeof r.charge !== 'string' ? r.charge : null
    return !isTest(customerOf(charge?.customer as string | { id: string } | null | undefined))
  })
  const subscriptions = allSubscriptions.filter((sub) => !isTest(customerOf(sub.customer)))

  const months = new Map<string, RevenueMonth>()
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth() + i, 1))
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    months.set(key, { month: key, gross: 0, refunds: 0, net: 0, invoices: 0 })
  }

  let ignoredOtherCurrency = 0
  let lastPaid = 0
  for (const invoice of invoices) {
    if (invoice.currency !== 'mxn') {
      ignoredOtherCurrency += 1
      continue
    }
    if (!invoice.amount_paid) continue
    const paidAt = invoice.status_transitions?.paid_at ?? invoice.created
    lastPaid = Math.max(lastPaid, paidAt)
    const row = months.get(monthKey(paidAt))
    if (!row) continue
    row.gross += invoice.amount_paid
    row.invoices += 1
  }
  for (const refund of refunds) {
    if (refund.status !== 'succeeded') continue
    if (refund.currency !== 'mxn') {
      ignoredOtherCurrency += 1
      continue
    }
    const row = months.get(monthKey(refund.created))
    if (row) row.refunds += refund.amount
  }

  const monthRows = [...months.values()].map((m) => ({
    month: m.month,
    gross: toMxn(m.gross),
    refunds: toMxn(m.refunds),
    net: toMxn(m.gross - m.refunds),
    invoices: m.invoices,
  }))

  const counts = { active: 0, trialing: 0, pastDue: 0, canceling: 0, paused: 0 }
  let mrrCents = 0
  let expectedCents = 0
  const in30 = Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60
  for (const sub of subscriptions) {
    const paused = Boolean(sub.pause_collection)
    if (paused && ['active', 'trialing', 'past_due'].includes(sub.status)) counts.paused += 1
    if (sub.status === 'trialing') counts.trialing += 1
    if (sub.status === 'past_due' || sub.status === 'unpaid') counts.pastDue += 1
    if (sub.status !== 'active') continue
    counts.active += 1
    if (sub.cancel_at_period_end) counts.canceling += 1
    if (paused) continue
    const monthly = monthlyAmount(sub)
    mrrCents += monthly
    const end = periodEndUnix(sub)
    if (!sub.cancel_at_period_end && end && end <= in30) expectedCents += monthly
  }

  const truncated =
    allInvoices.length >= MAX_ITEMS || allRefunds.length >= MAX_ITEMS || allSubscriptions.length >= MAX_ITEMS
  const sum = (key: 'gross' | 'refunds' | 'net') => Math.round(monthRows.reduce((s, m) => s + m[key], 0) * 100) / 100
  const value: StripeRevenue = {
    configured: true,
    mode: /^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY?.trim() ?? '') ? 'live' : 'test',
    currency: 'mxn',
    months: monthRows,
    totals: {
      gross12m: sum('gross'),
      refunds12m: sum('refunds'),
      net12m: sum('net'),
      grossThisMonth: monthRows[monthRows.length - 1]?.gross ?? 0,
    },
    mrr: toMxn(mrrCents),
    expectedNext30Days: toMxn(expectedCents),
    subscriptions: counts,
    lastPaymentAt: lastPaid ? new Date(lastPaid * 1000).toISOString() : null,
    ignoredOtherCurrency,
    truncated,
    fetchedAt: new Date().toISOString(),
  }
  cache = { at: Date.now(), value }
  return value
}
