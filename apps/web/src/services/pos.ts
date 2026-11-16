/**
 * Servicios del punto de venta y CRM: clientes, ventas (filtros, cancelación),
 * apartados (abonos, cancelación) y corte de caja por turno.
 */
import api, {
  type Customer,
  type Layaway,
  type PaymentMethod,
  type Sale,
  type SplitPaymentMethod,
} from '@/services/api'

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** Mensaje de error de la API, o uno claro si no hubo respuesta del servidor. */
export function posError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string } } }
  if (!err.response) return 'Sin conexión con el servidor. Intenta de nuevo.'
  return err.response.data?.error || fallback
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  OTRO: 'Otro',
  MIXTO: 'Mixto',
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('es-MX', { dateStyle: 'medium' })
}

/** Inicio (00:00) o fin (23:59:59) del día local de un `<input type="date">`, en ISO. */
export function dayBoundary(dateInput: string, end = false): string | undefined {
  if (!dateInput) return undefined
  const [y, m, d] = dateInput.split('-').map(Number)
  if (!y || !m || !d) return undefined
  const date = end ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0)
  return date.toISOString()
}

// ───────────── Clientes ─────────────

export interface CustomerWithStats extends Customer {
  createdAt: string
  purchases: number
  totalSpent: number
  lastPurchaseAt: string | null
}

export interface CustomerDetail extends CustomerWithStats {
  cancelledCount: number
  sales: Array<{
    id: string
    ticketNumber: number
    soldAt: string
    paymentMethod: PaymentMethod
    total: string
    lines: Array<{ id: string; quantity: number; total: string; product: { name: string; sku: string } }>
  }>
  layaways: Array<{
    id: string
    code: string
    status: 'OPEN' | 'COMPLETED' | 'CANCELLED'
    total: string
    balance: string
    createdAt: string
  }>
}

export async function fetchCustomersPage(params: { q?: string; page: number; pageSize?: number }) {
  const { data } = await api.get<Paged<CustomerWithStats>>('/customers', { params })
  return data
}

export async function fetchCustomer(id: string) {
  const { data } = await api.get<CustomerDetail>(`/customers/${id}`)
  return data
}

export async function createCustomer(payload: { name: string; phone?: string | null }) {
  const res = await api.post<Customer>('/customers', payload)
  // 200 = ya existía un cliente con ese teléfono; 201 = se creó.
  return { customer: res.data, existed: res.status === 200 }
}

export async function updateCustomer(id: string, payload: { name?: string; phone?: string | null }) {
  const { data } = await api.patch<Customer>(`/customers/${id}`, payload)
  return data
}

// ───────────── Ventas ─────────────

export interface SalesQuery {
  from?: string
  to?: string
  q?: string
  customerId?: string
  page: number
  pageSize?: number
}

export async function fetchSalesPage(params: SalesQuery) {
  const { data } = await api.get<Paged<Sale>>('/sales', { params })
  return data
}

export async function fetchSale(id: string) {
  const { data } = await api.get<Sale>(`/sales/${id}`)
  return data
}

export interface CancelledSale {
  id: string
  ticketNumber: number
  soldAt: string
  total: string
  customerName: string | null
  reason: string | null
  cancelledByName: string | null
  cancelledAt: string
  snapshot: Sale
  /** Solo en la respuesta de cancelar: saldo de tarjeta de regalo que hay que reponer a mano. */
  giftCardAmountToRestore?: number
}

export async function cancelSale(id: string, reason: string) {
  const { data } = await api.post<CancelledSale>(`/sales/${id}/cancel`, { reason: reason || null })
  return data
}

export async function fetchCancelledSales(params: { from?: string; to?: string; page: number }) {
  const { data } = await api.get<Paged<CancelledSale>>('/sales/cancelled', { params })
  return data
}

// ───────────── Apartados ─────────────

export type LayawayFull = Layaway & {
  sale?: { id: string; ticketNumber: number } | null
  createdBy?: { id: string; name: string } | null
}

export async function fetchLayaways(params: { status?: string; q?: string }) {
  const { data } = await api.get<LayawayFull[]>('/layaways', { params })
  return data
}

export async function addLayawayPayment(id: string, payload: { method: SplitPaymentMethod; amount: number }) {
  const { data } = await api.post<LayawayFull>(`/layaways/${id}/payments`, payload)
  return data
}

export async function cancelLayaway(id: string) {
  const { data } = await api.post<LayawayFull & { paidToRefund: number }>(`/layaways/${id}/cancel`)
  return data
}

// ───────────── Corte de caja ─────────────

export interface MethodTotals {
  efectivo: number
  tarjeta: number
  transferencia: number
}

export interface CashSummary {
  salesCount: number
  salesTotal: number
  sales: MethodTotals
  layawayPayments: MethodTotals
  giftCardTotal: number
  cashIn: number
  cashOut: number
  openingFloat: number
  expectedCash: number
}

export interface CashMovement {
  id: string
  type: 'IN' | 'OUT'
  amount: string
  note: string | null
  createdByName: string | null
  createdAt: string
}

export interface CashSession {
  id: string
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  openedByName: string | null
  openingFloat: string
  closedAt: string | null
  closedByName: string | null
  expectedCash: string | null
  countedCash: string | null
  difference: string | null
  summary: CashSummary | null
  note: string | null
  movements: CashMovement[]
}

export interface CurrentCashSession {
  session: CashSession | null
  summary: CashSummary | null
}

export async function fetchCurrentCashSession() {
  const { data } = await api.get<CurrentCashSession>('/cash-sessions/current')
  return data
}

export async function fetchCashSessionHistory() {
  const { data } = await api.get<CashSession[]>('/cash-sessions')
  return data
}

export async function openCashSession(payload: { openingFloat: number; note?: string | null }) {
  const { data } = await api.post<CurrentCashSession>('/cash-sessions/open', payload)
  return data
}

export async function addCashMovement(payload: { type: 'IN' | 'OUT'; amount: number; note?: string | null }) {
  const { data } = await api.post<CurrentCashSession>('/cash-sessions/current/movements', payload)
  return data
}

export async function closeCashSession(payload: { countedCash: number; note?: string | null }) {
  const { data } = await api.post<CashSession>('/cash-sessions/current/close', payload)
  return data
}
