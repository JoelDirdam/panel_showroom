import { computed, type Component } from 'vue'
import {
  LayoutDashboard,
  Box,
  CalendarDays,
  ClipboardList,
  House,
  Store,
  Users,
  MessageCircle,
  CreditCard,
  Contact,
  CalendarClock,
  Calculator,
  PackageSearch,
  CalendarRange,
} from 'lucide-vue-next'
import { BoxesIcon, BookOpenPesoIcon } from '@/icons'
import { useAuthStore } from '@/stores/auth'
import { useProductRequestsStore } from '@/stores/productRequests'
import { planInfo } from '@/lib/plans'
import type { EntitlementModule } from '@/lib/entitlements'

export interface AppMenuItem {
  icon: Component
  name: string
  /** Nombre corto para la barra inferior en móvil. */
  short?: string
  path: string
  tourKey?: string
  moduleId?: EntitlementModule
  badge?: string
}

/**
 * Menú del panel, compartido por la barra lateral y la navegación inferior
 * en móvil. Las reglas de visibilidad (rol, plan, módulos) son las mismas
 * que tenía AppSidebar.
 */
export function useAppMenu() {
  const auth = useAuthStore()
  const productRequests = useProductRequestsStore()

  const sectionTitle = computed(() => {
    const type = auth.user?.subscription?.planType
    if (type === 'NEGOCIO') return 'Negocio'
    if (type === 'CLINICA') return 'Clínica'
    if (type === 'RESTAURANTE') return 'Restaurante'
    if (type === 'MARCA') return 'Marca'
    if (type === 'CITAS_PANEL' || type === 'CITAS_IA' || type === 'CITAS_RECORDATORIOS') return 'Citas'
    return planInfo(type)?.name ?? 'Negocio'
  })

  const items = computed<AppMenuItem[]>(() =>
    (
      [
        { icon: House, name: 'Inicio', path: '/home', tourKey: 'sidebar-home', moduleId: 'dashboard' },
        {
          icon: LayoutDashboard,
          name: 'Dashboard',
          short: 'Resumen',
          path: '/dashboard',
          tourKey: 'sidebar-dashboard',
          moduleId: 'dashboard',
        },
        ...(auth.isAdmin
          ? [{ icon: Box, name: 'Marcas', path: '/brands', tourKey: 'sidebar-brands', moduleId: 'brands' }]
          : []),
        { icon: BoxesIcon, name: 'Productos', path: '/products', tourKey: 'sidebar-products', moduleId: 'products' },
        {
          icon: PackageSearch,
          name: auth.isAdmin ? 'Órdenes' : 'Solicitar productos',
          short: auth.isAdmin ? 'Órdenes' : 'Solicitar',
          path: '/product-requests',
          tourKey: 'sidebar-requests',
          moduleId: 'productRequests',
          badge:
            productRequests.pendingCount > 0
              ? productRequests.pendingCount > 99
                ? '99+'
                : String(productRequests.pendingCount)
              : undefined,
        },
        { icon: CalendarDays, name: 'Citas', path: '/appointments', tourKey: 'sidebar-appointments', moduleId: 'appointments' },
        {
          icon: ClipboardList,
          name: 'Servicios y horarios',
          short: 'Servicios',
          path: '/appointments/config',
          tourKey: 'sidebar-services-config',
          moduleId: 'servicesConfig',
        },
        ...(auth.isAdmin
          ? [
              {
                icon: MessageCircle,
                name: 'Recordatorios WhatsApp',
                short: 'WhatsApp',
                path: '/appointments/whatsapp',
                tourKey: 'sidebar-whatsapp-reminders',
                moduleId: 'servicesConfig',
              },
            ]
          : []),
        { icon: CalendarRange, name: 'Agenda', path: '/agenda', tourKey: 'sidebar-agenda', moduleId: 'agenda' },
        ...(auth.isAdmin
          ? [
              { icon: Store, name: 'Caja', path: '/caja', tourKey: 'sidebar-caja', moduleId: 'caja' },
              {
                icon: Calculator,
                name: 'Corte de caja',
                short: 'Corte',
                path: '/corte-caja',
                tourKey: 'sidebar-cash-register',
                moduleId: 'caja',
              },
              { icon: CalendarClock, name: 'Apartados', path: '/layaways', tourKey: 'sidebar-layaways', moduleId: 'layaways' },
              { icon: Contact, name: 'Clientes', path: '/customers', tourKey: 'sidebar-customers', moduleId: 'customers' },
              { icon: Users, name: 'Empleados', path: '/employees', tourKey: 'sidebar-employees', moduleId: 'employees' },
            ]
          : []),
        {
          icon: BookOpenPesoIcon,
          name: 'Ventas/Tickets',
          short: 'Ventas',
          path: '/sales',
          tourKey: 'sidebar-sales',
          moduleId: 'sales',
        },
        ...(auth.isAdmin && auth.user?.subscription
          ? [{ icon: CreditCard, name: 'Mi suscripción', short: 'Suscripción', path: '/suscripcion', tourKey: 'sidebar-subscription' }]
          : []),
      ] as AppMenuItem[]
    ).filter((item) => !item.moduleId || auth.canAccess(item.moduleId)),
  )

  /**
   * Accesos de la barra inferior en móvil: los 4 más usados que el plan tenga.
   * El resto queda en "Más" (abre el menú completo).
   */
  const PRIORITY = [
    '/appointments',
    '/caja',
    '/customers',
    '/appointments/config',
    '/products',
    '/appointments/whatsapp',
    '/sales',
    '/product-requests',
    '/dashboard',
  ]
  const primary = computed(() => {
    const byPath = new Map(items.value.map((i) => [i.path, i]))
    const picked = PRIORITY.map((p) => byPath.get(p)).filter((i): i is AppMenuItem => !!i)
    return picked.slice(0, 4)
  })

  const businessName = computed(() => auth.user?.tenant?.name?.trim() || auth.user?.brand?.name || '')

  return { sectionTitle, items, primary, businessName }
}
