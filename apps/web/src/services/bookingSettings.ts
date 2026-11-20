import api from './api'

export interface BookingPause {
  paused: boolean
  message: string | null
  /** YYYY-MM-DD en que se reanudan solas; null = hasta reactivarlas. */
  until: string | null
}

export interface BusinessClosure {
  id: string
  startDate: string
  endDate: string
  label: string
  publicMessage: string | null
}

export interface AffectedAppointment {
  id: string
  customerName: string
  customerPhone: string
  startTime: string
  service: { name: string } | null
}

export interface BookingSettingsState {
  today: string
  timezone: string
  pause: BookingPause
  closures: BusinessClosure[]
}

export async function getBookingSettings(): Promise<BookingSettingsState> {
  const { data } = await api.get<BookingSettingsState>('/v1/booking-settings')
  return data
}

export async function setBookingPause(body: { paused: boolean; message?: string | null; until?: string | null }) {
  const { data } = await api.put<BookingSettingsState>('/v1/booking-settings/pause', body)
  return data
}

export async function previewClosure(startDate: string, endDate: string): Promise<AffectedAppointment[]> {
  const { data } = await api.get<{ appointments: AffectedAppointment[] }>('/v1/booking-settings/closures/preview', {
    params: { startDate, endDate },
  })
  return data.appointments
}

export async function addClosure(body: {
  startDate: string
  endDate: string
  label: string
  publicMessage?: string | null
}) {
  const { data } = await api.post<BookingSettingsState & { closure: BusinessClosure; appointments: AffectedAppointment[] }>(
    '/v1/booking-settings/closures',
    body,
  )
  return data
}

export async function deleteClosure(id: string) {
  const { data } = await api.delete<BookingSettingsState>(`/v1/booking-settings/closures/${encodeURIComponent(id)}`)
  return data
}
