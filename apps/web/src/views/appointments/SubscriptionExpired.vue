<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
    <div class="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-gray-800">
      <div class="mb-3 text-4xl">⏸️</div>
      <h1 class="text-xl font-bold text-gray-800 dark:text-white">Tu cuenta está pausada</h1>
      <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
        Tu prueba o suscripción venció. Tus clientes <strong>siguen pudiendo agendar</strong> en tu link y
        ninguna cita se pierde: las verás completas en cuanto reactives tu plan.
      </p>
      <a
        v-if="supportLink"
        :href="supportLink"
        target="_blank"
        rel="noopener"
        class="mt-6 block rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600"
      >
        Reactivar mi cuenta
      </a>
      <p v-else class="mt-6 text-sm text-gray-500">Contacta a soporte de COSDI para reactivar tu cuenta.</p>
      <button class="mt-4 text-sm text-gray-500 underline" @click="logout">Cerrar sesión</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

// Mientras no exista cobro en línea, el pago de reactivación se coordina por WhatsApp de soporte.
const supportLink = computed(() => {
  const raw = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined
  const digits = raw?.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}?text=${encodeURIComponent('Hola, quiero reactivar mi cuenta de COSDI.')}`
})

function logout() {
  auth.logout?.()
  void router.push('/login')
}
</script>
