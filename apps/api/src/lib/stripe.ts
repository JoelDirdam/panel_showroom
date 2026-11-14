import Stripe from 'stripe'
import type { PlanType } from '@prisma/client'
import { HttpError } from './httpError.js'

let client: Stripe | null = null

/** Cliente de Stripe (lazy). Falla con 503 si no hay STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) throw new HttpError(503, 'El cobro con tarjeta no está configurado')
  if (!client) client = new Stripe(key)
  return client
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

/** Plan -> variable de entorno con el price_... de Stripe. */
const PRICE_ENV: Partial<Record<PlanType, string>> = {
  CITAS_RECORDATORIOS: 'STRIPE_PRICE_CITAS_RECORDATORIOS',
  CITAS_PANEL: 'STRIPE_PRICE_CITAS_PANEL',
  CITAS_IA: 'STRIPE_PRICE_CITAS_IA',
}

export function priceIdForPlan(plan: PlanType): string | null {
  const name = PRICE_ENV[plan]
  const value = name ? process.env[name]?.trim() : undefined
  return value || null
}

export function planForPriceId(priceId: string | null | undefined): PlanType | null {
  if (!priceId) return null
  for (const plan of Object.keys(PRICE_ENV) as PlanType[]) {
    if (priceIdForPlan(plan) === priceId) return plan
  }
  return null
}

/** URL base del frontend (success/cancel de Checkout y retorno del portal). */
export function appUrl(): string {
  const explicit = process.env.APP_URL?.trim()
  if (explicit) return explicit.replace(/\/+$/, '')
  const firstCors = process.env.CORS_ORIGIN?.split(',')[0]?.trim()
  return (firstCors || 'http://localhost:5173').replace(/\/+$/, '')
}

/** Tasa de IVA (txr_...) que se suma a cada suscripción. Vacío = sin impuesto. */
export function taxRateId(): string | null {
  return process.env.STRIPE_TAX_RATE_ID?.trim() || null
}
