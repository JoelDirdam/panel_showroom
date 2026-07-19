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
  role: 'ADMIN' | 'BRAND'
  tenantId?: string
  brandId: string | null
  mustChangePassword?: boolean
  brand?: { id: string; name: string } | null
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

export interface Brand {
  id: string
  name: string
  slug: string
  contactEmail: string | null
  whatsapp: string | null
  active: boolean
  isHouseBrand: boolean
  _count?: { products: number; users: number }
  temporaryPassword?: string
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  price: string | null
  imageUrl: string | null
  brandId: string
  brand: { id: string; name: string; isHouseBrand?: boolean }
  stock: { id: string; quantity: number; minStock: number } | null
  stockEntries?: StockEntry[]
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

export type ProductRequestType = 'CREATE_PRODUCT' | 'RESTOCK'
export type ProductRequestStatus = 'PENDING' | 'ACCEPTED'

export interface ProductRequest {
  id: string
  type: ProductRequestType
  status: ProductRequestStatus
  brandId: string
  brand: { id: string; name: string; whatsapp: string | null }
  productId: string | null
  product: { id: string; name: string; sku: string } | null
  name: string | null
  sku: string | null
  description: string | null
  price: string | null
  imageUrl: string | null
  quantity: number
  minStock: number
  notes: string | null
  acceptedAt: string | null
  createdAt: string
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

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'OTRO'

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
  createdById: string | null
  createdAt: string
  createdBy?: { id: string; name: string } | null
  lines: SaleLine[]
}

export interface CreateSalePayload {
  paymentMethod: PaymentMethod
  soldAt?: string
  lines: Array<{
    productId: string
    quantity: number
    discount?: number
    commission?: number
    unitPrice?: number
  }>
}
