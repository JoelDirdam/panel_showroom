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

const router = Router()

const PLAN_TYPES: PlanType[] = ['NEGOCIO', 'CLINICA', 'RESTAURANTE', 'MARCA']
const TRIAL_BASE_DAYS = 15
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
 * Selecciona el plan y activa el trial. Sin promo: 15 días. Con MANEKI30
 * (extraTrialDays=15): 15 + 15 = 30 días.
 */
router.post('/select-plan', async (req, res) => {
  const parsed = selectPlanSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { planType, promoCode } = parsed.data

  let extraTrialDays = 0
  let appliedPromoCode: string | null = null

  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } })
    if (!promo || !promo.active || (promo.maxUses !== null && promo.usedCount >= promo.maxUses)) {
      return res.status(400).json({ error: 'Código promocional inválido o expirado' })
    }
    extraTrialDays = promo.extraTrialDays
    appliedPromoCode = promo.code
  }

  const trialEndsAt = new Date(Date.now() + (TRIAL_BASE_DAYS + extraTrialDays) * DAY_MS)
  const tenantId = req.user!.tenantId

  const existing = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
  const isNewPromoUsage = Boolean(appliedPromoCode) && existing?.promoCodeUsed !== appliedPromoCode

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
 * Stub de pago: el usuario continúa con la prueba gratis sin Stripe/MP.
 * TODO: integrar Stripe / Mercado Pago y reemplazar este bypass.
 */
router.post('/skip-payment', async (req, res) => {
  const tenantId = req.user!.tenantId
  const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
  if (!sub) {
    return res.status(400).json({ error: 'Debes seleccionar un plan antes de continuar' })
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
