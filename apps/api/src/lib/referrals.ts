import type Stripe from 'stripe'
import type { PlanType, PromoCode } from '@prisma/client'
import { prisma } from './prisma.js'
import { getStripe, priceIdForPlan } from './stripe.js'

/**
 * Programa de referidos y descuentos con código.
 *
 * - El negocio recomendado obtiene REFERRED_PERCENT_OFF % en su primera mensualidad pagada.
 * - Quien recomienda recibe una mensualidad de su plan como saldo a favor en Stripe
 *   cuando el recomendado paga su primer mes (tope: MAX_REFERRAL_REWARDS).
 */
export const REFERRED_PERCENT_OFF = 50
export const REFERRED_DISCOUNT_MONTHS = 1
export const MAX_REFERRAL_REWARDS = 6

const DAY_MS = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// Códigos de referido
// ---------------------------------------------------------------------------

/** Código legible a partir del nombre del negocio (ej. "Estética Luna" -> ESTETICA-LUNA). */
const CODE_MAX_LENGTH = 18
const CODE_STOPWORDS = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'E', 'EN', 'THE'])

export function baseCodeFrom(name: string, slug: string): string {
  const source = name.replace(/^negocio de\s+/i, '').trim() || slug
  const words = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter(Boolean)
  const meaningful = words.filter((w) => !CODE_STOPWORDS.has(w))
  // Palabras completas hasta CODE_MAX_LENGTH: f\u00e1cil de dictar y nunca cortado a media palabra.
  let clean = ''
  for (const w of meaningful.length ? meaningful : words) {
    const next = clean ? `${clean}-${w}` : w
    if (next.length > CODE_MAX_LENGTH) break
    clean = next
  }
  if (!clean && words.length) clean = (meaningful[0] ?? words[0]).slice(0, CODE_MAX_LENGTH)
  return clean.length >= 3 ? clean : `COSDI-${clean || 'NEG'}`
}

/** Devuelve el código de referido del negocio y lo crea si aún no existe. */
export async function ensureReferralCode(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { name: true, slug: true, referralCode: true },
  })
  if (tenant.referralCode) return tenant.referralCode

  const base = baseCodeFrom(tenant.name, tenant.slug)
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.floor(100 + Math.random() * 900)}`
    // No debe chocar con un código promocional ni con otro negocio.
    const [promo, other] = await Promise.all([
      prisma.promoCode.findUnique({ where: { code: candidate } }),
      prisma.tenant.findUnique({ where: { referralCode: candidate } }),
    ])
    if (promo || other) continue
    try {
      await prisma.tenant.update({ where: { id: tenantId }, data: { referralCode: candidate } })
      return candidate
    } catch {
      // Carrera con otro registro: se intenta otro sufijo.
    }
  }
  throw new Error('No se pudo generar el código de referido')
}

// ---------------------------------------------------------------------------
// Resolución de códigos al elegir plan
// ---------------------------------------------------------------------------

export type ResolvedCode =
  | { kind: 'promo'; promo: PromoCode }
  | { kind: 'referral'; code: string; referrerTenantId: string }

export class CodeError extends Error {}

/** Valida un código escrito por el usuario: primero promociones, luego referidos. */
export async function resolveSignupCode(
  rawCode: string,
  planType: PlanType,
  tenantId: string,
): Promise<ResolvedCode> {
  const code = rawCode.trim().toUpperCase()
  const promo = await prisma.promoCode.findUnique({ where: { code } })
  if (promo) {
    const expired = promo.expiresAt ? promo.expiresAt < new Date() : false
    if (!promo.active || expired || (promo.maxUses !== null && promo.usedCount >= promo.maxUses)) {
      throw new CodeError('Código promocional inválido o expirado')
    }
    if (promo.planTypes.length > 0 && !promo.planTypes.includes(planType)) {
      throw new CodeError('Este código no aplica para el plan seleccionado')
    }
    return { kind: 'promo', promo }
  }

  const referrer = await prisma.tenant.findUnique({
    where: { referralCode: code },
    select: { id: true, active: true },
  })
  if (!referrer || !referrer.active) throw new CodeError('Código promocional inválido o expirado')
  if (referrer.id === tenantId) throw new CodeError('No puedes usar tu propio código de recomendación')
  return { kind: 'referral', code, referrerTenantId: referrer.id }
}

// ---------------------------------------------------------------------------
// Descuentos en Stripe Checkout
// ---------------------------------------------------------------------------

/** Texto corto del beneficio de un código promocional (para pantallas y correos). */
export function promoBenefitLabel(promo: Pick<PromoCode, 'trialDays' | 'discountPercent' | 'discountAmountMxn' | 'discountMonths'>): string {
  const parts: string[] = []
  if (promo.discountPercent || promo.discountAmountMxn) {
    const what = promo.discountPercent ? `${promo.discountPercent}% de descuento` : `$${promo.discountAmountMxn} MXN de descuento`
    const months = promo.discountMonths ?? 1
    parts.push(`${what} ${months === 1 ? 'en tu primera mensualidad' : `durante ${months} meses`}`)
  }
  if (promo.trialDays > 0) parts.push(`${promo.trialDays} días de prueba gratis`)
  return parts.join(' y ')
}

interface DiscountSpec {
  percentOff?: number
  amountOffMxn?: number
  months: number
  name: string
}

/**
 * Cupón de Stripe con id determinista (mismo descuento = mismo cupón), así no hay que
 * guardar ids por entorno. Siempre `repeating`: un cupón `once` se gastaría en la factura
 * en $0 de la prueba. Si la prueba restante dura casi un mes, se suma un mes para que el
 * descuento cubra las mensualidades pagadas prometidas.
 */
async function ensureCoupon(stripe: Stripe, spec: DiscountSpec, trialDaysLeft: number): Promise<string> {
  const months = spec.months + (trialDaysLeft >= 28 ? 1 : 0)
  const amountPart = spec.percentOff ? `p${spec.percentOff}` : `a${spec.amountOffMxn}`
  const id = `cosdi_${amountPart}_m${months}`
  try {
    await stripe.coupons.retrieve(id)
    return id
  } catch (e) {
    if ((e as { statusCode?: number }).statusCode !== 404) throw e
  }
  try {
    await stripe.coupons.create({
      id,
      name: spec.name.slice(0, 40),
      duration: 'repeating',
      duration_in_months: months,
      ...(spec.percentOff
        ? { percent_off: spec.percentOff }
        : { amount_off: (spec.amountOffMxn ?? 0) * 100, currency: 'mxn' }),
    })
  } catch (e) {
    // Otro proceso lo creó al mismo tiempo.
    if ((e as { code?: string }).code !== 'resource_already_exists') throw e
  }
  return id
}

/** Cupón a aplicar en Checkout según el código que usó el negocio (o null). */
export async function couponForCheckout(
  tenantId: string,
  planType: PlanType,
  promoCodeUsed: string | null,
  trialEndsAt: Date | null,
): Promise<string | null> {
  const trialDaysLeft = trialEndsAt ? Math.max(0, (trialEndsAt.getTime() - Date.now()) / DAY_MS) : 0
  const stripe = getStripe()

  if (promoCodeUsed) {
    const promo = await prisma.promoCode.findUnique({ where: { code: promoCodeUsed } })
    if (
      promo &&
      (promo.discountPercent || promo.discountAmountMxn) &&
      (promo.planTypes.length === 0 || promo.planTypes.includes(planType))
    ) {
      return ensureCoupon(
        stripe,
        {
          percentOff: promo.discountPercent ?? undefined,
          amountOffMxn: promo.discountPercent ? undefined : (promo.discountAmountMxn ?? undefined),
          months: promo.discountMonths ?? 1,
          name: `Código ${promo.code}`,
        },
        trialDaysLeft,
      )
    }
  }

  const referral = await prisma.referral.findUnique({ where: { referredTenantId: tenantId } })
  if (referral && referral.status === 'PENDING') {
    return ensureCoupon(
      stripe,
      { percentOff: REFERRED_PERCENT_OFF, months: REFERRED_DISCOUNT_MONTHS, name: 'Recomendación COSDI' },
      trialDaysLeft,
    )
  }
  return null
}

// ---------------------------------------------------------------------------
// Premio a quien recomienda
// ---------------------------------------------------------------------------

async function monthlyPriceCents(stripe: Stripe, planType: PlanType): Promise<number | null> {
  const priceId = priceIdForPlan(planType)
  if (!priceId) return null
  const price = await stripe.prices.retrieve(priceId)
  return price.unit_amount ?? null
}

/**
 * Aplica como saldo a favor los premios QUALIFIED de un negocio que ya tiene cliente en Stripe.
 * Idempotente: usa el id del referido como llave de idempotencia.
 */
export async function applyPendingReferralRewards(referrerTenantId: string): Promise<void> {
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId: referrerTenantId } })
  if (!sub?.externalCustomerId) return
  const pending = await prisma.referral.findMany({
    where: { referrerTenantId, status: 'QUALIFIED' },
    orderBy: { qualifiedAt: 'asc' },
  })
  if (pending.length === 0) return

  const stripe = getStripe()
  const amount = await monthlyPriceCents(stripe, sub.planType)
  if (!amount) return

  for (const ref of pending) {
    const txn = await stripe.customers.createBalanceTransaction(
      sub.externalCustomerId,
      {
        amount: -amount,
        currency: 'mxn',
        description: 'Mes gratis por recomendar COSDI',
        metadata: { referralId: ref.id, referredTenantId: ref.referredTenantId },
      },
      { idempotencyKey: `referral-reward-${ref.id}` },
    )
    await prisma.referral.update({
      where: { id: ref.id },
      data: {
        status: 'REWARDED',
        rewardAmountCents: amount,
        stripeBalanceTxnId: txn.id,
        rewardedAt: new Date(),
      },
    })
  }
}

/**
 * El negocio recomendado pagó una factura con importe > 0: califica su referido
 * y premia a quien lo recomendó (si no superó el tope).
 */
export async function qualifyReferralOnPayment(referredTenantId: string): Promise<void> {
  const referral = await prisma.referral.findUnique({ where: { referredTenantId } })
  if (!referral) return

  if (referral.status === 'PENDING') {
    const earned = await prisma.referral.count({
      where: { referrerTenantId: referral.referrerTenantId, status: { in: ['QUALIFIED', 'REWARDED'] } },
    })
    const overCap = earned >= MAX_REFERRAL_REWARDS
    await prisma.referral.update({
      where: { id: referral.id },
      data: { status: overCap ? 'VOID' : 'QUALIFIED', qualifiedAt: new Date() },
    })
    if (overCap) return
  } else if (referral.status !== 'QUALIFIED') {
    return
  }
  // También cubre el reintento de un webhook que falló al abonar el crédito.
  await applyPendingReferralRewards(referral.referrerTenantId)
}

/** Resumen para la pantalla "Recomienda y gana". */
export async function referralSummary(tenantId: string) {
  const code = await ensureReferralCode(tenantId)
  const rows = await prisma.referral.groupBy({
    by: ['status'],
    where: { referrerTenantId: tenantId },
    _count: { _all: true },
  })
  const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0
  return {
    code,
    registered: rows.reduce((n, r) => n + r._count._all, 0),
    pending: count('PENDING'),
    earned: count('QUALIFIED') + count('REWARDED'),
    rewarded: count('REWARDED'),
    maxRewards: MAX_REFERRAL_REWARDS,
    referredPercentOff: REFERRED_PERCENT_OFF,
  }
}
