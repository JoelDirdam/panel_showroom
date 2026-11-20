<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Seguridad</h1>
    <p class="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
      La cuenta de plataforma tiene acceso a todos los negocios: por eso exige verificación en dos pasos con una app de
      autenticación.
    </p>

    <TwoFactorCard @changed="onChanged" />

    <p v-if="justEnabled" role="status" class="mt-4 text-sm text-success-600 dark:text-success-400">
      Verificación en dos pasos activa. Ya puedes usar todo el panel:
      <router-link to="/platform" class="underline">ir al resumen</router-link>.
    </p>

    <div class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
      <h2 class="text-base font-semibold text-gray-800 dark:text-white">Si pierdes tu teléfono</h2>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        <li>Entra con uno de tus códigos de recuperación (cada uno sirve una vez).</li>
        <li>Desactiva la verificación y vuelve a activarla con tu teléfono nuevo.</li>
        <li>
          Sin teléfono ni códigos: desde el servidor se puede restablecer con
          <code class="rounded bg-gray-100 px-1 dark:bg-white/10">npm run db:reset-2fa</code> (requiere acceso a Railway).
        </li>
      </ul>
    </div>
  </platform-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import TwoFactorCard from '@/components/account/TwoFactorCard.vue'

const justEnabled = ref(false)

function onChanged(enabled: boolean) {
  justEnabled.value = enabled
}
</script>
