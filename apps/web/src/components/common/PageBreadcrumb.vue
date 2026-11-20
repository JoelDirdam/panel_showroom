<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white/90 sm:text-[28px] sm:leading-9">
        {{ pageTitle }}
      </h1>
      <p v-if="description" class="mt-1 max-w-2xl text-[15px] text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
    </div>
    <slot name="actions" />
    <nav v-if="!isHome && !$slots.actions" aria-label="Ruta de navegación" class="hidden md:block">
      <ol class="flex items-center gap-1.5">
        <li>
          <router-link
            class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            to="/home"
          >
            Inicio
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
        </li>
        <li v-for="item in items" :key="`${item.label}-${item.to ?? ''}`">
          <router-link
            v-if="item.to"
            class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            :to="item.to"
          >
            {{ item.label }}
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
          <span v-else class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            {{ item.label }}
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </li>
        <li class="text-sm text-gray-800 dark:text-white/90" aria-current="page">
          {{ pageTitle }}
        </li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export interface BreadcrumbItem {
  label: string
  to?: string
}

interface BreadcrumbProps {
  pageTitle: string
  description?: string
  items?: BreadcrumbItem[]
}

withDefaults(defineProps<BreadcrumbProps>(), {
  items: () => [],
})

const route = useRoute()
const isHome = computed(() => route.path === '/home')
</script>
