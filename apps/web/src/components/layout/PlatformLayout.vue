<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header
      class="sticky top-0 z-50 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 sm:px-6"
    >
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Plataforma</p>
          <p class="text-lg font-semibold text-gray-800 dark:text-white">Super Admin</p>
        </div>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
          @click="logout"
        >
          Cerrar sesión
        </button>
        <nav class="order-last -mx-1 flex w-full gap-1 overflow-x-auto" aria-label="Secciones de plataforma">
          <router-link
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium"
            :class="
              isActive(item.to)
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
            "
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            {{ item.label }}
          </router-link>
        </nav>
      </div>
    </header>
    <main id="contenido" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const items = [
  { to: '/platform', label: 'Resumen y analítica' },
  { to: '/platform/promociones', label: 'Códigos de promoción' },
  { to: '/platform/integraciones', label: 'Integraciones' },
  { to: '/platform/terminos', label: 'Términos' },
  { to: '/platform/legal', label: 'Legal y cumplimiento' },
  { to: '/platform/bitacora', label: 'Bitácora' },
  { to: '/platform/estado', label: 'Estado' },
  { to: '/platform/seguridad', label: 'Seguridad' },
]

function isActive(to: string): boolean {
  if (to === '/platform') return route.path === '/platform' || route.path.startsWith('/platform/tenants')
  return route.path.startsWith(to)
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>
