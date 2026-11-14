import api from './api'
import type { PlanType } from '@/lib/entitlements'

export interface BillingStatus {
  stripeConfigured: boolean
  taxPercent: number
  subscription: {
    planType: PlanType
    status: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED'
    trialEndsAt: string
    currentPeriodEndsAt: string | null
    cancelAtPeriodEnd: boolean
    paymentProvider: string | null
    hasPaymentMethod: boolean
  } | null
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const { data } = await api.get<BillingStatus>('/billing/status')
  return data
}

/** Crea la sesión de pago y devuelve la URL de Stripe a la que hay que redirigir. */
export async function startCheckout(returnPath: string, planType?: PlanType): Promise<string> {
  const { data } = await api.post<{ url: string }>('/billing/checkout', { returnPath, planType })
  return data.url
}

/** Portal de Stripe: cambiar tarjeta, ver recibos, cancelar. */
export async function openBillingPortal(returnPath: string): Promise<string> {
  const { data } = await api.post<{ url: string }>('/billing/portal', { returnPath })
  return data.url
}

export interface RemindersStatus {
  schedulerEnabled: boolean
  remindersEnabled: boolean
  mode: 'own' | 'platform' | 'none'
  hoursBefore: number
  own: {
    connected: boolean
    phoneNumberId: string
    wabaId: string
    displayPhoneNumber: string
    verifiedName: string
    templateStatus: string
  }
}

export async function fetchRemindersStatus(): Promise<RemindersStatus> {
  const { data } = await api.get<RemindersStatus>('/v1/whatsapp-config/reminders')
  return data
}

export async function setRemindersEnabled(remindersEnabled: boolean): Promise<RemindersStatus> {
  const { data } = await api.patch<RemindersStatus>('/v1/whatsapp-config/reminders', { remindersEnabled })
  return data
}

export async function connectWhatsappNumber(payload: {
  phoneNumberId: string
  wabaId: string
  accessToken: string
}): Promise<RemindersStatus> {
  const { data } = await api.post<RemindersStatus>('/v1/whatsapp-config/connect', payload)
  return data
}

export async function refreshWhatsappTemplate(): Promise<RemindersStatus> {
  const { data } = await api.post<RemindersStatus>('/v1/whatsapp-config/refresh-template')
  return data
}

export async function disconnectWhatsappNumber(): Promise<RemindersStatus> {
  const { data } = await api.post<RemindersStatus>('/v1/whatsapp-config/disconnect')
  return data
}

export async function sendTestReminder(phone: string): Promise<{ ok: boolean; sentFrom: 'own' | 'platform' }> {
  const { data } = await api.post<{ ok: boolean; sentFrom: 'own' | 'platform' }>('/v1/whatsapp-config/test', {
    phone,
  })
  return data
}

export function formatMxn(amount: number): string {
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}
