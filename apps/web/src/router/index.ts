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
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/showroom/Dashboard.vue'),
      meta: { title: 'Dashboard' },
    },
    {
      path: '/brands',
      name: 'Brands',
      component: () => import('../views/showroom/Brands.vue'),
      meta: { title: 'Marcas', adminOnly: true },
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
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  document.title = `${to.meta.title || 'Panel'} | Panel Bubbles Showroom`

  const auth = useAuthStore()

  if (!to.meta.public && !auth.isAuthenticated) {
    return next('/login')
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return next('/')
  }

  if (!auth.user && auth.isAuthenticated) {
    await auth.fetchMe()
  }

  if (to.meta.adminOnly && auth.user?.role !== 'ADMIN') {
    return next('/')
  }

  next()
})

export default router
