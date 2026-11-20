<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header class="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <div class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 font-display text-sm font-semibold text-white" aria-hidden="true">
            CO
          </span>
          <div class="leading-tight">
            <p class="font-display text-lg font-semibold text-gray-900 dark:text-white">COSDI</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Panel de plataforma</p>
          </div>
        </div>
        <UiButton size="sm" variant="secondary" @click="logout">
          <template #icon><LogOut class="h-4 w-4" aria-hidden="true" /></template>
          Cerrar sesión
        </UiButton>
      </div>
      <nav class="no-scrollbar mx-auto mt-2 flex max-w-6xl gap-1 overflow-x-auto px-3 sm:px-5" aria-label="Secciones de plataforma">
        <router-link
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="relative inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-t-lg px-3 text-sm font-medium transition-colors"
          :class="
            isActive(item.to)
              ? 'text-brand-700 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600 dark:text-brand-300'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
          "
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <component :is="item.icon" class="h-4 w-4" aria-hidden="true" />
          {{ item.label }}
        </router-link>
      </nav>
    </header>
    <main id="contenido" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import {
  Activity,
  BarChart3,
  FileText,
  Megaphone,
  MessageSquareQuote,
  Plug,
  ScrollText,
  Shield,
  Tag,
  Scale,
  LogOut,
} from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const items = [
  { to: '/platform', label: 'Resumen', icon: BarChart3 },
  { to: '/platform/redes', label: 'Redes sociales', icon: Megaphone },
  { to: '/platform/testimonios', label: 'Testimonios', icon: MessageSquareQuote },
  { to: '/platform/promociones', label: 'Promociones', icon: Tag },
  { to: '/platform/integraciones', label: 'Integraciones', icon: Plug },
  { to: '/platform/terminos', label: 'Términos', icon: FileText },
  { to: '/platform/legal', label: 'Legal', icon: Scale },
  { to: '/platform/bitacora', label: 'Bitácora', icon: ScrollText },
  { to: '/platform/estado', label: 'Estado', icon: Activity },
  { to: '/platform/seguridad', label: 'Seguridad', icon: Shield },
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
