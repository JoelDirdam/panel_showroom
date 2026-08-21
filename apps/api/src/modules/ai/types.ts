export interface SucursalSummary {
  id: string
  name: string
  address: string | null
}

export interface ServiceSummary {
  id: string
  name: string
  durationMinutes: number
  price: string
}

export interface BusinessHourSummary {
  dayOfWeek: number
  openTime: string
  closeTime: string
  isClosed: boolean
}

export interface AiRuntimeContext {
  tenantId: string
  tenantName: string
  customerPhone: string
  conversationId: string
  sucursalMode: 'single' | 'multi'
  sucursales: SucursalSummary[]
  selectedSucursalId: string | null
  services: ServiceSummary[]
  businessHours: BusinessHourSummary[]
  timezone: string
  extraBusinessPrompt: string
}

export const FALLBACK_CUSTOMER_MESSAGE =
  'Con gusto te ayudo con los servicios y a agendar una cita. ¿Qué día y horario te quedan bien?'
