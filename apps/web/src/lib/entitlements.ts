/**
 * Mirror FE de `apps/api/src/lib/entitlements.ts`.
 *
 * No hay build step compartido entre apps/api y apps/web, así que este
 * archivo se mantiene sincronizado a mano. `GET /auth/me` ya devuelve
 * `entitlements: EntitlementModule[]` y `featureFlags: FeatureFlag[]`
 * (ver `apps/api/src/lib/meShape.ts`), calculados con este mismo mapa.
 */

export type PlanType = 'NEGOCIO' | 'CLINICA' | 'RESTAURANTE' | 'MARCA'

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
  // Stubs NEGOCIO (declarados, sin UI/API funcional todavía)
  | 'employees'
  | 'expenses'
  | 'commissions'
  | 'discounts'
  | 'cashRegisters'
  // Plan MARCA / módulo de comandas RESTAURANTE
  | 'inventory'
  | 'orders'
  | 'cortes'
  | 'mensualidad'

export type FeatureFlag =
  // CLINICA
  | 'patientReminders'
  | 'medicalHistory'
  // RESTAURANTE
  | 'dishes'
  | 'ordersKitchen'
  | 'ai'
  | 'sms'

export const STUB_MODULES: EntitlementModule[] = [
  'employees',
  'expenses',
  'commissions',
  'discounts',
  'cashRegisters',
]

export const STUB_FLAGS: FeatureFlag[] = [
  'patientReminders',
  'medicalHistory',
  'dishes',
  'ordersKitchen',
  'ai',
  'sms',
]

/**
 * `modules` puede venir vacío/indefinido (usuario legacy sin plan, o
 * mientras el store de auth no haya cargado `/auth/me` todavía). En ese
 * caso se permite acceso a todo (array vacío/undefined = mostrar todo)
 * para no romper el showroom actual.
 */
export function canAccessModule(
  modules: EntitlementModule[] | null | undefined,
  moduleId: EntitlementModule,
): boolean {
  if (!modules || modules.length === 0) return true
  return modules.includes(moduleId)
}

export function hasFeatureFlag(
  flags: FeatureFlag[] | null | undefined,
  flag: FeatureFlag,
): boolean {
  if (!flags) return false
  return flags.includes(flag)
}

export function isStubModule(moduleId: EntitlementModule): boolean {
  return STUB_MODULES.includes(moduleId)
}
