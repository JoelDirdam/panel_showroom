import { Router } from 'express'
import { z } from 'zod'
import type { PlanType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { buildMeResponse } from '../lib/meShape.js'
import { advanceStep } from '../lib/onboarding.js'
import { ensurePrincipalSucursal } from '../lib/sucursal.js'
import { storage } from '../lib/storage.js'
import { imageUpload, safeImageOriginalName } from '../lib/upload.js'
import { CodeError, resolveSignupCode } from '../lib/referrals.js'

const router = Router()

const PLAN_TYPES: PlanType[] = [
  'NEGOCIO',
  'CLINICA',
  'RESTAURANTE',
  'MARCA',
  'CITAS_RECORDATORIOS',
  'CITAS_PANEL',
  'CITAS_IA',
]
const DAY_MS = 24 * 60 * 60 * 1000

const selectPlanSchema = z.object({
  planType: z.enum(PLAN_TYPES as [PlanType, ...PlanType[]]),
  promoCode: z.string().trim().min(1).optional().nullable(),
})

const createBusinessSchema = z.object({
  name: z.string().min(1).max(200),
  rfc: z.string().max(20).optional().nullable(),
  socialUrl: z.string().max(300).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
})

router.use(authenticate, authorize('BUSINESS'))

/**
 * Selecciona el plan. La prueba gratis solo existe con código. El código puede ser:
 * - promocional: días de prueba gratis (PRUEBA15) y/o descuento que se aplica en Checkout (FUNDADOR);
 * - de recomendación de otro negocio: crea un Referral (descuento en su primer mes).
 */
router.post('/select-plan', async (req, res) => {
  const parsed = selectPlanSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { planType, promoCode } = parsed.data

  const tenantId = req.user!.tenantId

  let trialDays = 0
  let appliedPromoCode: string | null = null
  let referrerTenantId: string | null = null

  if (promoCode) {
    try {
      const resolved = await resolveSignupCode(promoCode, planType, tenantId)
      if (resolved.kind === 'promo') {
        trialDays = resolved.promo.trialDays
        appliedPromoCode = resolved.promo.code
      } else {
        appliedPromoCode = resolved.code
        referrerTenantId = resolved.referrerTenantId
      }
    } catch (e) {
      if (e instanceof CodeError) return res.status(400).json({ error: e.message })
      throw e
    }
  }

  // Sin código de prueba, la prueba termina hoy: para empezar hay que pagar.
  const trialEndsAt = new Date(Date.now() + trialDays * DAY_MS)

  const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
  const isNewPromoUsage =
    Boolean(appliedPromoCode) && !referrerTenantId && existing?.promoCodeUsed !== appliedPromoCode

  await prisma.$transaction(async (tx) => {
    await tx.tenantSubscription.upsert({
      where: { tenantId },
      update: {
        planType,
        status: 'TRIALING',
        trialEndsAt,
        promoCodeUsed: appliedPromoCode,
      },
      create: {
        tenantId,
        planType,
        status: 'TRIALING',
        trialEndsAt,
        promoCodeUsed: appliedPromoCode,
      },
    })

    // Referido: solo mientras no haya pagado (un referido ya calificado no se cambia).
    const currentReferral = await tx.referral.findUnique({ where: { referredTenantId: tenantId } })
    if (!currentReferral || currentReferral.status === 'PENDING') {
      if (referrerTenantId) {
        await tx.referral.upsert({
          where: { referredTenantId: tenantId },
          update: { referrerTenantId },
          create: { referrerTenantId, referredTenantId: tenantId },
        })
      } else if (currentReferral) {
        await tx.referral.delete({ where: { id: currentReferral.id } })
      }
    }

    if (appliedPromoCode && isNewPromoUsage) {
      await tx.promoCode.update({
        where: { code: appliedPromoCode },
        data: { usedCount: { increment: 1 } },
      })
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: req.user!.id } })
    await tx.user.update({
      where: { id: user.id },
      data: { onboardingStep: advanceStep(user.onboardingStep, 'PLAN_SELECTED') },
    })
  })

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me })
})

/**
 * Continuar sin tarjeta: solo mientras dure la prueba que dio un código.
 * TODO: integrar Stripe / Mercado Pago y reemplazar este bypass.
 */
router.post('/skip-payment', async (req, res) => {
  const tenantId = req.user!.tenantId
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
  if (!sub) {
    return res.status(400).json({ error: 'Debes seleccionar un plan antes de continuar' })
  }

  // Sin prueba vigente (no usó código de prueba) no se puede continuar sin pagar.
  if (sub.status !== 'ACTIVE' && sub.trialEndsAt.getTime() <= Date.now()) {
    return res.status(402).json({
      error: 'Para empezar sin pagar necesitas un código de prueba. Agrega tu tarjeta o vuelve a elegir tu plan con un código.',
      code: 'PAYMENT_REQUIRED',
    })
  }

  await prisma.tenantSubscription.update({
    where: { tenantId },
    data: { paymentDeferred: true },
  })

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me })
})

/**
 * Último paso del onboarding: datos del negocio + logo opcional.
 * La marca propia (house brand) NO se crea aquí — es decisión del usuario en Marcas.
 */
router.post('/create-business', (req, res, next) => {
  imageUpload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Archivo inválido' })
    }
    next()
  })
}, async (req, res) => {
  const parsed = createBusinessSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, rfc, socialUrl, address } = parsed.data
  const tenantId = req.user!.tenantId

  let logoUrl: string | undefined
  if (req.file) {
    const saved = await storage.save(req.file.buffer, safeImageOriginalName(req.file), 'logos')
    logoUrl = saved.url
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: name.trim(),
      rfc: rfc?.trim() || null,
      socialUrl: socialUrl?.trim() || null,
      address: address?.trim() || null,
      onboardingComplete: true,
      ...(logoUrl ? { logoUrl } : {}),
    },
  })

  await ensurePrincipalSucursal(tenantId)

  await prisma.businessPreferences.upsert({
    where: { tenantId },
    update: {},
    create: { tenantId, cutoffDaySlots: [] },
  })

  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } })
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingStep: advanceStep(advanceStep(user.onboardingStep, 'BUSINESS_CREATED'), 'DONE') },
  })

  const me = await buildMeResponse(req.user!.id)
  return res.json({ ok: true, user: me })
})

export default router
