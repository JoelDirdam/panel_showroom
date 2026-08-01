import type { TourStepDef } from './types'

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
          'Lo primero: crea una marca con «Nueva marca». Se abre un formulario dedicado para capturar sus datos.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="brand-form"]',
      route: '/brands/new',
      disableInteraction: true,
      popover: {
        title: 'Datos de la marca',
        description:
          'Completa nombre, renta, espacio asignado, fecha de corte, % de comisión y quién paga cada tipo de comisión.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="brand-save"]',
      route: '/brands/new',
      disableInteraction: true,
      popover: {
        title: 'Guardar y continuar',
        description:
          'Al guardar pasarás a la pantalla de «Propietario y accesos», donde puedes generar un código temporal para que la marca reclame su acceso.',
        side: 'top',
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
        description:
          'Con productos listos, pulsa «Registrar venta» para abrir la Caja POS y cobrar el ticket.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="caja-search"]',
      route: '/caja',
      disableInteraction: true,
      popover: {
        title: 'Buscar o escanear',
        description:
          'Escanea el código o busca por nombre/marca. Enter agrega el producto al carrito de la caja activa.',
        side: 'bottom',
      },
    },
    {
      element: '[data-tour="caja-total"]',
      route: '/caja',
      disableInteraction: true,
      popover: {
        title: 'Total a pagar',
        description: 'Aquí ves el total del ticket con descuentos e IVA si está activado.',
        side: 'left',
      },
    },
    {
      element: '[data-tour="caja-payment"]',
      route: '/caja',
      disableInteraction: true,
      popover: {
        title: 'Método de pago',
        description:
          'Elige efectivo, tarjeta, transferencia o mixto y confirma la compra para registrar el ticket.',
        side: 'left',
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
