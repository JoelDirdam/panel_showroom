import type { TenantSubscription } from '@prisma/client'
import { prisma } from './prisma.js'

export type SubscriptionGateResult =
  | { ok: true; subscription: TenantSubscription | null }
  | { ok: false; code: 'SUBSCRIPTION_EXPIRED'; subscription: TenantSubscription }

/**
 * Si el trial venció y no hay periodo pagado activo, marca EXPIRED y bloquea.
 * Tenants sin suscripción (legacy) se dejan pasar.
 */
export async function assertSubscriptionActive(
  tenantId: string,
): Promise<SubscriptionGateResult> {
  const subscription = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
  if (!subscription) return { ok: true, subscription: null }

  if (subscription.status === 'CANCELED' || subscription.status === 'EXPIRED') {
    return { ok: false, code: 'SUBSCRIPTION_EXPIRED', subscription }
  }

  const now = new Date()
  const paidUntil = subscription.currentPeriodEndsAt
  if (paidUntil && paidUntil > now) {
    if (subscription.status !== 'ACTIVE') {
      const updated = await prisma.tenantSubscription.update({
        where: { id: subscription.id },
        data: { status: 'ACTIVE' },
      })
      return { ok: true, subscription: updated }
    }
    return { ok: true, subscription }
  }

  if (
    (subscription.status === 'TRIALING' || subscription.status === 'ACTIVE') &&
    subscription.trialEndsAt < now &&
    (!paidUntil || paidUntil < now)
  ) {
    const updated = await prisma.tenantSubscription.update({
      where: { id: subscription.id },
      data: { status: 'EXPIRED' },
    })
    return { ok: false, code: 'SUBSCRIPTION_EXPIRED', subscription: updated }
  }

  return { ok: true, subscription }
}
