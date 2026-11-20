<template>
  <nav
    aria-label="Navegación rápida"
    class="fixed inset-x-0 bottom-0 z-9999 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-gray-800 dark:bg-gray-900/95 md:hidden"
  >
    <ul class="grid" :style="{ gridTemplateColumns: `repeat(${primary.length + 1}, minmax(0, 1fr))` }">
      <li v-for="item in primary" :key="item.path">
        <router-link
          :to="item.path"
          :aria-current="route.path === item.path ? 'page' : undefined"
          :class="[
            'relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
            route.path === item.path ? 'text-brand-600 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400',
          ]"
        >
          <span
            :class="[
              'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
              route.path === item.path && 'bg-brand-50 dark:bg-brand-500/15',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5" aria-hidden="true" />
          </span>
          <span class="max-w-full truncate">{{ item.short ?? item.name }}</span>
          <span
            v-if="item.badge"
            class="absolute right-[calc(50%-1.25rem)] top-1.5 size-2 rounded-full bg-error-600"
            aria-hidden="true"
          />
        </router-link>
      </li>
      <li>
        <button
          type="button"
          :aria-expanded="isMobileOpen"
          aria-controls="app-sidebar"
          :class="[
            'flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium',
            isOnSecondary || isMobileOpen ? 'text-brand-600 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400',
          ]"
          @click="toggleMobileSidebar"
        >
          <span
            :class="[
              'flex h-7 w-12 items-center justify-center rounded-full',
              (isOnSecondary || isMobileOpen) && 'bg-brand-50 dark:bg-brand-500/15',
            ]"
          >
            <Menu class="h-5 w-5" aria-hidden="true" />
          </span>
          Más
        </button>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from 'lucide-vue-next'
import { useSidebar } from '@/composables/useSidebar'
import { useAppMenu } from '@/composables/useAppMenu'

const route = useRoute()
const { primary } = useAppMenu()
const { isMobileOpen, toggleMobileSidebar } = useSidebar()
const isOnSecondary = computed(() => !primary.value.some((i) => i.path === route.path))
</script>
