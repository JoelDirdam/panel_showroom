import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { left: 0, top: 0 }
  },
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/showroom/Login.vue'),
      meta: { title: 'Iniciar sesión', public: true },
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
      meta: { title: 'Planes', public: true },
    },
    {
      // Compat: la landing vivía en /planes
      path: '/planes',
      redirect: '/',
    },
    {
      path: '/terms',
      name: 'Terms',
      component: () => import('../views/marketing/Terms.vue'),
      meta: { title: 'Términos y Condiciones', public: true },
    },
    // --- Alta / onboarding ---------------------------------------------
    {
      path: '/register',
      name: 'Register',
      component: () => import('../views/onboarding/Register.vue'),
      meta: { title: 'Crear cuenta', public: true },
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
      meta: { title: 'Home' },
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
      path: '/agenda',
      name: 'Agenda',
      component: () => import('../views/showroom/Agenda.vue'),
      meta: { title: 'Agenda' },
    },
    {
      path: '/sales',
      name: 'Sales',
      component: () => import('../views/showroom/Sales.vue'),
      meta: { title: 'Ventas/Tickets' },
    },
    {
      path: '/caja',
      name: 'Caja',
      component: () => import('../views/showroom/Caja.vue'),
      meta: { title: 'Caja', adminOnly: true },
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
  document.title = `${to.meta.title || 'Panel'} | PuntoManeki`

  const auth = useAuthStore()
  const appHome = '/home'

  if (!to.meta.public && !auth.isAuthenticated) {
    return next('/login')
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

  // Mientras deba cambiar contraseña, no se evalúan términos/onboarding
  // todavía (evita rebotes entre /change-password y estas vistas): una vez
  // resuelto el cambio de contraseña, este bloque se vuelve a evaluar.
  if (auth.isAuthenticated && !auth.mustChangePassword) {
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
          (to.path === '/onboarding/create-business' || to.path === '/onboarding/payment'))
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

  next()
})

export default router
