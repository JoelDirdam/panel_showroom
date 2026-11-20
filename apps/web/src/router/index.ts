import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { EntitlementModule } from '@/lib/entitlements'
import { ensureTrackers, initTrackers, trackPageView, trackersActive } from '@/lib/trackers'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Anclas dentro del panel (ej. /appointments/config#vacaciones): espera a que carguen los datos.
    if (to.hash && !to.meta.tracking) {
      return new Promise((resolve) =>
        setTimeout(() => resolve({ el: to.hash, top: 88, behavior: 'smooth' }), 450),
      )
    }
    return { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/showroom/Login.vue'),
      meta: { title: 'Iniciar sesión', public: true },
    },
    {
      path: '/recuperar-contrasena',
      name: 'ForgotPassword',
      component: () => import('../views/showroom/ForgotPassword.vue'),
      meta: { title: 'Recuperar contraseña', public: true },
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: () => import('../views/showroom/ChangePassword.vue'),
      meta: { title: 'Cambiar contraseña', allowMustChangePassword: true },
    },
    // --- Landing / marketing público ---------------------------------
    {
      path: '/',
      name: 'LandingPlanes',
      component: () => import('../views/marketing/LandingPlanes.vue'),
      // `tracking`: páginas públicas de COSDI donde puede haber analítica/publicidad,
      // siempre después del consentimiento (ver lib/trackers.ts).
      meta: { title: 'Inicio', public: true, tracking: true },
    },
    {
      // Compat: la landing vivía en /planes
      path: '/planes',
      redirect: '/',
    },
    {
      path: '/privacidad',
      name: 'PrivacyNotice',
      component: () => import('../views/marketing/PrivacyNotice.vue'),
      meta: { title: 'Aviso de privacidad', public: true, tracking: true, legal: true },
    },
    {
      // Una sola fuente: el documento versionado que se acepta al registrarse.
      path: '/terminos',
      name: 'Terms',
      component: () => import('../views/marketing/Terms.vue'),
      meta: { title: 'Términos y condiciones', public: true, tracking: true, legal: true },
    },
    {
      path: '/terms',
      redirect: '/terminos',
    },
    {
      path: '/reembolsos',
      name: 'RefundPolicy',
      component: () => import('../views/marketing/RefundPolicy.vue'),
      meta: { title: 'Política de reembolsos', public: true, tracking: true, legal: true },
    },
    {
      path: '/conservacion-de-datos',
      name: 'DataRetention',
      component: () => import('../views/marketing/DataRetention.vue'),
      meta: { title: 'Conservación de datos', public: true, tracking: true, legal: true },
    },
    {
      path: '/proveedores',
      name: 'Subprocessors',
      component: () => import('../views/marketing/Subprocessors.vue'),
      meta: { title: 'Proveedores que tratan datos', public: true, tracking: true, legal: true },
    },
    {
      path: '/derechos-de-autor',
      name: 'CopyrightClaims',
      component: () => import('../views/marketing/CopyrightClaims.vue'),
      meta: { title: 'Reclamos de derechos de autor', public: true, tracking: true, legal: true },
    },
    {
      path: '/cookies',
      name: 'CookiePolicy',
      component: () => import('../views/marketing/CookiePolicy.vue'),
      meta: { title: 'Política de cookies', public: true, tracking: true, legal: true },
    },
    {
      // Sin rastreo: llega desde un correo con un token personal en la URL.
      path: '/baja-correos',
      name: 'Unsubscribe',
      component: () => import('../views/marketing/Unsubscribe.vue'),
      meta: { title: 'Baja de correos', public: true, legal: true },
    },
    // --- Alta / onboarding ---------------------------------------------
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/onboarding/Register.vue'),
      meta: { title: 'Crear cuenta', public: true, tracking: true },
    },
    {
      path: '/onboarding/accept-terms',
      name: 'OnboardingAcceptTerms',
      component: () => import('../views/onboarding/AcceptTerms.vue'),
      meta: { title: 'Términos y Condiciones', allowMustChangePassword: true },
    },
    {
      path: '/onboarding/verify-email',
      name: 'OnboardingVerifyEmail',
      component: () => import('../views/onboarding/VerifyEmail.vue'),
      meta: { title: 'Verifica tu correo' },
    },
    {
      path: '/onboarding/select-plan',
      name: 'OnboardingSelectPlan',
      component: () => import('../views/onboarding/SelectPlan.vue'),
      meta: { title: 'Elige tu plan' },
    },
    {
      path: '/onboarding/confirm-plan',
      name: 'OnboardingConfirmPlan',
      component: () => import('../views/onboarding/ConfirmPlan.vue'),
      meta: { title: 'Confirma tu plan' },
    },
    {
      path: '/onboarding/payment',
      name: 'OnboardingPayment',
      component: () => import('../views/onboarding/PaymentPending.vue'),
      meta: { title: 'Pago del plan' },
    },
    {
      path: '/onboarding/create-business',
      name: 'OnboardingCreateBusiness',
      component: () => import('../views/onboarding/CreateBusiness.vue'),
      meta: { title: 'Crea tu negocio' },
    },
    {
      path: '/onboarding/hub',
      name: 'OnboardingHub',
      component: () => import('../views/onboarding/ModulesHub.vue'),
      meta: { title: 'Módulos de tu negocio' },
    },
    {
      path: '/home',
      name: 'Home',
      component: () => import('../views/showroom/Home.vue'),
      meta: { title: 'Inicio' },
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/showroom/Dashboard.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/brands',
      name: 'Brands',
      component: () => import('../views/showroom/brands/BrandsList.vue'),
      meta: { title: 'Marcas', adminOnly: true },
    },
    {
      path: '/brands/import',
      name: 'BrandsImport',
      component: () => import('../views/showroom/brands/BrandsImport.vue'),
      meta: { title: 'Importar marcas', adminOnly: true },
    },
    {
      path: '/brands/new',
      name: 'BrandCreate',
      component: () => import('../views/showroom/brands/BrandForm.vue'),
      meta: { title: 'Nueva marca', adminOnly: true },
    },
    {
      path: '/brands/mine',
      name: 'HouseBrandCreate',
      component: () => import('../views/showroom/brands/HouseBrandForm.vue'),
      meta: { title: 'Mi marca', adminOnly: true },
    },
    {
      path: '/brands/:id/edit',
      name: 'BrandEdit',
      component: () => import('../views/showroom/brands/BrandForm.vue'),
      meta: { title: 'Editar marca', adminOnly: true },
    },
    {
      path: '/brands/:id/owner',
      name: 'BrandOwner',
      component: () => import('../views/showroom/brands/BrandOwner.vue'),
      meta: { title: 'Propietario y accesos', adminOnly: true },
    },
    {
      path: '/brands/:id/products/import',
      name: 'BrandProductsImport',
      component: () => import('../views/showroom/products/ProductsImport.vue'),
      meta: { title: 'Importar productos', adminOnly: true },
    },
    {
      path: '/brands/:id/products/new',
      name: 'BrandProductNew',
      component: () => import('../views/showroom/products/ProductFormPage.vue'),
      meta: { title: 'Nuevo producto de marca' },
    },
    {
      path: '/brands/:id/products/add-stock',
      name: 'BrandProductAddStock',
      component: () => import('../views/showroom/products/ProductStockPage.vue'),
      meta: { title: 'Agregar stock' },
    },
    {
      path: '/brands/:id/products/withdraw',
      name: 'BrandProductWithdraw',
      component: () => import('../views/showroom/products/ProductWithdrawPage.vue'),
      meta: { title: 'Solicitar retiro' },
    },
    {
      path: '/brands/:id/products/:productId/edit',
      name: 'BrandProductEdit',
      component: () => import('../views/showroom/products/ProductFormPage.vue'),
      meta: { title: 'Editar producto de marca' },
    },
    {
      path: '/brands/:id/products',
      name: 'BrandProducts',
      component: () => import('../views/showroom/brands/BrandDetail.vue'),
      meta: { title: 'Productos de la marca', adminOnly: true },
    },
    {
      path: '/brands/:id',
      name: 'BrandDetail',
      component: () => import('../views/showroom/brands/BrandDetail.vue'),
      meta: { title: 'Resumen de marca', adminOnly: true },
    },
    {
      path: '/products/import',
      name: 'ProductsImport',
      component: () => import('../views/showroom/products/ProductsImport.vue'),
      meta: { title: 'Importar productos', adminOnly: true },
    },
    {
      path: '/products/new',
      name: 'ProductNew',
      component: () => import('../views/showroom/products/ProductFormPage.vue'),
      meta: { title: 'Agregar producto' },
    },
    {
      path: '/products/add-stock',
      name: 'ProductAddStock',
      component: () => import('../views/showroom/products/ProductStockPage.vue'),
      meta: { title: 'Agregar stock' },
    },
    {
      path: '/products/withdraw',
      name: 'ProductWithdraw',
      component: () => import('../views/showroom/products/ProductWithdrawPage.vue'),
      meta: { title: 'Solicitar retiro' },
    },
    {
      path: '/products/:productId/edit',
      name: 'ProductEdit',
      component: () => import('../views/showroom/products/ProductFormPage.vue'),
      meta: { title: 'Editar producto' },
    },
    {
      path: '/products',
      name: 'Products',
      component: () => import('../views/showroom/Products.vue'),
      meta: { title: 'Productos' },
    },
    {
      path: '/stock',
      name: 'Stock',
      component: () => import('../views/showroom/Stock.vue'),
      meta: { title: 'Stock' },
    },
    {
      path: '/product-requests',
      name: 'ProductRequests',
      component: () => import('../views/showroom/ProductRequests.vue'),
      meta: { title: 'Solicitudes de productos' },
    },
    {
      path: '/appointments',
      name: 'Appointments',
      component: () => import('../views/appointments/AppointmentsView.vue'),
      meta: { title: 'Citas', adminOnly: true },
    },
    {
      path: '/appointments/config',
      name: 'ServicesConfig',
      component: () => import('../views/appointments/ServicesConfigView.vue'),
      meta: { title: 'Servicios y horarios', adminOnly: true },
    },
    {
      path: '/appointments/whatsapp',
      name: 'WhatsappReminders',
      component: () => import('../views/appointments/WhatsappRemindersView.vue'),
      meta: { title: 'Recordatorios por WhatsApp', adminOnly: true },
    },
    {
      // Seguridad (2FA), privacidad, descarga y eliminación de datos. Disponible
      // siempre: con la cuenta pausada o con términos nuevos por aceptar.
      path: '/cuenta',
      name: 'Account',
      component: () => import('../views/account/AccountView.vue'),
      meta: { title: 'Mi cuenta', allowMustChangePassword: true, alwaysAllowed: true },
    },
    {
      path: '/cuenta-suspendida',
      name: 'AccountSuspended',
      component: () => import('../views/account/AccountSuspended.vue'),
      meta: { title: 'Cuenta suspendida', allowMustChangePassword: true, alwaysAllowed: true },
    },
    {
      path: '/suscripcion',
      name: 'Subscription',
      component: () => import('../views/billing/SubscriptionView.vue'),
      meta: { title: 'Mi suscripción', adminOnly: true },
    },
    {
      path: '/reservar/:slug',
      name: 'PublicBooking',
      component: () => import('../views/appointments/PublicBooking.vue'),
      meta: { title: 'Agendar cita', public: true },
    },
    {
      path: '/suscripcion-vencida',
      name: 'SubscriptionExpired',
      component: () => import('../views/appointments/SubscriptionExpired.vue'),
      meta: { title: 'Cuenta pausada' },
    },
    {
      path: '/agenda',
      name: 'Agenda',
      component: () => import('../views/showroom/Agenda.vue'),
      meta: { title: 'Agenda' },
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('../views/showroom/Sales.vue'),
      meta: { title: 'Ventas/Tickets', moduleId: 'sales' },
    },
    {
      path: '/caja',
      name: 'Caja',
      component: () => import('../views/showroom/Caja.vue'),
      meta: { title: 'Caja', adminOnly: true, moduleId: 'caja' },
    },
    {
      path: '/customers',
      name: 'Customers',
      component: () => import('../views/showroom/Customers.vue'),
      meta: { title: 'Clientes', adminOnly: true, moduleId: 'customers' },
    },
    {
      path: '/layaways',
      name: 'Layaways',
      component: () => import('../views/showroom/Layaways.vue'),
      meta: { title: 'Apartados', adminOnly: true, moduleId: 'layaways' },
    },
    {
      path: '/corte-caja',
      name: 'CashRegister',
      component: () => import('../views/showroom/CashRegister.vue'),
      meta: { title: 'Corte de caja', adminOnly: true, moduleId: 'caja' },
    },
    {
      path: '/employees',
      name: 'Employees',
      component: () => import('../views/showroom/Employees.vue'),
      meta: { title: 'Empleados', adminOnly: true },
    },
    {
      path: '/platform',
      name: 'PlatformDashboard',
      component: () => import('../views/platform/PlatformDashboard.vue'),
      meta: { title: 'Plataforma', platformOnly: true },
    },
    {
      path: '/platform/redes',
      name: 'PlatformSocial',
      component: () => import('../views/platform/PlatformSocial.vue'),
      meta: { title: 'Redes sociales', platformOnly: true },
    },
    {
      path: '/platform/testimonios',
      name: 'PlatformTestimonials',
      component: () => import('../views/platform/PlatformTestimonials.vue'),
      meta: { title: 'Testimonios', platformOnly: true },
    },
    {
      path: '/platform/promociones',
      name: 'PlatformPromoCodes',
      component: () => import('../views/platform/PlatformPromoCodes.vue'),
      meta: { title: 'Códigos de promoción', platformOnly: true },
    },
    {
      path: '/platform/integraciones',
      name: 'PlatformIntegrations',
      component: () => import('../views/platform/PlatformIntegrations.vue'),
      meta: { title: 'Integraciones', platformOnly: true },
    },
    {
      path: '/platform/legal',
      name: 'PlatformLegal',
      component: () => import('../views/platform/PlatformLegal.vue'),
      meta: { title: 'Legal y cumplimiento', platformOnly: true },
    },
    {
      path: '/platform/terminos',
      name: 'PlatformTerms',
      component: () => import('../views/platform/PlatformTerms.vue'),
      meta: { title: 'Términos', platformOnly: true },
    },
    {
      path: '/platform/bitacora',
      name: 'PlatformAuditLog',
      component: () => import('../views/platform/PlatformAuditLog.vue'),
      meta: { title: 'Bitácora', platformOnly: true },
    },
    {
      path: '/platform/estado',
      name: 'PlatformHealth',
      component: () => import('../views/platform/PlatformHealth.vue'),
      meta: { title: 'Estado de la plataforma', platformOnly: true },
    },
    {
      path: '/platform/seguridad',
      name: 'PlatformSecurity',
      component: () => import('../views/platform/PlatformSecurity.vue'),
      meta: { title: 'Seguridad', platformOnly: true },
    },
    {
      path: '/platform/tenants/:id',
      name: 'PlatformTenantDetail',
      component: () => import('../views/platform/PlatformTenantDetail.vue'),
      meta: { title: 'Negocio', platformOnly: true },
    },
    {
      path: '/preferences',
      name: 'Preferences',
      component: () => import('../views/showroom/Preferences.vue'),
      meta: { title: 'Preferencias', adminOnly: true },
    },
    // --- Stubs de planes CLÍNICA / RESTAURANTE ---------------------------
    // Rutas de arquitectura/placeholder, sin implementación de producto.
    // `meta.planRequired` documenta el plan al que pertenecen; hoy no
    // bloquean nada porque `auth.user.entitlements` todavía no existe (ver
    // guard más abajo y docs/plans-contracts.md).
    {
      path: '/stubs/clinic/reminders',
      name: 'ClinicReminders',
      component: () => import('../views/stubs/clinic/ClinicReminders.vue'),
      meta: { title: 'Recordatorios de pacientes', planRequired: 'CLINICA', moduleId: 'agenda', flagRequired: 'patientReminders' },
    },
    {
      path: '/stubs/clinic/history',
      name: 'ClinicHistory',
      component: () => import('../views/stubs/clinic/ClinicHistory.vue'),
      meta: { title: 'Historial médico', planRequired: 'CLINICA', moduleId: 'customers', flagRequired: 'medicalHistory' },
    },
    {
      path: '/stubs/restaurant/dishes',
      name: 'RestaurantDishes',
      component: () => import('../views/stubs/restaurant/RestaurantDishes.vue'),
      meta: { title: 'Platillos', planRequired: 'RESTAURANTE', moduleId: 'products', flagRequired: 'dishes' },
    },
    {
      path: '/stubs/restaurant/kitchen-orders',
      name: 'RestaurantKitchenOrders',
      component: () => import('../views/stubs/restaurant/RestaurantKitchenOrders.vue'),
      meta: { title: 'Comandas de cocina', planRequired: 'RESTAURANTE', moduleId: 'orders', flagRequired: 'ordersKitchen' },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

/**
 * Ruta a la que se confina al usuario mientras `onboardingStep` no sea DONE
 * (ver `apps/api/src/lib/onboarding.ts` — el orden nunca retrocede).
 * PLAN_SELECTED cubre dos vistas (confirmación + creación de negocio)
 * porque `create-business` es el único endpoint que avanza ese paso.
 */
const ONBOARDING_STEP_ROUTE: Record<string, string> = {
  REGISTERED: '/onboarding/verify-email',
  EMAIL_VERIFIED: '/onboarding/select-plan',
  PLAN_SELECTED: '/onboarding/confirm-plan',
  BUSINESS_CREATED: '/onboarding/create-business',
}

const ONBOARDING_PATHS = new Set([
  '/onboarding/verify-email',
  '/onboarding/select-plan',
  '/onboarding/confirm-plan',
  '/onboarding/payment',
  '/onboarding/create-business',
])

router.beforeEach(async (to, _from, next) => {
  document.title = `${to.meta.title || 'Panel'} | COSDI`

  const auth = useAuthStore()
  const appHome = '/home'

  // Los rastreadores solo viven en páginas públicas de COSDI. Si ya se cargó
  // alguno y se navega a una página sin rastreo (panel, login, reservas), se
  // hace una carga completa para que sus scripts desaparezcan de la página.
  if (trackersActive() && to.meta.tracking !== true) {
    window.location.assign(to.fullPath)
    return next(false)
  }

  if (!to.meta.public && !auth.isAuthenticated) {
    return next('/login')
  }

  // Las páginas legales se pueden leer siempre, con o sin sesión.
  if (to.meta.legal) {
    return next()
  }

  // Con sesión, "/" (landing) va al Home del panel
  if (to.path === '/' && auth.isAuthenticated) {
    if (auth.mustChangePassword) return next('/change-password')
    if (auth.isSuperAdmin) return next('/platform')
    return next(appHome)
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    if (auth.mustChangePassword) return next('/change-password')
    if (auth.isSuperAdmin) return next('/platform')
    return next(appHome)
  }

  if (!auth.user && auth.isAuthenticated) {
    await auth.fetchMe()
  }

  if (auth.isAuthenticated && auth.isSuperAdmin) {
    if (!to.path.startsWith('/platform') && to.path !== '/login' && to.path !== '/change-password') {
      return next('/platform')
    }
    // Sin verificación en dos pasos el SUPER_ADMIN solo puede entrar a configurarla.
    if (
      auth.user &&
      !auth.mustChangePassword &&
      auth.user.twoFactorEnabled === false &&
      // En dev la API no lo exige (twoFactorRequired = false).
      auth.user.twoFactorRequired !== false &&
      to.path.startsWith('/platform') &&
      to.path !== '/platform/seguridad'
    ) {
      return next('/platform/seguridad')
    }
  }

  if (to.meta.platformOnly && !auth.isSuperAdmin) {
    return next(appHome)
  }

  if (auth.isAuthenticated && auth.mustChangePassword && !to.meta.allowMustChangePassword) {
    return next('/change-password')
  }

  if (to.path === '/change-password' && auth.isAuthenticated && !auth.mustChangePassword) {
    return next(auth.isSuperAdmin ? '/platform' : appHome)
  }

  // SUPER_ADMIN omite términos/onboarding del showroom
  if (auth.isAuthenticated && auth.isSuperAdmin) {
    return next()
  }

  // Negocio suspendido desde la plataforma: solo la pantalla de aviso y "Mi cuenta".
  if (auth.isAuthenticated && auth.user?.tenant?.suspended) {
    if (to.path !== '/cuenta-suspendida' && to.path !== '/cuenta') return next('/cuenta-suspendida')
    return next()
  }
  if (to.path === '/cuenta-suspendida') {
    return next(appHome)
  }

  // Mientras deba cambiar contraseña, no se evalúan términos/onboarding
  // todavía (evita rebotes entre /change-password y estas vistas): una vez
  // resuelto el cambio de contraseña, este bloque se vuelve a evaluar.
  if (auth.isAuthenticated && !auth.mustChangePassword && !to.meta.alwaysAllowed) {
    // Términos vigentes: si hay una versión publicada y el usuario no la
    // aceptó (ver `terms.currentVersion`/`terms.accepted` en meShape.ts),
    // se bloquea todo menos la vista de aceptación.
    if (!auth.termsAccepted && to.path !== '/onboarding/accept-terms') {
      return next('/onboarding/accept-terms')
    }
    if (to.path === '/onboarding/accept-terms' && auth.termsAccepted) {
      return next(appHome)
    }

    // Onboarding: confina al usuario al paso pendiente hasta llegar a DONE.
    if (auth.user && auth.onboardingStep !== 'DONE') {
      const target = ONBOARDING_STEP_ROUTE[auth.onboardingStep]
      const allowed =
        to.path === target ||
        (auth.onboardingStep === 'PLAN_SELECTED' &&
          (to.path === '/onboarding/create-business' ||
            to.path === '/onboarding/payment' ||
            // Volver a elegir plan o escribir un código antes de pagar.
            to.path === '/onboarding/select-plan'))
      if (target && !allowed) {
        return next(target)
      }
    } else if (ONBOARDING_PATHS.has(to.path)) {
      // Ya completó el onboarding: no tiene sentido volver a esas vistas.
      return next(appHome)
    }
  }

  if (to.meta.adminOnly && auth.user?.role !== 'BUSINESS') {
    return next(appHome)
  }

  // `subscription.planType` viene de `/auth/me` (ver meShape.ts). Si el
  // usuario no tiene suscripción cargada todavía, no se bloquea nada.
  const planRequired = to.meta.planRequired as string | undefined
  const currentPlan = auth.user?.subscription?.planType
  if (planRequired && currentPlan && currentPlan !== planRequired) {
    return next(appHome)
  }

  // El menú ya oculta lo que el plan no incluye; esto cubre entrar por la URL.
  // Sin entitlements cargados (negocios anteriores a los planes) no se bloquea nada.
  const moduleId = to.meta.moduleId as EntitlementModule | undefined
  if (moduleId && auth.user && !auth.canAccess(moduleId)) {
    return next(appHome)
  }

  next()
})

/** Rastreo (solo con consentimiento y solo en rutas `tracking`). */
initTrackers(
  () => router.currentRoute.value.meta.tracking === true,
  () => router.currentRoute.value.path,
)

router.afterEach((to) => {
  if (to.meta.tracking !== true) return
  // Se envía la ruta sin query: nunca parámetros que pudieran traer datos personales.
  void ensureTrackers().then(() => trackPageView(to.path))
})

export default router
