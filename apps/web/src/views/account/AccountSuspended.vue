<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-gray-800 sm:p-8">
        <h1 class="text-xl font-bold text-gray-800 dark:text-white">Tu cuenta está suspendida</h1>
        <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
          El acceso de <strong>{{ auth.user?.tenant?.name ?? 'tu negocio' }}</strong> a COSDI está suspendido. Mientras
          tanto no se te cobra la suscripción y tus datos se conservan.
        </p>
        <p
          v-if="auth.user?.tenant?.suspendedReason"
          class="mt-4 rounded-lg bg-gray-50 p-3 text-left text-sm text-gray-700 dark:bg-white/[0.04] dark:text-gray-300"
        >
          <strong>Motivo:</strong> {{ auth.user.tenant.suspendedReason }}
        </p>
        <a
          :href="`mailto:${BUSINESS.email}?subject=${encodeURIComponent('Cuenta suspendida')}`"
          class="ui-btn ui-btn-primary mt-6 block"
        >
          Escribir a soporte ({{ BUSINESS.email }})
        </a>
        <a
          :href="BUSINESS.whatsappLink"
          target="_blank"
          rel="noopener"
          class="ui-btn ui-btn-secondary mt-3 block"
        >
          Hablar por WhatsApp
        </a>
        <p class="mt-5 text-xs text-gray-500 dark:text-gray-400">
          Puedes <router-link to="/cuenta" class="text-brand-500 underline">descargar tus datos o eliminar tu cuenta</router-link>
          en cualquier momento.
        </p>
        <button type="button" class="mt-4 text-sm text-gray-500 underline" @click="logout">Cerrar sesión</button>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { BUSINESS } from '@/lib/business'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

onMounted(async () => {
  await auth.fetchMe()
  // Si ya la reactivaron, de vuelta al panel.
  if (auth.user && !auth.user.tenant?.suspended) void router.replace('/home')
})

function logout() {
  auth.logout()
  void router.push('/login')
}
</script>
