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
  brandId: string | null
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
  active: boolean
  _count?: { products: number; users: number }
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  price: string | null
  imageUrl: string | null
  brandId: string
  brand: { id: string; name: string }
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
