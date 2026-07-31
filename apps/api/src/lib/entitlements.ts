import type { PlanType } from '@prisma/client'

/**
 * Módulos del showroom disponibles en el sidebar/rutas del frontend. Deben
 * mantenerse sincronizados con las claves usadas por Agente C/D en el FE.
 *
 * Extendido por Agente H con módulos stub (declarados, sin implementación
 * de producto todavía: ver `STUB_MODULES`) y con los módulos del plan
 * MARCA (`inventory`, `orders`, `cortes`, `mensualidad`).
 */
export type EntitlementModule =
  | 'dashboard'
  | 'brands'
  | 'products'
  | 'stock'
  | 'productRequests'
  | 'agenda'
  | 'caja'
  | 'sales'
  | 'customers'
  | 'giftCards'
  | 'layaways'
  | 'users'
  | 'preferences'
  | 'business'
  // Stubs NEGOCIO (declarados, sin UI/API funcional todavía — Agente H)
  | 'employees'
  | 'expenses'
  | 'commissions'
  | 'discounts'
  | 'cashRegisters'
  // Plan MARCA / módulo de comandas RESTAURANTE (Agente H)
  | 'inventory'
  | 'orders'
  | 'cortes'
  | 'mensualidad'

/** Plan NEGOCIO: lista completa del showroom actual + stubs administrativos. */
const NEGOCIO_MODULES: EntitlementModule[] = [
  'dashboard',
  'brands',
  'products',
  'stock',
  'productRequests',
  'agenda',
  'caja',
  'sales',
  'customers',
  'giftCards',
  'layaways',
  'users',
  'preferences',
  'business',
  'employees',
  'expenses',
  'commissions',
  'discounts',
  'cashRegisters',
]

/**
 * CLINICA / RESTAURANTE / MARCA: subsets/stubs. Estos planes aún no tienen
 * vistas dedicadas; se habilitan los módulos genéricos que ya existen y se
 * ajustarán conforme se construyan flujos específicos por vertical.
 */
const ENTITLEMENTS_BY_PLAN: Record<PlanType, EntitlementModule[]> = {
  NEGOCIO: NEGOCIO_MODULES,
  CLINICA: ['dashboard', 'agenda', 'customers', 'sales', 'caja', 'users', 'preferences', 'business'],
  RESTAURANTE: [
    'dashboard',
    'products',
    'stock',
    'sales',
    'caja',
    'customers',
    'orders',
    'users',
    'preferences',
    'business',
  ],
  MARCA: [
    'dashboard',
    'products',
    'stock',
    'sales',
    'productRequests',
    'preferences',
    'inventory',
    'layaways',
    'orders',
    'cortes',
    'mensualidad',
  ],
}

export function getEntitlements(planType: PlanType | null | undefined): EntitlementModule[] {
  if (!planType) return []
  return ENTITLEMENTS_BY_PLAN[planType] ?? []
}

/**
 * Flags de funcionalidad opcional dentro de un plan (a diferencia de los
 * módulos, un flag habilita/deshabilita una capacidad puntual dentro de un
 * módulo existente, p. ej. recordatorios por WhatsApp dentro de Agenda).
 * Todos son stubs: declarados para que la UI reserve el espacio, sin
 * lógica de producto implementada todavía.
 */
export type FeatureFlag =
  // CLINICA
  | 'patientReminders'
  | 'medicalHistory'
  // RESTAURANTE
  | 'dishes'
  | 'ordersKitchen'
  | 'ai'
  | 'sms'

const FLAGS_BY_PLAN: Record<PlanType, FeatureFlag[]> = {
  NEGOCIO: [],
  CLINICA: ['patientReminders', 'medicalHistory'],
  RESTAURANTE: ['dishes', 'ordersKitchen', 'ai', 'sms'],
  MARCA: [],
}

export function getFeatureFlags(planType: PlanType | null | undefined): FeatureFlag[] {
  if (!planType) return []
  return FLAGS_BY_PLAN[planType] ?? []
}

/** Módulos declarados en algún plan pero sin implementación de producto (API+UI) todavía. */
export const STUB_MODULES: EntitlementModule[] = [
  'employees',
  'expenses',
  'commissions',
  'discounts',
  'cashRegisters',
]

/** Flags declarados pero sin implementación de producto todavía. */
export const STUB_FLAGS: FeatureFlag[] = FLAGS_BY_PLAN.CLINICA.concat(FLAGS_BY_PLAN.RESTAURANTE)

/**
 * `modules` puede ser `null`/`undefined` (tenants legacy sin
 * `TenantSubscription`, o algún flujo que no haya cargado entitlements
 * todavía). En ese caso se permite acceso a todo para no romper el
 * showroom actual.
 */
export function canAccessModule(
  modules: EntitlementModule[] | null | undefined,
  moduleId: EntitlementModule,
): boolean {
  if (!modules || modules.length === 0) return true
  return modules.includes(moduleId)
}

export function hasFeatureFlag(flags: FeatureFlag[] | null | undefined, flag: FeatureFlag): boolean {
  if (!flags) return false
  return flags.includes(flag)
}

export function isStubModule(moduleId: EntitlementModule): boolean {
  return STUB_MODULES.includes(moduleId)
}
