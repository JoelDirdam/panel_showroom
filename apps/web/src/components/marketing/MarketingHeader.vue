<template>
  <header
    class="sticky top-0 z-30 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"
  >
    <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
      <router-link to="/" class="flex items-center gap-2.5" aria-label="COSDI, inicio">
        <span class="text-2xl font-extrabold tracking-tight text-gray-800 dark:text-white">COSDI</span>
      </router-link>

      <nav class="hidden items-center gap-7 md:flex" aria-label="Principal">
        <a v-for="l in links" :key="l.href" :href="l.href" class="text-sm font-medium text-gray-600 hover:text-brand-500 dark:text-gray-300 dark:hover:text-brand-400">
          {{ l.label }}
        </a>
      </nav>

      <div class="flex items-center gap-3">
        <router-link
          to="/login"
          class="hidden text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white sm:block"
        >
          Ingresar
        </router-link>
        <router-link
          to="/register?plan=CITAS_PANEL"
          class="ui-btn ui-btn-primary"
        >
          Crear cuenta
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const links = [
  { label: 'Qué es COSDI', href: '/#que-es' },
  { label: 'Funciones', href: '/#funciones' },
  { label: 'Planes', href: '/#planes' },
  { label: 'Contacto', href: '/#contacto' },
]
</script>
