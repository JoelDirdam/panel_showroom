<template>
  <aside
    id="app-sidebar"
    data-tour="app-sidebar"
    aria-label="Menú principal"
    :class="[
      'fixed left-0 top-0 z-99999 flex h-dvh flex-col border-r border-gray-200 bg-white transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900',
      {
        'lg:w-[272px]': showLabels,
        'lg:w-[84px]': !isExpanded && !isHovered,
        'w-[288px] translate-x-0': isMobileOpen,
        '-translate-x-full': !isMobileOpen,
        'lg:translate-x-0': true,
      },
    ]"
    @mouseenter="!isExpanded && (isHovered = true)"
    @mouseleave="isHovered = false"
  >
    <div :class="['flex items-center gap-3 px-5 pb-4 pt-6', !showLabels && 'lg:justify-center lg:px-0']">
      <router-link
        to="/home"
        class="flex min-w-0 items-center gap-3 rounded-xl text-gray-900 dark:text-white"
        :aria-label="businessName ? `${businessName}, ir al inicio` : 'COSDI, ir al inicio'"
      >
        <span
          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 font-display text-base font-semibold text-white"
          aria-hidden="true"
        >
          {{ initials }}
        </span>
        <span v-if="showLabels" class="min-w-0">
          <span class="block truncate font-display text-[15px] font-semibold leading-5">
            {{ businessName || 'COSDI' }}
          </span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">Panel · {{ sectionTitle }}</span>
        </span>
      </router-link>
      <button
        v-if="isMobileOpen"
        type="button"
        class="ml-auto flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 lg:hidden dark:hover:bg-white/5"
        aria-label="Cerrar menú"
        @click="toggleMobileSidebar"
      >
        <X class="h-5 w-5" aria-hidden="true" />
      </button>
    </div>

    <nav class="no-scrollbar flex-1 overflow-y-auto px-3 pb-6">
      <p v-if="showLabels" class="px-3 pb-2 pt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {{ sectionTitle }}
      </p>
      <ul class="flex flex-col gap-1">
        <li v-for="item in items" :key="item.path">
          <router-link
            :to="item.path"
            :data-tour="item.tourKey"
            :aria-current="isActive(item.path) ? 'page' : undefined"
            :title="!showLabels ? item.name : undefined"
            :class="[
              'group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors',
              isActive(item.path)
                ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5',
              !showLabels && 'lg:justify-center',
            ]"
          >
            <span
              v-if="isActive(item.path)"
              class="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-500"
              aria-hidden="true"
            />
            <component
              :is="item.icon"
              :class="[
                'h-5 w-5 shrink-0',
                isActive(item.path) ? 'text-brand-500 dark:text-brand-300' : 'text-gray-500 group-hover:text-gray-700 dark:text-gray-400',
              ]"
              aria-hidden="true"
            />
            <span v-if="showLabels" class="truncate">{{ item.name }}</span>
            <span
              v-if="item.badge && showLabels"
              class="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-error-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white"
            >
              {{ item.badge }}
              <span class="sr-only">pendientes</span>
            </span>
            <span
              v-else-if="item.badge"
              class="absolute right-2 top-2 size-2 rounded-full bg-error-600"
              aria-hidden="true"
            />
          </router-link>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { X } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useProductRequestsStore } from '@/stores/productRequests'
import { useSidebar } from '@/composables/useSidebar'
import { useAppMenu } from '@/composables/useAppMenu'

const route = useRoute()
const auth = useAuthStore()
const productRequests = useProductRequestsStore()
const { isExpanded, isMobileOpen, isHovered, toggleMobileSidebar } = useSidebar()
const { items, sectionTitle, businessName } = useAppMenu()

const showLabels = computed(() => isExpanded.value || isHovered.value || isMobileOpen.value)

const initials = computed(() => {
  const name = businessName.value || 'COSDI'
  const words = name.split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? 'C') + (words[1]?.[0] ?? '')).toUpperCase()
})

const isActive = (path: string) => route.path === path

onMounted(() => {
  if (auth.isAuthenticated) productRequests.fetchPendingCount()
})

watch(
  () => auth.isAuthenticated,
  (ok) => {
    if (ok) productRequests.fetchPendingCount()
    else productRequests.clear()
  },
)

watch(
  () => route.path,
  (path) => {
    // En móvil el menú se cierra al elegir una sección.
    if (isMobileOpen.value) toggleMobileSidebar()
    if (path === '/product-requests' && auth.isAuthenticated) productRequests.fetchPendingCount()
  },
)
</script>
