/**
 * Datos públicos del titular del sitio. El nombre debe coincidir con la
 * Constancia de Situación Fiscal usada para verificar el negocio en Meta.
 * RFC y domicilio completo NO se publican (se entregan solo a Meta).
 */
export const BUSINESS = {
  brand: 'COSDI',
  site: 'https://cosdi.mx',
  legalName: 'Joel Andrés Violante Madrid',
  activity: 'Servicios de consultoría en computación',
  city: 'Victoria de Durango',
  state: 'Durango',
  country: 'México',
  email: 'contacto@cosdi.mx',
  privacyEmail: 'privacidad@cosdi.mx',
  phone: '618 292 3010',
  whatsappLink: 'https://wa.me/526182923010',
  legalUpdated: '16 de noviembre de 2026',
} as const

export const BUSINESS_ADDRESS = `${BUSINESS.city}, ${BUSINESS.state}, ${BUSINESS.country}`
