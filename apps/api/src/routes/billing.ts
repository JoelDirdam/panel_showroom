import express, { Router } from 'express'
import { z } from 'zod'
import type { PlanType } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { appUrl, getStripe, isStripeConfigured, priceIdForPlan, taxRateId } from '../lib/stripe.js'
import { dispatchStripeEvent } from '../modules/billing/stripeSync.js'

const MIN_TRIAL_AHEAD_MS = 49 * 60 * 60 * 1000 // Stripe exige trial_end >= 48 h

/** Solo rutas internas del frontend como destino de retorno. */
const returnPathSchema = z
  .string()
  .max(200)
  .regex(/^\/(?!\/)[^\s]*$/)
  .optional()

const checkoutSchema = z.object({
  planType: z
    .enum(['NEGOCIO', 'CITAS_RECORDATORIOS', 'CITAS_PANEL', 'CITAS_IA'])
    .optional(),
  returnPath: returnPathSchema,
})

const portalSchema = z.object({ returnPath: returnPathSchema })

/** Rutas autenticadas del negocio (BUSINESS). Montar en /api/billing. */
export const billingRouter = Router()

billingRouter.use(authenticate, authorize('BUSINESS'))

/** Estado de cobro y planes disponibles (para pintar la pantalla de pago). */
billingRouter.get('/status', async (req, res) => {
  try {
    const sub = await prisma.tenantSubscription.findUnique({
      where: { tenantId: requireTenantId(req.user!) },
    })
    return res.json({
      // Cobro disponible para ESTE negocio: hay clave de Stripe y su plan tiene precio en este entorno.
      stripeConfigured: isStripeConfigured() && (!sub || Boolean(priceIdForPlan(sub.planType))),
      taxIncluded: true,
      taxPercent: taxRateId() ? 16 : 0,
      subscription: sub && {
        planType: sub.planType,
        status: sub.status,
        trialEndsAt: sub.trialEndsAt,
        currentPeriodEndsAt: sub.currentPeriodEndsAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        paymentProvider: sub.paymentProvider,
        hasPaymentMethod: Boolean(sub.externalSubscriptionId),
      },
    })
  } catch (e) {
    return sendError(res, e)
  }
})

/**
 * Crea una sesión de Stripe Checkout (suscripción mensual).
 * Si el negocio sigue en prueba, la tarjeta se captura ahora y el primer cobro
 * ocurre al terminar el trial (sin perder los días gratis ni el código promo).
 */
billingRouter.post('/checkout', async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    const sub = await prisma.tenantSubscription.findUnique({ where: { tenantId } })
    if (!sub) throw new HttpError(400, 'Debes seleccionar un plan antes de pagar')

    const planType: PlanType = parsed.data.planType ?? sub.planType
    const price = priceIdForPlan(planType)
    if (!price) throw new HttpError(400, 'Este plan aún no tiene cobro con tarjeta disponible')

    if (sub.externalSubscriptionId && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
      throw new HttpError(409, 'Ya tienes una suscripción activa. Administra tu plan desde el portal.')
    }

    const stripe = getStripe()

    let customerId = sub.externalCustomerId
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user!.email,
        name: req.user!.name,
        metadata: { tenantId },
      })
      customerId = customer.id
      await prisma.tenantSubscription.update({
        where: { id: sub.id },
        data: { externalCustomerId: customerId, paymentProvider: 'stripe' },
      })
    }

    const trialMsLeft = sub.trialEndsAt.getTime() - Date.now()
    const keepTrial = sub.status === 'TRIALING' && trialMsLeft > MIN_TRIAL_AHEAD_MS

    const taxRate = taxRateId()
    const base = appUrl()
    const back = parsed.data.returnPath ?? '/onboarding/create-business'
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: tenantId,
      line_items: [{ price, quantity: 1 }],
      locale: 'es',
      billing_address_collection: 'auto',
      metadata: { tenantId, planType },
      subscription_data: {
        metadata: { tenantId, planType },
        ...(keepTrial ? { trial_end: Math.floor(sub.trialEndsAt.getTime() / 1000) } : {}),
        ...(taxRate ? { default_tax_rates: [taxRate] } : {}),
      },
      success_url: `${base}${back}${back.includes('?') ? '&' : '?'}checkout=success`,
      cancel_url: `${base}${back}${back.includes('?') ? '&' : '?'}checkout=cancelled`,
    })

    return res.json({ url: session.url })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Portal de Stripe: cambiar tarjeta, ver facturas, cancelar. */
billingRouter.post('/portal', async (req, res) => {
  try {
    const parsed = portalSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    const sub = await prisma.tenantSubscription.findUnique({
      where: { tenantId: requireTenantId(req.user!) },
    })
    if (!sub?.externalCustomerId) {
      throw new HttpError(400, 'Aún no tienes un método de pago registrado')
    }
    const portalConfig = process.env.STRIPE_PORTAL_CONFIG_ID?.trim()
    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.externalCustomerId,
      return_url: `${appUrl()}${parsed.data.returnPath ?? '/'}`,
      ...(portalConfig ? { configuration: portalConfig } : {}),
    })
    return res.json({ url: session.url })
  } catch (e) {
    return sendError(res, e)
  }
})

/**
 * Webhook de Stripe. Montar en /api/billing/webhook ANTES de express.json():
 * la verificación de firma necesita el cuerpo crudo.
 * Idempotente por event.id (ProcessedWebhookEvent).
 */
export const stripeWebhookRouter = Router()

stripeWebhookRouter.post(
  '/',
  express.raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
    const signature = req.header('stripe-signature')
    if (!secret || !signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Webhook no válido' })
    }

    let event
    try {
      event = getStripe().webhooks.constructEvent(req.body, signature, secret)
    } catch {
      return res.status(400).json({ error: 'Firma inválida' })
    }

    try {
      await prisma.processedWebhookEvent.create({
        data: { id: event.id, provider: 'stripe', type: event.type },
      })
    } catch (e) {
      // P2002: ya procesado -> responde 200 para que Stripe no reintente.
      if ((e as { code?: string }).code === 'P2002') return res.json({ received: true, duplicate: true })
      console.error('[billing] no se pudo registrar el evento', e)
      return res.status(500).json({ error: 'Error interno' })
    }

    try {
      await dispatchStripeEvent(event)
      return res.json({ received: true })
    } catch (e) {
      // Libera el id para que el reintento de Stripe vuelva a procesarlo.
      await prisma.processedWebhookEvent.delete({ where: { id: event.id } }).catch(() => undefined)
      console.error(`[billing] error procesando ${event.type} (${event.id})`, e)
      return res.status(500).json({ error: 'Error procesando el evento' })
    }
  },
)
