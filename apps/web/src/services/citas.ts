import api from './api'
import axios from 'axios'

/** Cliente público: sin token del panel (la reserva no requiere login). */
const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'

export interface ServiceItem {
  id: string
  name: string
  durationMinutes: number
  price: string | number
  isActive: boolean
}

export interface BusinessHourItem {
  id?: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
  /** Descanso opcional (ej. comida): el día queda en dos bloques. */
  breakStart?: string | null
  breakEnd?: string | null
}

export interface AppointmentItem {
  id: string
  customerName: string
  customerPhone: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
  /** Respuesta del cliente con los botones del recordatorio de WhatsApp. */
  customerReply?: 'CONFIRM' | 'CANCEL' | 'RESCHEDULE' | null
  customerRepliedAt?: string | null
  service: { id: string; name: string; durationMinutes: number } | null
  sucursal: { id: string; name: string } | null
}

export const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  COMPLETED: 'Completada',
  NO_SHOW: 'No asistió',
}

export const CUSTOMER_REPLY_LABELS: Record<'CONFIRM' | 'CANCEL' | 'RESCHEDULE', string> = {
  CONFIRM: 'Confirmó por WhatsApp',
  CANCEL: 'Canceló por WhatsApp',
  RESCHEDULE: 'Pidió cambiar de día',
}

// --- Panel del negocio -------------------------------------------------

export async function listServices(includeInactive = true): Promise<ServiceItem[]> {
  const { data } = await api.get<ServiceItem[]>('/v1/services', { params: { includeInactive } })
  return data
}
export async function createService(body: { name: string; durationMinutes: number; price: number }) {
  const { data } = await api.post<ServiceItem>('/v1/services', body)
  return data
}
export async function updateService(id: string, body: Partial<Omit<ServiceItem, 'id'>>) {
  const { data } = await api.patch<ServiceItem>(`/v1/services/${id}`, body)
  return data
}
export async function deleteService(id: string) {
  await api.delete(`/v1/services/${id}`)
}

export async function getBusinessHours(): Promise<BusinessHourItem[]> {
  const { data } = await api.get<BusinessHourItem[]>('/v1/business-hours')
  return data
}
export async function saveBusinessHours(days: BusinessHourItem[]): Promise<BusinessHourItem[]> {
  const body = days.map(({ dayOfWeek, openTime, closeTime, isClosed, breakStart, breakEnd }) => ({
    dayOfWeek,
    openTime,
    closeTime,
    isClosed,
    breakStart: breakStart || null,
    breakEnd: breakStart && breakEnd ? breakEnd : null,
  }))
  const { data } = await api.put<BusinessHourItem[]>('/v1/business-hours', body)
  return data
}

export async function listAppointments(from: Date, to: Date): Promise<AppointmentItem[]> {
  const { data } = await api.get<AppointmentItem[]>('/v1/appointments', {
    params: { from: from.toISOString(), to: to.toISOString() },
  })
  return data
}
export async function createAppointment(body: {
  serviceId: string
  customerName: string
  customerPhone: string
  startTime: string
  endTime: string
  notes?: string
  status?: AppointmentStatus
}) {
  const { data } = await api.post<AppointmentItem>('/v1/appointments', body)
  return data
}
export async function setAppointmentStatus(id: string, status: AppointmentStatus) {
  const { data } = await api.patch<AppointmentItem>(`/v1/appointments/${id}`, { status })
  return data
}

// --- Reserva pública ---------------------------------------------------

export interface PublicBusiness {
  business: { name: string; slug: string; logoUrl: string | null; address: string | null; socialUrl: string | null }
  services: Array<{ id: string; name: string; durationMinutes: number; price: string | number }>
  sucursales: Array<{ id: string; name: string; address: string | null }>
  hours: BusinessHourItem[]
  maxDaysAhead: number
  /** Fecha de hoy (YYYY-MM-DD) en la zona del negocio. */
  today?: string
  /** Reservas en línea en pausa. */
  bookingStatus?: { paused: boolean; message: string | null; until: string | null }
  /** Vacaciones y días festivos próximos (fechas inclusivas). */
  closures?: Array<{ startDate: string; endDate: string; label: string; publicMessage: string | null }>
}

export async function getPublicBusiness(slug: string): Promise<PublicBusiness> {
  const { data } = await publicApi.get<PublicBusiness>(`/public/${encodeURIComponent(slug)}`)
  return data
}
export async function getPublicSlots(
  slug: string,
  params: { date: string; serviceId: string; sucursalId?: string },
): Promise<string[]> {
  const { data } = await publicApi.get<{ slots: string[] }>(
    `/public/${encodeURIComponent(slug)}/availability`,
    { params },
  )
  return data.slots
}
export async function bookPublic(
  slug: string,
  body: {
    serviceId: string
    sucursalId?: string
    date: string
    time: string
    customerName: string
    customerPhone: string
    notes?: string
  },
) {
  const { data } = await publicApi.post<{
    id: string
    startTime: string
    endTime: string
    service: { name: string; durationMinutes: number }
    business: { name: string }
  }>(`/public/${encodeURIComponent(slug)}/appointments`, body)
  return data
}

export function bookingUrl(slug: string): string {
  return `${window.location.origin}/reservar/${slug}`
}
