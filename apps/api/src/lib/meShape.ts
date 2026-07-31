import { prisma } from './prisma.js'
import { getEntitlements, getFeatureFlags } from './entitlements.js'

/**
 * Shape compartido usado por `GET /me`, `/register` y las respuestas de
 * auth/onboarding para que el frontend (Agente C) tenga un único contrato.
 */
export async function buildMeResponse(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      brand: { select: { id: true, name: true } },
      tenant: { include: { subscription: true, preferences: true } },
      termsAcceptances: true,
    },
  })
  if (!user) return null

  const currentTerms = await prisma.termsDocument.findFirst({ orderBy: { publishedAt: 'desc' } })
  const acceptance = currentTerms
    ? user.termsAcceptances.find((a) => a.version === currentTerms.version)
    : undefined

  const { tenant } = user
  const subscription = tenant.subscription

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    brandId: user.brandId,
    mustChangePassword: user.mustChangePassword,
    phone: user.phone,
    phoneVerifiedAt: user.phoneVerifiedAt,
    emailVerifiedAt: user.emailVerifiedAt,
    timezone: user.timezone,
    onboardingStep: user.onboardingStep,
    brand: user.brand ?? null,
    terms: {
      currentVersion: currentTerms?.version ?? null,
      accepted: Boolean(acceptance),
      acceptedVersion: acceptance?.version ?? null,
      acceptedAt: acceptance?.acceptedAt ?? null,
    },
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      rfc: tenant.rfc,
      socialUrl: tenant.socialUrl,
      address: tenant.address,
      logoUrl: tenant.logoUrl,
      onboardingComplete: tenant.onboardingComplete,
    },
    subscription: subscription
      ? {
          planType: subscription.planType,
          status: subscription.status,
          trialEndsAt: subscription.trialEndsAt,
          promoCodeUsed: subscription.promoCodeUsed,
        }
      : null,
    entitlements: getEntitlements(subscription?.planType),
    // Flags de funcionalidad stub por plan (recordatorios/historial en
    // CLINICA, platillos/comandas/ia/sms en RESTAURANTE). Ver
    // docs/plans-contracts.md — Agente H.
    featureFlags: getFeatureFlags(subscription?.planType),
    preferences: tenant.preferences ?? null,
  }
}

export type MeResponse = NonNullable<Awaited<ReturnType<typeof buildMeResponse>>>
