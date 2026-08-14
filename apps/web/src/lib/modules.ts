import type { Component } from 'vue'
import {
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  CalendarDays,
  Contact,
  Gift,
  Goal,
  LayoutDashboard,
  Box,
  Percent,
  Receipt,
  Settings,
  Store,
  Tag,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-vue-next'
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
  icon: Component
  path?: string
  adminOnly?: boolean
}

export const NEGOCIO_MODULE_LINKS: ModuleLink[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'Analítica e inventario', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'brands', name: 'Marcas', description: 'Marcas y consignaciones', icon: Box, path: '/brands', adminOnly: true },
  { id: 'products', name: 'Productos', description: 'Catálogo de productos', icon: Boxes, path: '/products' },
  { id: 'stock', name: 'Stock', description: 'Inventario y existencias', icon: Warehouse, path: '/stock' },
  {
    id: 'productRequests',
    name: 'Solicitudes de productos',
    description: 'Altas, restock y retiros',
    icon: Goal,
    path: '/product-requests',
  },
  { id: 'agenda', name: 'Agenda', description: 'Entregas y cortes programados', icon: CalendarDays, path: '/agenda' },
  { id: 'caja', name: 'Caja', description: 'Punto de venta', icon: Store, path: '/caja', adminOnly: true },
  { id: 'sales', name: 'Ventas / Tickets', description: 'Historial de ventas', icon: Receipt, path: '/sales' },
  { id: 'customers', name: 'Clientes', description: 'Directorio de clientes', icon: Contact },
  { id: 'giftCards', name: 'Tarjetas de regalo', description: 'Emisión y canje', icon: Gift },
  { id: 'layaways', name: 'Apartados', description: 'Ventas a plazos', icon: CalendarClock },
  { id: 'preferences', name: 'Preferencias', description: 'Configuración del negocio', icon: Settings, path: '/preferences', adminOnly: true },
  { id: 'business', name: 'Mi negocio', description: 'Datos y logo del negocio', icon: Building2, path: '/preferences', adminOnly: true },
  { id: 'employees', name: 'Empleados', description: 'Gestión de personal', icon: Users, path: '/employees', adminOnly: true },
  { id: 'expenses', name: 'Gastos', description: 'Registro de gastos', icon: Wallet },
  { id: 'commissions', name: 'Comisiones', description: 'Comisiones por venta', icon: Percent },
  { id: 'discounts', name: 'Descuentos', description: 'Promociones y descuentos', icon: Tag },
  { id: 'cashRegisters', name: 'Cajas registradoras', description: 'Múltiples cajas', icon: Calculator },
]
