import type Stripe from 'stripe'
import type { Prisma, SubscriptionStatus } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { getStripe, planForPriceId } from '../../lib/stripe.js'

const toDate = (unix: number | null | undefined): Date | null =>
  typeof unix === 'number' ? new Date(unix * 1000) : null

/** Fin del periodo actual: en versiones nuevas de la API vive en el item. */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const fromItem = (sub.items?.data?.[0] as { current_period_end?: number } | undefined)
    ?.current_period_end
  const legacy = (sub as unknown as { current_period_end?: number }).current_period_end
  return toDate(fromItem ?? legacy)
}

function customerId(c: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null {
  if (!c) return null
  return typeof c === 'string' ? c : c.id
}

async function findTenantSubscription(sub: Stripe.Subscription) {
  const bySub = await prisma.tenantSubscription.findFirst({
    where: { externalSubscriptionId: sub.id },
  })
  if (bySub) return bySub
  const tenantId = sub.metadata?.tenantId
  if (tenantId) return prisma.tenantSubscription.findUnique({ where: { tenantId } })
  const cid = customerId(sub.customer)
  if (cid) return prisma.tenantSubscription.findFirst({ where: { externalCustomerId: cid } })
  return null
}

/**
 * Refleja el estado de una suscripción de Stripe en TenantSubscription.
 * Es idempotente: siempre escribe el estado actual completo.
 *
 * - active            -> ACTIVE, currentPeriodEndsAt = fin del periodo pagado
 * - trialing          -> TRIALING, trialEndsAt = fin del trial (tarjeta ya capturada)
 * - past_due/unpaid   -> no extiende el periodo: al vencer el pagado la cuenta se pausa
 * - canceled/expired  -> CANCELED
 */
export async function syncStripeSubscription(sub: Stripe.Subscription): Promise<void> {
  const current = await findTenantSubscription(sub)
  if (!current) {
    console.warn(`[billing] suscripción ${sub.id} sin tenant asociado; se ignora`)
    return
  }

  // Evento tardío de una suscripción anterior ya reemplazada: no debe pausar la nueva.
  if (
    current.externalSubscriptionId &&
    current.externalSubscriptionId !== sub.id &&
    (sub.status === 'canceled' || sub.status === 'incomplete_expired')
  ) {
    return
  }

  const priceId = sub.items?.data?.[0]?.price?.id ?? null
  const planType = planForPriceId(priceId) ?? current.planType

  const data: Prisma.TenantSubscriptionUncheckedUpdateInput = {
    paymentProvider: 'stripe',
    externalCustomerId: customerId(sub.customer) ?? current.externalCustomerId,
    externalSubscriptionId: sub.id,
    priceId,
    planType,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    paymentDeferred: false,
  }

  let status: SubscriptionStatus = current.status
  switch (sub.status) {
    case 'active':
      status = 'ACTIVE'
      data.currentPeriodEndsAt = periodEnd(sub)
      break
    case 'trialing': {
      status = 'TRIALING'
      const trialEnd = toDate(sub.trial_end)
      if (trialEnd) data.trialEndsAt = trialEnd
      break
    }
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      // Conserva currentPeriodEndsAt: al vencer, assertSubscriptionActive pausa la cuenta.
      break
    case 'canceled':
    case 'incomplete_expired':
      status = 'CANCELED'
      break
    default:
      break
  }
  data.status = status

  await prisma.tenantSubscription.update({ where: { id: current.id }, data })
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== 'subscription') return
  const tenantId = session.client_reference_id || session.metadata?.tenantId
  const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
  if (!tenantId || !subId) return

  const cid = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null
  await prisma.tenantSubscription.updateMany({
    where: { tenantId },
    data: {
      paymentProvider: 'stripe',
      externalSubscriptionId: subId,
      ...(cid ? { externalCustomerId: cid } : {}),
    },
  })

  const sub = await getStripe().subscriptions.retrieve(subId)
  await syncStripeSubscription(sub)
}

export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const cid = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
  if (!cid) return
  await prisma.tenantSubscription.updateMany({
    where: { externalCustomerId: cid },
    data: { lastPaymentAt: new Date() },
  })
}

export async function dispatchStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      return handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      return syncStripeSubscription(event.data.object as Stripe.Subscription)
    case 'invoice.paid':
      return handleInvoicePaid(event.data.object as Stripe.Invoice)
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn(`[billing] pago fallido: factura ${invoice.id}, cliente ${String(invoice.customer)}`)
      return
    }
    default:
      return
  }
}
