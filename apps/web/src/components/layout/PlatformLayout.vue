<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
    <header
      class="sticky top-0 z-50 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-gray-400">Plataforma</p>
          <h1 class="text-lg font-semibold text-gray-800 dark:text-white">Super Admin</h1>
        </div>
        <div class="flex items-center gap-3">
          <router-link
            to="/platform"
            class="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-300"
          >
            Dashboard
          </router-link>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:text-gray-200"
            @click="logout"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-6 py-8">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>
