<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-8 text-center">
          <!-- Logo: deshabilitado hasta definir branding -->
          <!-- <img src="/images/logo/logo.svg" alt="Panel Bubbles" class="mx-auto mb-4 h-10 dark:hidden" /> -->
          <!-- <img src="/images/logo/logo-dark.svg" alt="Panel Bubbles" class="mx-auto mb-4 hidden h-10 dark:block" /> -->
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Panel Showroom</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Inicia sesión para gestionar tu inventario</p>
        </div>

        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Email</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="admin@showroom.com"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Contraseña</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full rounded-lg border border-gray-300 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="••••••••"
            />
          </div>
          <p v-if="auth.error" class="text-sm text-error-500">{{ auth.error }}</p>
          <button
            type="submit"
            :disabled="auth.loading"
            class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {{ auth.loading ? 'Ingresando...' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')

async function handleSubmit() {
  const ok = await auth.login(email.value, password.value)
  if (ok) router.push('/')
}
</script>
