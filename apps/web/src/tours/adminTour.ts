import type { TourStepDef } from './types'
import { TOUR_OPEN_BRANDS_MODAL, TOUR_OPEN_SALES_MODAL } from './tourEvents'

export function getAdminTourSteps(): TourStepDef[] {
  return [
    {
      element: '[data-tour="app-sidebar"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Bienvenido al panel',
        description:
          'Este menú lateral es tu mapa del showroom. Te explicamos cada sección y el orden recomendado para empezar.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-dashboard"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Dashboard',
        description: 'Resumen general del showroom: métricas y actividad reciente.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-brands"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Marcas',
        description:
          'Aquí registras las marcas del showroom y creas su acceso. Es el primer paso con un showroom nuevo.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-products"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Productos',
        description: 'Catálogo de productos propios o de marcas. Puedes agregarlos tú o esperar solicitudes.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-stock"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Stock',
        description: 'Inventario en el showroom: cantidades, mínimos y alertas de stock bajo.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-requests"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Solicitudes',
        description:
          'Cuando una marca pide un producto o restock, aparece aquí para que lo revises y aceptes.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-agenda"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Agenda',
        description: 'Horarios para que las marcas lleven stock o recojan su corte.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-sales"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Ventas / Tickets',
        description: 'Registro de ventas al cliente final: productos, totales y método de pago.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="brands-create"]',
      route: '/brands',
      disableInteraction: true,
      popover: {
        title: 'Registrar una marca',
        description:
          'Lo primero: crea una marca con «Nueva marca». Completa nombre, email de contacto y WhatsApp si lo tienes.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="brands-modal"]',
      route: '/brands',
      open: TOUR_OPEN_BRANDS_MODAL,
      disableInteraction: true,
      popover: {
        title: 'Usuario y credenciales',
        description:
          'Marca «Crear usuario de acceso» y define una contraseña temporal. Al guardar verás las credenciales: cópialas y compártelas con la marca (email + contraseña). Ellos deberán cambiar la contraseña al entrar.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="products-create"]',
      route: '/products',
      disableInteraction: true,
      popover: {
        title: 'Agregar productos',
        description:
          'Puedes agregar productos del showroom (marca propia) o de una marca. También puedes esperar a que la marca los solicite.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="products-catalog"]',
      route: '/products',
      disableInteraction: true,
      popover: {
        title: 'Catálogo',
        description: 'Aquí verás todos los productos activos del showroom, con stock y precio.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="requests-pending"]',
      route: '/product-requests',
      disableInteraction: true,
      popover: {
        title: 'Revisar solicitudes',
        description:
          'Si la marca crea productos o pide restock, llegan aquí. Selecciónalos y acéptalos. Si hay observaciones, contacta a la marca por WhatsApp o email.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="requests-accept"]',
      route: '/product-requests',
      disableInteraction: true,
      popover: {
        title: 'Aceptar',
        description: 'Con solicitudes seleccionadas, usa este botón para aceptarlas e incorporarlas al catálogo.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="sales-create"]',
      route: '/sales',
      disableInteraction: true,
      popover: {
        title: 'Registrar una venta',
        description: 'Con productos listos, entra a Ventas y pulsa «Registrar venta» para iniciar un ticket.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="sales-product-input"]',
      route: '/sales',
      open: TOUR_OPEN_SALES_MODAL,
      disableInteraction: true,
      popover: {
        title: 'Producto y cantidad',
        description:
          'Elige el producto (SKU o nombre) y la cantidad. Al dar Enter en cantidad se agrega otro renglón para el siguiente producto.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="sales-total"]',
      route: '/sales',
      open: TOUR_OPEN_SALES_MODAL,
      disableInteraction: true,
      popover: {
        title: 'Total a pagar',
        description: 'Aquí ves el gran total del ticket según productos, descuentos y comisiones.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="sales-payment-method"]',
      route: '/sales',
      open: TOUR_OPEN_SALES_MODAL,
      disableInteraction: true,
      popover: {
        title: 'Método de pago',
        description: 'Selecciona el método que eligió el cliente final (efectivo, tarjeta, transferencia u otro) y guarda la venta.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="stock-table"]',
      route: '/stock',
      disableInteraction: true,
      popover: {
        title: 'Stock del showroom',
        description:
          'Ajusta cantidades y mínimos. El estado Bajo/OK te avisa cuando hay que reponer. Guarda los cambios por fila.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="agenda-stock-rule"]',
      route: '/agenda',
      disableInteraction: true,
      popover: {
        title: 'Disponibilidad de agenda',
        description:
          'Activa «Llevar stock» y «Recoger corte» y define el horario semanal. Las marcas podrán reservar esos horarios en el calendario.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="agenda-calendar"]',
      route: '/agenda',
      disableInteraction: true,
      popover: {
        title: 'Calendario',
        description: 'Consulta días con disponibilidad y reservas. Así coordinas entregas y recogidas con las marcas.',
        side: 'top',
      },
    },
  ]
}
