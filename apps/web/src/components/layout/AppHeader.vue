<template>
  <header
    class="sticky top-0 z-9999 flex h-16 w-full items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:border-gray-800 dark:bg-gray-900/90 md:px-6"
  >
    <button
      type="button"
      :aria-label="isMobileOpen ? 'Cerrar menú' : 'Abrir menú'"
      :aria-expanded="isMobileOpen"
      aria-controls="app-sidebar"
      class="hidden h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 md:flex"
      @click="handleToggle"
    >
      <PanelLeft class="h-5 w-5" aria-hidden="true" />
    </button>

    <!-- En móvil el nombre del negocio ocupa el lugar del botón de menú (la navegación va abajo). -->
    <router-link to="/home" class="min-w-0 flex-1 md:hidden">
      <span class="block truncate font-display text-base font-semibold text-gray-900 dark:text-white">
        {{ businessName || 'COSDI' }}
      </span>
    </router-link>

    <div class="ml-auto flex items-center gap-2">
      <ThemeToggler />
      <UserMenu />
    </div>
  </header>
</template>

<script setup lang="ts">
import { PanelLeft } from 'lucide-vue-next'
import { useSidebar } from '@/composables/useSidebar'
import { useAppMenu } from '@/composables/useAppMenu'
import ThemeToggler from '../common/ThemeToggler.vue'
import UserMenu from './header/UserMenu.vue'

const { toggleSidebar, toggleMobileSidebar, isMobileOpen } = useSidebar()
const { businessName } = useAppMenu()

const handleToggle = () => {
  if (window.innerWidth >= 1024) toggleSidebar()
  else toggleMobileSidebar()
}
</script>
