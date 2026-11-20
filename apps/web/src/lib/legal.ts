/**
 * Datos de las políticas públicas (conservación, proveedores, reembolsos).
 *
 * RETENTION debe coincidir con apps/api/src/lib/retention.ts, que es lo que el
 * servidor realmente ejecuta: si cambias un plazo, cámbialo en los dos lados.
 */
export const RETENTION = {
  inactiveAccountMonths: 12,
  inactiveNoticeDays: 30,
  unverifiedSignupDays: 30,
  evidenceYears: 5,
  copyrightClaimYears: 5,
  adminAuditYears: 5,
  webhookEventDays: 90,
  verificationCodeHours: 24,
  renewalNoticeDays: 7,
} as const

export const REFUNDS = {
  /** Días hábiles para pedir el reembolso íntegro del primer cobro de un plan. */
  firstChargeBusinessDays: 5,
  /** Días hábiles en que respondemos una solicitud. */
  responseBusinessDays: 5,
} as const

/** Fecha de la última actualización de las políticas de este archivo. */
export const POLICIES_UPDATED = '16 de noviembre de 2026'

export interface Subprocessor {
  name: string
  purpose: string
  data: string
  location: string
  url: string
  /** Solo se usa si se cumple esta condición. */
  condition?: string
}

/**
 * Proveedores (encargados) que tratan datos personales por cuenta de COSDI.
 * Mantén esta lista al día: agregar un proveedor nuevo implica actualizarla
 * ANTES de empezar a enviarle datos.
 */
export const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Railway Corporation',
    purpose: 'Alojamiento de la aplicación, base de datos y archivos subidos',
    data: 'Todos los datos de la cuenta y del negocio',
    location: 'Estados Unidos',
    url: 'https://railway.com/legal/privacy',
  },
  {
    name: 'Cloudflare, Inc.',
    purpose: 'DNS, protección y entrega del sitio (CDN)',
    data: 'Dirección IP y datos técnicos de la conexión',
    location: 'Estados Unidos (red global)',
    url: 'https://www.cloudflare.com/privacypolicy/',
  },
  {
    name: 'Stripe, Inc.',
    purpose: 'Procesamiento de pagos de las suscripciones',
    data: 'Nombre, correo, datos de la tarjeta (los captura Stripe directamente) e historial de cobros',
    location: 'Estados Unidos',
    url: 'https://stripe.com/mx/privacy',
    condition: 'Al registrar una tarjeta o pagar un plan',
  },
  {
    name: 'Resend (Plus Five Five, Inc.)',
    purpose: 'Envío de correos (códigos de verificación y avisos de la cuenta)',
    data: 'Correo electrónico, nombre y contenido del mensaje',
    location: 'Estados Unidos',
    url: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Meta Platforms, Inc. (WhatsApp Business Platform)',
    purpose: 'Envío y recepción de mensajes de WhatsApp (recordatorios de cita y atención)',
    data: 'Número de teléfono, nombre y contenido de los mensajes',
    location: 'Estados Unidos',
    url: 'https://www.whatsapp.com/legal/business-data-processing-terms',
    condition: 'En los planes de Citas, cuando el negocio usa WhatsApp',
  },
  {
    name: 'OpenAI, L.L.C.',
    purpose: 'Asistente de inteligencia artificial que responde y agenda por WhatsApp',
    data: 'Contenido de la conversación de WhatsApp y nombre de quien escribe',
    location: 'Estados Unidos',
    url: 'https://openai.com/policies/privacy-policy/',
    condition: 'Solo en el plan Citas + IA, con el asistente activado',
  },
  {
    name: 'Google LLC (Google Analytics 4)',
    purpose: 'Analítica de uso del sitio público',
    data: 'Identificadores de cookies, páginas visitadas, datos del dispositivo e IP',
    location: 'Estados Unidos',
    url: 'https://policies.google.com/privacy',
    condition: 'Solo en el sitio público y solo si aceptas las cookies de analítica',
  },
  {
    name: 'Hotjar Ltd.',
    purpose: 'Mapas de calor y análisis de navegación del sitio público',
    data: 'Identificadores de cookies, interacción con la página y datos del dispositivo',
    location: 'Unión Europea (Malta / Irlanda)',
    url: 'https://www.hotjar.com/legal/policies/privacy/',
    condition: 'Solo en el sitio público y solo si aceptas las cookies de analítica',
  },
  {
    name: 'Contentsquare SAS',
    purpose: 'Grabaciones de sesión, mapas de calor y análisis de navegación del sitio público',
    data: 'Identificadores de cookies, interacción con la página y datos del dispositivo (textos y números ocultos)',
    location: 'Unión Europea (Francia)',
    url: 'https://contentsquare.com/privacy-center/',
    condition: 'Solo en el sitio público y solo si aceptas las cookies de analítica',
  },
  {
    name: 'Meta Platforms, Inc. (Pixel de Meta)',
    purpose: 'Medición de campañas publicitarias en Facebook e Instagram',
    data: 'Identificadores de cookies, páginas visitadas, datos del dispositivo e IP',
    location: 'Estados Unidos',
    url: 'https://www.facebook.com/privacy/policy/',
    condition: 'Solo en el sitio público y solo si aceptas las cookies de publicidad',
  },
]
