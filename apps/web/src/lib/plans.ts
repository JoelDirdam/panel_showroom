import type { PlanType } from './entitlements'

/**
 * Catálogo de planes para Landing (`/`) y el flujo de onboarding
 * (`/onboarding/select-plan`, `/onboarding/confirm-plan`). Solo NEGOCIO
 * tiene flujo de producto completo hoy; el resto se muestra como
 * "Próximamente" (ver docs/plans-contracts.md y `lib/entitlements.ts`).
 */
export interface PlanInfo {
  type: PlanType
  name: string
  tagline: string
  description: string
  features: string[]
  available: boolean
}

export const PLANS: PlanInfo[] = [
  {
    type: 'NEGOCIO',
    name: 'Negocio',
    tagline: 'Disponible hoy',
    description: 'Administra marcas, productos, stock, ventas, caja y agenda en un solo panel.',
    features: [
      'Marcas y consignaciones',
      'Catálogo de productos y stock',
      'Punto de venta (Caja) y tickets',
      'Agenda de entregas y cortes',
      'Solicitudes de productos',
      'Usuarios y preferencias del negocio',
    ],
    available: true,
  },
  {
    type: 'CLINICA',
    name: 'Clínica',
    tagline: 'Próximamente',
    description: 'Agenda de pacientes, recordatorios automáticos e historial médico.',
    features: ['Agenda de pacientes', 'Recordatorios automáticos', 'Historial médico'],
    available: false,
  },
  {
    type: 'RESTAURANTE',
    name: 'Restaurante',
    tagline: 'Próximamente',
    description: 'Menú de platillos, comandas de cocina y ventas en punto de venta.',
    features: ['Menú y platillos', 'Comandas de cocina', 'Ventas y caja'],
    available: false,
  },
  {
    type: 'MARCA',
    name: 'Marca',
    tagline: 'Próximamente',
    description: 'Para marcas que consignan producto en varios negocios.',
    features: ['Inventario propio', 'Órdenes y cortes', 'Mensualidad'],
    available: false,
  },
]

export function planInfo(type: PlanType | null | undefined): PlanInfo | undefined {
  return PLANS.find((p) => p.type === type)
}

export const TRIAL_BASE_DAYS = 15
export const PROMO_EXTRA_DAYS_CODE = 'MANEKI30'
