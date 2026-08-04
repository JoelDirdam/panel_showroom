import { prisma } from './prisma.js'
import { getEntitlements, getFeatureFlags } from './entitlements.js'
import { assertSubscriptionActive } from './subscription.js'

/**
 * Shape compartido usado por `GET /me`, `/register` y las respuestas de
 * auth/onboarding para que el frontend tenga un único contrato.
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

  if (user.role === 'SUPER_ADMIN') {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: null,
      brandId: null,
      mustChangePassword: user.mustChangePassword,
      phone: user.phone,
      phoneVerifiedAt: user.phoneVerifiedAt,
      emailVerifiedAt: user.emailVerifiedAt,
      timezone: user.timezone,
      onboardingStep: user.onboardingStep,
      brand: null,
      terms: {
        currentVersion: currentTerms?.version ?? null,
        accepted: true,
        acceptedVersion: acceptance?.version ?? null,
        acceptedAt: acceptance?.acceptedAt ?? null,
      },
      tenant: null,
      subscription: null,
      setupStatus: null,
      entitlements: [],
      featureFlags: [],
      preferences: null,
    }
  }

  const { tenant } = user
  if (!tenant) return null

  // Refresca EXPIRED si el trial ya venció (sin bloquear /me).
  if (tenant.subscription) {
    await assertSubscriptionActive(tenant.id)
  }

  const freshSub = await prisma.tenantSubscription.findUnique({ where: { tenantId: tenant.id } })

  const [houseBrand, brandCount] = await Promise.all([
    prisma.brand.findFirst({
      where: { tenantId: tenant.id, isHouseBrand: true, active: true },
      select: { id: true },
    }),
    prisma.brand.count({ where: { tenantId: tenant.id } }),
  ])

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
    subscription: freshSub
      ? {
          planType: freshSub.planType,
          status: freshSub.status,
          trialEndsAt: freshSub.trialEndsAt,
          promoCodeUsed: freshSub.promoCodeUsed,
          paymentDeferred: freshSub.paymentDeferred,
          currentPeriodEndsAt: freshSub.currentPeriodEndsAt,
          paymentProvider: freshSub.paymentProvider,
        }
      : null,
    setupStatus: {
      businessConfigured: tenant.onboardingComplete,
      hasHouseBrand: Boolean(houseBrand),
      brandCount,
      houseBrandId: houseBrand?.id ?? null,
    },
    entitlements: getEntitlements(freshSub?.planType),
    featureFlags: getFeatureFlags(freshSub?.planType),
    preferences: tenant.preferences ?? null,
  }
}

export type MeResponse = NonNullable<Awaited<ReturnType<typeof buildMeResponse>>>
