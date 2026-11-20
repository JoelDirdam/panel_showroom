<template>
  <header class="sticky top-0 z-30 border-b border-gray-200/80 bg-gray-50/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-6">
      <router-link to="/" class="flex min-h-11 items-center" aria-label="COSDI, inicio">
        <span class="font-display text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">COSDI</span>
      </router-link>

      <nav class="hidden items-center gap-1 lg:flex" aria-label="Principal">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
        >
          {{ l.label }}
        </a>
      </nav>

      <div class="flex items-center gap-2">
        <router-link to="/login" class="ui-btn ui-btn-ghost hidden sm:inline-flex">Ingresar</router-link>
        <router-link to="/register?plan=CITAS_PANEL" class="ui-btn ui-btn-primary hidden sm:inline-flex">Crear cuenta</router-link>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-white/5"
          :aria-expanded="open"
          aria-controls="menu-movil"
          :aria-label="open ? 'Cerrar menú' : 'Abrir menú'"
          @click="open = !open"
        >
          <X v-if="open" class="h-6 w-6" aria-hidden="true" />
          <Menu v-else class="h-6 w-6" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div v-if="open" id="menu-movil" class="border-t border-gray-200 bg-gray-50 px-5 pb-5 pt-2 lg:hidden dark:border-gray-800 dark:bg-gray-900">
      <nav aria-label="Principal (móvil)">
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="flex min-h-12 items-center border-b border-gray-200 text-base font-medium text-gray-800 dark:border-gray-800 dark:text-gray-200"
          @click="open = false"
        >
          {{ l.label }}
        </a>
      </nav>
      <div class="mt-4 grid gap-2">
        <router-link to="/register?plan=CITAS_PANEL" class="ui-btn ui-btn-primary w-full">Crear cuenta</router-link>
        <router-link to="/login" class="ui-btn ui-btn-secondary w-full">Ingresar a mi panel</router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, X } from 'lucide-vue-next'

const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

const links = [
  { label: 'Qué es COSDI', href: '/#que-es' },
  { label: 'Funciones', href: '/#funciones' },
  { label: 'Cómo funciona', href: '/#como-funciona' },
  { label: 'Planes', href: '/#planes' },
  { label: 'Preguntas', href: '/#preguntas' },
]
</script>
