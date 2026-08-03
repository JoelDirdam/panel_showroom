import type { EntitlementModule } from './entitlements'

/**
 * Grid de módulos del Plan Negocio para `/onboarding/hub`. `path` solo se
 * define para módulos con ruta ya implementada en `router/index.ts`; el
 * resto se muestra como "Próximamente" (Preferencias/Usuarios/Clientes/etc.
 * son de otros agentes — ver reparto en el prompt de este agente).
 */
export interface ModuleLink {
  id: EntitlementModule
  name: string
  description: string
  path?: string
  adminOnly?: boolean
}

export const NEGOCIO_MODULE_LINKS: ModuleLink[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'Resumen general del negocio', path: '/' },
  { id: 'brands', name: 'Marcas', description: 'Marcas y consignaciones', path: '/brands', adminOnly: true },
  { id: 'products', name: 'Productos', description: 'Catálogo de productos', path: '/products' },
  { id: 'stock', name: 'Stock', description: 'Inventario y existencias', path: '/stock' },
  {
    id: 'productRequests',
    name: 'Solicitudes de productos',
    description: 'Altas, restock y retiros',
    path: '/product-requests',
  },
  { id: 'agenda', name: 'Agenda', description: 'Entregas y cortes programados', path: '/agenda' },
  { id: 'caja', name: 'Caja', description: 'Punto de venta', path: '/caja', adminOnly: true },
  { id: 'sales', name: 'Ventas / Tickets', description: 'Historial de ventas', path: '/sales' },
  { id: 'customers', name: 'Clientes', description: 'Directorio de clientes' },
  { id: 'giftCards', name: 'Tarjetas de regalo', description: 'Emisión y canje' },
  { id: 'layaways', name: 'Apartados', description: 'Ventas a plazos' },
  { id: 'users', name: 'Usuarios', description: 'Accesos del equipo' },
  { id: 'preferences', name: 'Preferencias', description: 'Configuración del negocio', path: '/preferences', adminOnly: true },
  { id: 'business', name: 'Mi negocio', description: 'Datos y logo del negocio' },
  { id: 'employees', name: 'Empleados', description: 'Gestión de personal', path: '/employees', adminOnly: true },
  { id: 'expenses', name: 'Gastos', description: 'Registro de gastos' },
  { id: 'commissions', name: 'Comisiones', description: 'Comisiones por venta' },
  { id: 'discounts', name: 'Descuentos', description: 'Promociones y descuentos' },
  { id: 'cashRegisters', name: 'Cajas registradoras', description: 'Múltiples cajas' },
]
