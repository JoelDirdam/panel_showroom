import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

export interface User {
  id: string
  email: string
  name: string
  role: 'BUSINESS' | 'BRAND' | 'SUPER_ADMIN'
  tenantId?: string | null
  brandId: string | null
  mustChangePassword?: boolean
  brand?: { id: string; name: string } | null
  /**
   * `GET /auth/me` ya los devuelve (ver `apps/api/src/lib/meShape.ts`).
   * Se declaran opcionales porque `POST /auth/login` todavía responde el
   * shape corto (sin `entitlements`/`subscription`) — ver
   * `apps/web/src/lib/entitlements.ts` y `docs/plans-contracts.md`.
   */
  entitlements?: import('@/lib/entitlements').EntitlementModule[]
  featureFlags?: import('@/lib/entitlements').FeatureFlag[]
  subscription?: {
    planType: import('@/lib/entitlements').PlanType
    status: 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED'
    trialEndsAt: string
    promoCodeUsed: string | null
    paymentDeferred?: boolean
    currentPeriodEndsAt?: string | null
    paymentProvider?: string | null
  } | null
  setupStatus?: {
    businessConfigured: boolean
    hasHouseBrand: boolean
    brandCount: number
    houseBrandId: string | null
  } | null
  /**
   * Resto del shape de `buildMeResponse` (ver `apps/api/src/lib/meShape.ts`),
   * usado por la vista de Preferencias (Agente D). Opcionales por la misma
   * razón que `entitlements` arriba (login corto vs. `/auth/me` completo).
   */
  phone?: string | null
  phoneVerifiedAt?: string | null
  emailVerifiedAt?: string | null
  timezone?: string | null
  onboardingStep?: OnboardingStep
  terms?: {
    currentVersion: string | null
    accepted: boolean
    acceptedVersion: string | null
    acceptedAt: string | null
  }
  tenant?: {
    id: string
    name: string
    slug: string
    rfc: string | null
    socialUrl: string | null
    address: string | null
    logoUrl: string | null
    onboardingComplete: boolean
  } | null
  preferences?: BusinessPreferences | null
}

/** Debe reflejar `enum OnboardingStep` de `apps/api/prisma/schema.prisma`. */
export type OnboardingStep = 'REGISTERED' | 'EMAIL_VERIFIED' | 'PLAN_SELECTED' | 'BUSINESS_CREATED' | 'DONE'

export function extractApiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } }
  return err.response?.data?.error || fallback
}

/** Ver modelo `TermsDocument` en `apps/api/prisma/schema.prisma` (Agente B). */
export interface TermsDocument {
  id: string
  version: string
  title: string
  content: string
  publishedAt: string
}

export async function fetchCurrentTerms(): Promise<TermsDocument> {
  const { data } = await api.get<TermsDocument>('/terms/current')
  return data
}

export interface RegisterPayload {
  name: string
  email: string
  phone: string
  password: string
  signedName: string
  termsVersion: string
}

export interface AuthResult {
  token: string
  user: User
  devCode?: string
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/register', payload)
  return data
}

export async function verifyEmailCode(code: string): Promise<{ ok: boolean; user: User }> {
  const { data } = await api.post<{ ok: boolean; user: User }>('/auth/verify-email', { code })
  return data
}

export async function changeEmail(email: string): Promise<{ ok: boolean; user: User; devCode?: string }> {
  const { data } = await api.post<{ ok: boolean; user: User; devCode?: string }>('/auth/change-email', { email })
  return data
}

export async function acceptTerms(
  signedName: string,
  termsVersion: string,
): Promise<{ ok: boolean; user: User }> {
  const { data } = await api.post<{ ok: boolean; user: User }>('/auth/accept-terms', { signedName, termsVersion })
  return data
}

export async function selectPlan(
  planType: import('@/lib/entitlements').PlanType,
  promoCode?: string,
): Promise<{ ok: boolean; user: User }> {
  const { data } = await api.post<{ ok: boolean; user: User }>('/onboarding/select-plan', {
    planType,
    promoCode: promoCode?.trim() || undefined,
  })
  return data
}

/** Stub de pago: continúa con prueba gratis (Stripe/MP pendiente). */
export async function skipPayment(): Promise<{ ok: boolean; user: User }> {
  const { data } = await api.post<{ ok: boolean; user: User }>('/onboarding/skip-payment')
  return data
}

export interface CreateBusinessPayload {
  name: string
  rfc?: string | null
  socialUrl?: string | null
  address?: string | null
  logo?: File | null
}

export async function createBusiness(payload: CreateBusinessPayload): Promise<{ ok: boolean; user: User }> {
  const form = new FormData()
  form.append('name', payload.name)
  if (payload.rfc) form.append('rfc', payload.rfc)
  if (payload.socialUrl) form.append('socialUrl', payload.socialUrl)
  if (payload.address) form.append('address', payload.address)
  if (payload.logo) form.append('logo', payload.logo)
  const { data } = await api.post<{ ok: boolean; user: User }>('/onboarding/create-business', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export type CutoffType = 'WEEKLY' | 'MONTHLY_FIXED'
export type UsdRateMode = 'FIXED' | 'AUTOMATIC'

/** Ver modelo `BusinessPreferences` en `apps/api/prisma/schema.prisma` (Agente B). */
export interface BusinessPreferences {
  id: string
  tenantId: string
  primaryTerminalCommission: string | null
  secondaryTerminalCommission: string | null
  transferCommission: string | null
  layawayDueDays: number
  labelWidthMm: number | null
  labelHeightMm: number | null
  flexibleInventory: boolean
  printTickets: boolean
  ticketFixedComment: string | null
  chargeIva: boolean
  usdEnabled: boolean
  usdRateMode: UsdRateMode | null
  usdFixedRate: string | null
  cutoffType: CutoffType
  cutoffWeekday: number | null
  cutoffDaySlots: number[]
  createdAt: string
  updatedAt: string
}

export interface UpdateBusinessPreferencesPayload {
  primaryTerminalCommission?: number | null
  secondaryTerminalCommission?: number | null
  transferCommission?: number | null
  layawayDueDays?: number
  labelWidthMm?: number | null
  labelHeightMm?: number | null
  flexibleInventory?: boolean
  printTickets?: boolean
  ticketFixedComment?: string | null
  chargeIva?: boolean
  usdEnabled?: boolean
  usdRateMode?: UsdRateMode | null
  usdFixedRate?: number | null
  cutoffType?: CutoffType
  cutoffWeekday?: number | null
  cutoffDaySlots?: number[]
}

export async function fetchPreferences(): Promise<BusinessPreferences> {
  const { data } = await api.get<BusinessPreferences>('/preferences')
  return data
}

export async function updatePreferences(
  payload: UpdateBusinessPreferencesPayload,
): Promise<BusinessPreferences & { brandsAligned?: number }> {
  const { data } = await api.patch<BusinessPreferences & { brandsAligned?: number }>(
    '/preferences',
    payload,
  )
  return data
}

export interface UpdateProfilePayload {
  name?: string
  email?: string
  phone?: string | null
  timezone?: string
}

export interface UpdateProfileResult {
  ok: boolean
  user: User
  devEmailCode?: string
  devPhoneCode?: string
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<UpdateProfileResult> {
  const { data } = await api.patch<UpdateProfileResult>('/auth/profile', payload)
  return data
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  const { data } = await api.post<{ ok: boolean }>('/auth/change-password', { currentPassword, newPassword })
  return data
}

export async function resendPhoneVerification(): Promise<{ ok: boolean; devCode?: string }> {
  const { data } = await api.post<{ ok: boolean; devCode?: string }>('/auth/resend-phone-code')
  return data
}

export async function verifyPhoneCode(code: string): Promise<{ ok: boolean; user: User }> {
  const { data } = await api.post<{ ok: boolean; user: User }>('/auth/verify-phone', { code })
  return data
}

export async function resendEmailVerification(): Promise<{ ok: boolean; devCode?: string }> {
  const { data } = await api.post<{ ok: boolean; devCode?: string }>('/auth/resend-email-code')
  return data
}

export interface DashboardStats {
  totalProducts: number
  totalBrands?: number
  totalStockUnits: number
  lowStockCount: number
  lowStockItems: Array<{
    id: string
    quantity: number
    minStock: number
    product: {
      id: string
      name: string
      sku: string
      brand: { id: string; name: string }
    }
  }>
}

export interface DashboardAnalytics {
  kpis: {
    revenueMonth: number
    revenueChangePct: number
    customersMonth: number
    customersChangePct: number
    avgTicketMonth: number
    avgTicketChangePct: number
    lowStockCount: number
    totalStockUnits: number
  }
  sparkline: {
    layawaysOpen: number
    layawayWeekDelta: number
    salesWeekCount: number
    salesWeekChangePct: number
    salesLast7Days: number[]
    revenueLast7Days: number[]
  }
  salesByBrandMonthly: {
    months: string[]
    series: Array<{ name: string; data: number[] }>
  }
  weekly: {
    days: string[]
    revenueByDay: number[]
    avgDailySales: number
    avgDailyChangePct: number
    topProducts: Array<{ name: string; qty: number; changeDir: 'up' | 'down' | 'flat' }>
  }
  recentSales: Array<{
    id: string
    ticketNumber: number
    soldAt: string
    total: number
    paymentMethod: string
    customerName: string | null
    attendantName: string | null
  }>
  activities: Array<{
    id: string
    type: 'sale' | 'product_request' | 'appointment'
    actorName: string
    action: string
    reference: string
    at: string
  }>
  lowStockItems: DashboardStats['lowStockItems']
}

export interface HomeSummary {
  salesTodayCount: number
  salesTodayTotal: number
  totalProducts: number
  totalBrands: number
  totalEmployees: number
  lowStockCount: number
  setupStatus: {
    businessConfigured: boolean
    hasHouseBrand: boolean
    houseBrandId: string | null
  }
}

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const { data } = await api.get<HomeSummary>('/dashboard/home-summary')
  return data
}

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  const { data } = await api.get<DashboardAnalytics>('/dashboard/analytics')
  return data
}

export type CommissionFeePayer = 'BRAND' | 'CLIENT' | 'BUSINESS'

export interface Brand {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  whatsapp: string | null
  phone: string | null
  active: boolean
  isHouseBrand: boolean
  monthlyRent: string
  assignedSpace: string | null
  cutoffDaySlots: number[]
  commissionPercent: string
  cardFeePayer: CommissionFeePayer
  transferFeePayer: CommissionFeePayer
  inviteCodeExpiresAt: string | null
  ownerUserId: string | null
  owner?: { id: string; name: string; email: string } | null
  _count?: { products: number; users: number }
  temporaryPassword?: string
}

export interface BrandStats {
  total: number
  withBusiness: number
  withOwner: number
  avgRent: number
}

export interface BrandImportResult {
  createdCount: number
  errorCount: number
  errors: Array<{ row: number; name?: string; error: string }>
}

export interface BrandInviteCode {
  code: string
  expiresAt: string
}

export async function fetchBrandStats(): Promise<BrandStats> {
  const { data } = await api.get<BrandStats>('/brands/stats')
  return data
}

export async function generateBrandInviteCode(brandId: string): Promise<BrandInviteCode> {
  const { data } = await api.post<BrandInviteCode>(`/brands/${brandId}/invite-code`)
  return data
}

export async function unlinkBrandOwner(brandId: string): Promise<void> {
  await api.post(`/brands/${brandId}/unlink-owner`)
}

export async function redeemBrandInvite(code: string): Promise<{ ok: boolean; brand: { id: string; name: string } }> {
  const { data } = await api.post('/brands/redeem-invite', { code })
  return data
}

export async function downloadBrandsTemplate(): Promise<Blob> {
  const { data } = await api.get('/brands/template', { responseType: 'blob' })
  return data
}

export async function importBrandsCsv(csv: string): Promise<BrandImportResult> {
  const { data } = await api.post<BrandImportResult>('/brands/import', { csv })
  return data
}

export async function importBrandsRows(
  rows: Array<Record<string, string | number | number[] | null | undefined>>,
): Promise<BrandImportResult> {
  const { data } = await api.post<BrandImportResult>('/brands/import', { rows })
  return data
}

export async function bulkDeleteBrands(
  ids: string[],
): Promise<{ deleted: number; deactivated: number; skipped: Array<{ id: string; reason: string }> }> {
  const { data } = await api.post('/brands/bulk-delete', { ids })
  return data
}

export interface Category {
  id: string
  tenantId: string
  name: string
  slug: string
  active: boolean
}

export async function fetchCategories(includeInactive = false): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories', {
    params: includeInactive ? { includeInactive: true } : undefined,
  })
  return data
}

export async function createCategory(name: string): Promise<Category> {
  const { data } = await api.post<Category>('/categories', { name })
  return data
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  price: string | null
  imageUrl: string | null
  brandId: string
  categoryId: string | null
  category?: { id: string; name: string } | null
  brand: { id: string; name: string; isHouseBrand?: boolean }
  stock: { id: string; quantity: number; minStock: number } | null
  stockEntries?: StockEntry[]
}

export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ url: string }>('/products/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data.url
}

export async function bulkDeleteProducts(ids: string[]): Promise<{ deleted: number; skipped: number }> {
  const { data } = await api.post('/products/bulk-delete', { ids })
  return data
}

export interface ProductImportResult {
  createdCount: number
  errorCount: number
  errors: Array<{ row: number; name?: string; error: string }>
}

export async function downloadProductsTemplate(): Promise<Blob> {
  const { data } = await api.get('/products/template', { responseType: 'blob' })
  return data
}

export async function importProductsRows(
  rows: Array<Record<string, string | number | null | undefined>>,
  brandId?: string,
): Promise<ProductImportResult> {
  const { data } = await api.post<ProductImportResult>('/products/import', { rows, brandId })
  return data
}

export async function withdrawStock(productId: string, quantity: number, note?: string) {
  const { data } = await api.post(`/stock/${productId}/withdraw`, { quantity, note: note || undefined })
  return data
}

export interface BrandSummary {
  brandId: string
  from: string
  to: string
  rent: number
  accruedRent: number
  cutBreakdown: {
    efectivo: number
    tarjeta: number
    transferencia: number
    otro: number
  }
  totalCut: number
  dailySeries: Array<{ date: string; total: number }>
}

export async function fetchBrandSummary(brandId: string, from?: string, to?: string): Promise<BrandSummary> {
  const { data } = await api.get<BrandSummary>(`/brands/${brandId}/summary`, {
    params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
  })
  return data
}

export interface StockEntry {
  id: string
  productId: string
  quantity: number
  note: string | null
  createdById: string | null
  createdAt: string
  createdBy?: { id: string; name: string } | null
}

export interface StockItem {
  id: string
  quantity: number
  minStock: number
  product: Product
}

export type ProductRequestType = 'CREATE_PRODUCT' | 'RESTOCK' | 'WITHDRAWAL'
export type ProductRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED'

export interface ProductRequest {
  id: string
  type: ProductRequestType
  status: ProductRequestStatus
  brandId: string
  brand: { id: string; name: string; whatsapp: string | null }
  productId: string | null
  product: { id: string; name: string; sku: string; price: string | null } | null
  name: string | null
  sku: string | null
  categoryId: string | null
  category?: { id: string; name: string } | null
  description: string | null
  price: string | null
  imageUrl: string | null
  quantity: number
  minStock: number
  notes: string | null
  requestedBy?: { id: string; name: string } | null
  acceptedBy?: { id: string; name: string } | null
  acceptedAt: string | null
  rejectedBy?: { id: string; name: string } | null
  rejectedAt: string | null
  createdAt: string
}

export interface ProductRequestFilters {
  status?: ProductRequestStatus | 'ALL'
  brandId?: string
  from?: string
  to?: string
}

export async function fetchProductRequests(filters: ProductRequestFilters = {}): Promise<ProductRequest[]> {
  const { data } = await api.get<ProductRequest[]>('/product-requests', {
    params: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    },
  })
  return data
}

export async function acceptProductRequests(ids: string[]): Promise<{ accepted: ProductRequest[] }> {
  const { data } = await api.post('/product-requests/accept', { ids })
  return data
}

export async function rejectProductRequests(ids: string[]): Promise<{ rejected: number }> {
  const { data } = await api.post('/product-requests/reject', { ids })
  return data
}

export type ScheduleType = 'STOCK_DELIVERY' | 'CUT_PICKUP'

export interface AgendaSettings {
  stockDeliveryEnabled: boolean
  cutPickupEnabled: boolean
  timezone?: string
}

/** ISO weekday: 1=Lun … 7=Dom */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface WeeklyScheduleRule {
  id: string
  type: ScheduleType
  weekday: number
  startTime: string
  endTime: string
  intervalMinutes: number
  active: boolean
}

export interface WeeklyRuleDayInput {
  weekday: Weekday
  startTime: string
  endTime: string
}

export interface Appointment {
  id: string
  brandId: string
  brand: { id: string; name: string; whatsapp?: string | null }
  slotId: string
  slot: ScheduleSlot
  notes: string | null
  createdAt: string
}

export interface ScheduleSlot {
  id: string
  type: ScheduleType
  startAt: string
  endAt: string
  active: boolean
  ruleId?: string | null
  booked?: boolean
  appointment?: Appointment | null
  ownAppointment?: Appointment | null
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO' | 'MIXTO'
export type SplitPaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA'

export interface SalePayment {
  id: string
  saleId: string
  method: SplitPaymentMethod
  amount: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: 'BUSINESS' | 'BRAND'
}

export interface Employee {
  id: string
  tenantId: string
  name: string
  email: string | null
  phone: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export async function fetchEmployees(activeOnly = false): Promise<Employee[]> {
  const { data } = await api.get<Employee[]>('/employees', {
    params: activeOnly ? { active: true } : undefined,
  })
  return data
}

export async function createEmployee(payload: {
  name: string
  email?: string | null
  phone?: string | null
}): Promise<Employee> {
  const { data } = await api.post<Employee>('/employees', payload)
  return data
}

export async function updateEmployee(
  id: string,
  payload: Partial<{ name: string; email: string | null; phone: string | null; active: boolean }>,
): Promise<Employee> {
  const { data } = await api.patch<Employee>(`/employees/${id}`, payload)
  return data
}

export async function deactivateEmployee(id: string): Promise<Employee> {
  const { data } = await api.delete<Employee>(`/employees/${id}`)
  return data
}

export interface PlatformStats {
  tenants: number
  brands: number
  products: number
  sales: number
  employees: number
  salesTotalSum: number
  salesLast30Days: number
  salesLast30Sum: number
  trialingTenants: number
  activeSubscriptions: number
  expiredSubscriptions: number
}

export interface PlatformTenantRow {
  id: string
  name: string
  slug: string
  active: boolean
  rfc: string | null
  onboardingComplete: boolean
  createdAt: string
  subscription: {
    planType: string
    status: string
    trialEndsAt: string
  } | null
  counts: {
    users: number
    brands: number
    sales: number
    employees: number
    products: number
  }
}

export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data } = await api.get<PlatformStats>('/platform/stats')
  return data
}

export async function fetchPlatformTenants(): Promise<PlatformTenantRow[]> {
  const { data } = await api.get<PlatformTenantRow[]>('/platform/tenants')
  return data
}

export async function fetchPlatformTenant(id: string): Promise<Record<string, unknown>> {
  const { data } = await api.get(`/platform/tenants/${id}`)
  return data
}

export async function deletePlatformTenant(
  id: string,
  confirmSlug: string,
): Promise<{ ok: boolean; deletedId: string; slug: string }> {
  const { data } = await api.delete(`/platform/tenants/${id}`, {
    params: { confirm: confirmSlug },
  })
  return data
}

export interface GiftCardPreview {
  id: string
  code: string
  balance: number
  applicable: number
}

export interface SaleLine {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: string
  subtotal: string
  discount: string
  commission: string
  total: string
  inSettlement: boolean
  paid: boolean
  product: {
    id: string
    name: string
    sku: string
    brandId: string
    brand: { id: string; name: string }
  }
}

export interface Sale {
  id: string
  ticketNumber: number
  paymentMethod: PaymentMethod
  soldAt: string
  ticketComment?: string | null
  applyTax?: boolean
  taxRate?: string
  taxAmount?: string
  subtotal?: string
  total?: string
  giftCardAmount?: string
  createdById: string | null
  attendedById?: string | null
  customerId?: string | null
  createdAt: string
  createdBy?: { id: string; name: string } | null
  attendedBy?: { id: string; name: string; role?: string } | null
  attendedByUser?: { id: string; name: string } | null
  customer?: Customer | null
  payments?: SalePayment[]
  lines: SaleLine[]
}

export interface CreateSalePayload {
  paymentMethod: PaymentMethod
  soldAt?: string
  ticketComment?: string | null
  applyTax?: boolean
  taxRate?: number
  attendedById?: string | null
  attendedByUserId?: string | null
  customerId?: string | null
  giftCardCode?: string | null
  payments?: Array<{ method: SplitPaymentMethod; amount: number }>
  lines: Array<{
    productId: string
    quantity: number
    discount?: number
    commission?: number
    unitPrice?: number
  }>
}

export type LayawayStatus = 'OPEN' | 'COMPLETED' | 'CANCELLED'

export interface Layaway {
  id: string
  code: string
  status: LayawayStatus
  subtotal: string
  total: string
  balance: string
  deposit: string
  ticketComment: string | null
  applyTax: boolean
  taxAmount: string
  customer?: Customer | null
  lines: Array<{
    id: string
    productId: string
    quantity: number
    unitPrice: string
    discount: string
    total: string
    product: {
      id: string
      name: string
      sku: string
      brand: { id: string; name: string }
    }
  }>
  payments: Array<{
    id: string
    method: SplitPaymentMethod
    amount: string
    createdAt: string
  }>
  createdAt: string
}

export interface CreateLayawayPayload {
  lines: Array<{
    productId: string
    quantity: number
    discount?: number
    unitPrice?: number
  }>
  ticketComment?: string | null
  applyTax?: boolean
  taxRate?: number
  customerId?: string | null
  deposit?: { method: SplitPaymentMethod; amount: number }
}
