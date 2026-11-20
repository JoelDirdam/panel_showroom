import api, { type User } from './api'

// --- Mi cuenta: seguridad (2FA) ---------------------------------------------------

export interface SecurityStatus {
  twoFactorEnabled: boolean
  twoFactorEnabledAt: string | null
  twoFactorRequired: boolean
  recoveryCodesLeft: number
}

export async function fetchSecurity(): Promise<SecurityStatus> {
  const { data } = await api.get<SecurityStatus>('/account/security')
  return data
}

export async function startTwoFactorSetup(password: string): Promise<{ secret: string; otpauthUrl: string }> {
  const { data } = await api.post('/account/2fa/setup', { password })
  return data
}

export async function enableTwoFactor(code: string): Promise<{ recoveryCodes: string[]; user: User }> {
  const { data } = await api.post('/account/2fa/enable', { code })
  return data
}

export async function disableTwoFactor(password: string, code: string): Promise<{ user: User }> {
  const { data } = await api.post('/account/2fa/disable', { password, code })
  return data
}

export async function regenerateRecoveryCodes(password: string, code: string): Promise<{ recoveryCodes: string[] }> {
  const { data } = await api.post('/account/2fa/recovery-codes', { password, code })
  return data
}

// --- Mi cuenta: privacidad y datos -------------------------------------------------

export interface PrivacyStatus {
  marketingOptIn: boolean
  marketingOptInAt: string | null
  marketingOptOutAt: string | null
  termsAcceptances: { version: string; signedName: string; acceptedAt: string; source: string }[]
  consentEvents: { kind: string; granted: boolean; source: string; createdAt: string }[]
  /** 'business' = borra el negocio completo; 'user' = solo tu usuario; 'none' = no aplica. */
  deletionScope: 'business' | 'user' | 'none'
  twoFactorEnabled: boolean
}

export async function fetchPrivacy(): Promise<PrivacyStatus> {
  const { data } = await api.get<PrivacyStatus>('/account/privacy')
  return data
}

export async function setMarketingOptIn(optIn: boolean): Promise<{ marketingOptIn: boolean; user: User }> {
  const { data } = await api.patch('/account/marketing', { optIn })
  return data
}

/** Descarga la copia de datos como archivo JSON. */
export async function downloadMyData(): Promise<void> {
  const res = await api.get('/account/export', { responseType: 'blob' })
  const disposition = String(res.headers['content-disposition'] ?? '')
  const match = /filename="([^"]+)"/.exec(disposition)
  const filename = match?.[1] ?? `cosdi-mis-datos-${new Date().toISOString().slice(0, 10)}.json`
  const url = URL.createObjectURL(res.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function deleteMyAccount(payload: {
  password: string
  confirm: string
  code?: string
}): Promise<{ ok: boolean; scope: string }> {
  const { data } = await api.post('/account/delete', payload)
  return data
}

// --- Suscripción ---------------------------------------------------------------------

export async function cancelSubscription(): Promise<{ accessUntil: string | null }> {
  const { data } = await api.post('/billing/cancel')
  return data
}

export async function resumeSubscription(): Promise<void> {
  await api.post('/billing/resume')
}

// --- Sitio público ---------------------------------------------------------------------

export async function unsubscribeMarketing(token: string): Promise<{ ok: boolean; email?: string }> {
  const { data } = await api.post('/site/unsubscribe', { token })
  return data
}

export interface CopyrightClaimPayload {
  claimantName: string
  claimantEmail: string
  claimantPhone?: string | null
  rightsHolder: string
  workDescription: string
  infringingUrl: string
  details?: string | null
  goodFaith: boolean
  accuracy: boolean
  signature: string
}

export async function submitCopyrightClaim(payload: CopyrightClaimPayload): Promise<{ id: string }> {
  const { data } = await api.post('/site/copyright-claims', payload)
  return data
}

// --- Panel de plataforma ----------------------------------------------------------------

export interface PlatformAnalytics {
  months: { month: string; signups: number; deletions: number }[]
  totals: { tenants: number; tenantsLast30Days: number }
  funnel: { step: string; count: number }[]
  subscriptions: { planType: string; status: string; count: number }[]
  billing: { withCard: number; cancelScheduled: number; paidLast30Days: number }
  promoUsage: { code: string; count: number }[]
  users: { total: number; twoFactor: number; marketingOptIn: number }
  legal: { termsAcceptances: number; openCopyrightClaims: number }
}

export async function fetchPlatformAnalytics(): Promise<PlatformAnalytics> {
  const { data } = await api.get<PlatformAnalytics>('/platform/analytics')
  return data
}

export type PromoPlanType = 'NEGOCIO' | 'CITAS_RECORDATORIOS' | 'CITAS_PANEL' | 'CITAS_IA'

export interface PromoDiscount {
  discountPercent?: number | null
  discountAmountMxn?: number | null
  discountMonths?: number | null
  planTypes?: PromoPlanType[]
}

export interface PromoCode extends PromoDiscount {
  id: string
  code: string
  trialDays: number
  active: boolean
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  note: string | null
  createdAt: string
}

export interface PromoCodeInput extends PromoDiscount {
  code?: string
  trialDays?: number
  maxUses?: number | null
  expiresAt?: string | null
  note?: string | null
  active?: boolean
}

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const { data } = await api.get<PromoCode[]>('/platform/promo-codes')
  return data
}

export async function createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
  const { data } = await api.post<PromoCode>('/platform/promo-codes', input)
  return data
}

export async function updatePromoCode(id: string, input: PromoCodeInput): Promise<PromoCode> {
  const { data } = await api.patch<PromoCode>(`/platform/promo-codes/${id}`, input)
  return data
}

export async function deletePromoCode(id: string): Promise<void> {
  await api.delete(`/platform/promo-codes/${id}`)
}

export interface TrackerSettings {
  ga4: { enabled: boolean; id: string }
  metaPixel: { enabled: boolean; id: string }
  hotjar: { enabled: boolean; id: string }
  contentsquare: { enabled: boolean; id: string }
}

export async function fetchTrackerSettings(): Promise<TrackerSettings> {
  const { data } = await api.get<TrackerSettings>('/platform/settings/trackers')
  return data
}

export async function saveTrackerSettings(value: TrackerSettings): Promise<TrackerSettings> {
  const { data } = await api.put<TrackerSettings>('/platform/settings/trackers', value)
  return data
}

export interface Paged<T> {
  items: T[]
  total: number
  take: number
  skip: number
}

export interface TermsAcceptanceRow {
  id: string
  version: string
  signedName: string
  acceptedAt: string
  ip: string | null
  email: string | null
  userAgent: string | null
  contentHash: string | null
  source: string
  userDeletedAt: string | null
  user: { id: string; email: string; name: string; role: string } | null
}

export async function fetchAcceptances(
  q: string,
  offset: number,
): Promise<Paged<TermsAcceptanceRow> & { versions: { version: string; title: string; publishedAt: string }[] }> {
  const { data } = await api.get('/platform/legal/acceptances', { params: { q: q || undefined, offset, limit: 25 } })
  return data
}

export interface ConsentRow {
  id: string
  email: string
  kind: string
  granted: boolean
  source: string
  ip: string | null
  createdAt: string
}

export async function fetchConsents(): Promise<Paged<ConsentRow>> {
  const { data } = await api.get('/platform/legal/consents', { params: { limit: 50 } })
  return data
}

export interface DeletionRow {
  id: string
  email: string | null
  tenantName: string | null
  scope: string
  reason: string
  deletedAt: string
}

export async function fetchDeletions(): Promise<Paged<DeletionRow>> {
  const { data } = await api.get('/platform/legal/deletions', { params: { limit: 50 } })
  return data
}

export interface CopyrightClaimRow {
  id: string
  claimantName: string
  claimantEmail: string
  claimantPhone: string | null
  rightsHolder: string
  workDescription: string
  infringingUrl: string
  details: string | null
  signature: string
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED'
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
}

export async function fetchCopyrightClaims(): Promise<Paged<CopyrightClaimRow>> {
  const { data } = await api.get('/platform/legal/copyright-claims', { params: { limit: 50 } })
  return data
}

export async function updateCopyrightClaim(
  id: string,
  input: { status?: CopyrightClaimRow['status']; adminNote?: string | null },
): Promise<CopyrightClaimRow> {
  const { data } = await api.patch<CopyrightClaimRow>(`/platform/legal/copyright-claims/${id}`, input)
  return data
}

export interface RetentionStatus {
  policy: Record<string, number>
  purgeEnabled: boolean
  emailConfigured: boolean
  inactiveTenants: {
    id: string
    name: string
    slug: string
    accessEndedAt: string
    noticeSentAt: string | null
    deleteAfter: string
  }[]
}

export async function fetchRetention(): Promise<RetentionStatus> {
  const { data } = await api.get<RetentionStatus>('/platform/retention')
  return data
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })
}

// --- Operaciones de plataforma ---------------------------------------------------------

export async function extendTenantTrial(
  id: string,
  days: number,
  reason?: string,
): Promise<{ trialEndsAt: string; stripeUpdated: boolean }> {
  const { data } = await api.post(`/platform/tenants/${id}/extend-trial`, { days, reason: reason || null })
  return data
}

export async function suspendTenant(
  id: string,
  reason: string,
  notify: boolean,
): Promise<{ billingPaused: boolean; notified: number }> {
  const { data } = await api.post(`/platform/tenants/${id}/suspend`, { reason, notify })
  return data
}

export async function reactivateTenant(
  id: string,
  notify: boolean,
): Promise<{ billingResumed: boolean; notified: number }> {
  const { data } = await api.post(`/platform/tenants/${id}/reactivate`, { notify })
  return data
}

export async function setTenantTestFlag(id: string, isTest: boolean): Promise<{ isTest: boolean }> {
  const { data } = await api.post(`/platform/tenants/${id}/test-flag`, { isTest })
  return data
}

/** A quién se avisa por correo al publicar términos. Las cuentas de prueba nunca entran en 'real'. */
export type TermsNotifyAudience = 'none' | 'real' | 'test'

export interface AuditEntry {
  id: string
  actorEmail: string
  action: string
  targetType: string | null
  targetId: string | null
  targetLabel: string | null
  details: Record<string, unknown> | null
  ip: string | null
  createdAt: string
}

export async function fetchAuditLog(params: {
  offset?: number
  limit?: number
  action?: string
  q?: string
  targetId?: string
}): Promise<Paged<AuditEntry>> {
  const { data } = await api.get('/platform/audit-log', {
    params: {
      offset: params.offset ?? 0,
      limit: params.limit ?? 50,
      action: params.action || undefined,
      q: params.q || undefined,
      targetId: params.targetId || undefined,
    },
  })
  return data
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Inicio de sesión',
  'account.2fa_enable': 'Activó la verificación en dos pasos',
  'account.2fa_disable': 'Desactivó la verificación en dos pasos',
  'account.2fa_recovery_codes': 'Generó códigos de recuperación',
  'account.2fa_reset': 'Restableció el 2FA desde el servidor',
  'tenant.extend_trial': 'Extendió la prueba',
  'tenant.suspend': 'Suspendió el negocio',
  'tenant.reactivate': 'Reactivó el negocio',
  'tenant.delete': 'Eliminó el negocio',
  'tenant.mark_test': 'Marcó el negocio como cuenta de prueba',
  'tenant.unmark_test': 'Quitó la marca de cuenta de prueba',
  'user.delete_test': 'Eliminó un usuario de prueba',
  'user.delete_orphan': 'Eliminó un usuario sin negocio',
  'promo.create': 'Creó un código de promoción',
  'promo.update': 'Editó un código de promoción',
  'promo.activate': 'Activó un código de promoción',
  'promo.deactivate': 'Desactivó un código de promoción',
  'promo.delete': 'Quitó un código de promoción',
  'settings.trackers': 'Cambió las integraciones de analítica',
  'copyright_claim.update': 'Actualizó un reclamo de derechos de autor',
  'terms.publish': 'Publicó una versión de los términos',
}

export type StripeRevenue =
  | { configured: false }
  | {
      configured: true
      mode: 'live' | 'test'
      months: { month: string; gross: number; refunds: number; net: number; invoices: number }[]
      totals: { gross12m: number; refunds12m: number; net12m: number; grossThisMonth: number }
      mrr: number
      expectedNext30Days: number
      subscriptions: { active: number; trialing: number; pastDue: number; canceling: number; paused: number }
      lastPaymentAt: string | null
      ignoredOtherCurrency: number
      truncated: boolean
      fetchedAt: string
    }

export async function fetchStripeRevenue(refresh = false): Promise<StripeRevenue> {
  const { data } = await api.get<StripeRevenue>('/platform/revenue', { params: refresh ? { refresh: '1' } : {} })
  return data
}

export interface TermsAdmin {
  activeUsers: number
  /** Usuarios con correo verificado: de cuentas reales y de cuentas de prueba. */
  recipients: { real: number; test: number }
  current: {
    version: string
    title: string
    summary: string | null
    content: string
    publishedAt: string
    acceptedBy: number
  } | null
  versions: { version: string; title: string; summary: string | null; publishedAt: string; contentHash: string; acceptedBy: number }[]
  draft: {
    version: string
    title: string
    summary: string
    content: string
    published: boolean
    publishedWithSameText: boolean
  }
}

export async function fetchTermsAdmin(): Promise<TermsAdmin> {
  const { data } = await api.get<TermsAdmin>('/platform/terms')
  return data
}

export async function publishTerms(payload: {
  version: string
  title: string
  summary: string
  content: string
  confirm: true
  notify: TermsNotifyAudience
}): Promise<{ version: string; publishedAt: string; queued: number }> {
  const { data } = await api.post('/platform/terms', payload)
  return data
}

export interface PlatformHealth {
  status: 'ok' | 'warn' | 'error'
  checkedAt: string
  environment: string
  deploymentId: string | null
  uptimeSeconds: number
  node: string
  checks: { key: string; group: string; label: string; status: 'ok' | 'warn' | 'error' | 'off'; detail: string }[]
}

export async function fetchPlatformHealth(): Promise<PlatformHealth> {
  const { data } = await api.get<PlatformHealth>('/platform/health')
  return data
}

export function formatMxn(amount: number): string {
  return amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
}
