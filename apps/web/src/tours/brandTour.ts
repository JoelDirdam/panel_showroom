import type { TourStepDef } from './types'

export function getBrandTourSteps(): TourStepDef[] {
  return [
    {
      element: '[data-tour="app-sidebar"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Bienvenida al panel',
        description:
          'Este menú te lleva a todo lo que necesitas como marca: productos, stock, solicitudes, agenda y ventas.',
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
        description: 'Resumen de tu marca dentro del showroom.',
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
        description: 'Consulta tu catálogo ya aceptado por el showroom (solo lectura).',
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
        description: 'Ve cuánto inventario de tu marca hay en el showroom.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="sidebar-requests"]',
      route: '/',
      ensureSidebar: true,
      disableInteraction: true,
      popover: {
        title: 'Solicitar productos',
        description: 'Desde aquí pides productos nuevos o restock. El showroom los revisa y acepta.',
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
        description: 'Reserva horarios para llevar stock o recoger tu corte.',
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
        description: 'Consulta las ventas de tus productos en el showroom.',
        side: 'right',
      },
    },
    {
      element: '[data-tour="requests-new-product"]',
      route: '/product-requests',
      disableInteraction: true,
      popover: {
        title: 'Solicitar un producto',
        description:
          'Completa nombre, SKU, precio y cantidad. La solicitud queda pendiente hasta que el showroom la acepte.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="requests-restock"]',
      route: '/product-requests',
      disableInteraction: true,
      popover: {
        title: 'Solicitar restock',
        description: 'Si ya tienes productos aceptados, pide más cantidad desde este formulario.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="products-catalog"]',
      route: '/products',
      disableInteraction: true,
      popover: {
        title: 'Tu catálogo',
        description:
          'Los productos aceptados aparecen aquí. Para agregar o reponer, usa «Solicitar producto o restock».',
        side: 'top',
      },
    },
    {
      element: '[data-tour="stock-table"]',
      route: '/stock',
      disableInteraction: true,
      popover: {
        title: 'Tu inventario',
        description:
          'Consulta cantidades y mínimos. Si necesitas reponer, usa «Solicitar restock».',
        side: 'top',
      },
    },
    {
      element: '[data-tour="agenda-calendar"]',
      route: '/agenda',
      disableInteraction: true,
      popover: {
        title: 'Reservar en la agenda',
        description:
          'Elige un día con disponibilidad, selecciona un horario y reserva para llevar stock o recoger corte.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="agenda-appointments"]',
      route: '/agenda',
      disableInteraction: true,
      popover: {
        title: 'Mis citas',
        description: 'Aquí ves y puedes cancelar tus reservas confirmadas.',
        side: 'top',
      },
    },
    {
      element: '[data-tour="sales-table"]',
      route: '/sales',
      disableInteraction: true,
      popover: {
        title: 'Tus ventas',
        description:
          'Revisa las líneas de venta de tus productos: cantidades, totales y si ya entraron en corte o estánago.',
        side: 'top',
      },
    },
  ]
}
