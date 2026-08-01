<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
          <PartyPopper class="h-6 w-6 text-brand-500" />
        </div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">
          Tu plan es de tipo {{ plan?.name ?? planType }}
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ plan?.description }}
        </p>

        <div class="mt-6 space-y-2 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-white/[0.03]">
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Estado</span>
            <span class="font-medium text-gray-800 dark:text-white">Prueba gratuita</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Vence</span>
            <span class="font-medium text-gray-800 dark:text-white">{{ trialEndsLabel }}</span>
          </div>
          <div v-if="promoCodeUsed" class="flex justify-between">
            <span class="text-gray-500 dark:text-gray-400">Código aplicado</span>
            <span class="font-medium text-brand-600 dark:text-brand-400">{{ promoCodeUsed }}</span>
          </div>
        </div>

        <button
          type="button"
          class="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          @click="router.push('/onboarding/create-business')"
        >
          Crear negocio
        </button>
        <button
          type="button"
          class="mt-3 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          @click="router.push('/onboarding/select-plan')"
        >
          Cambiar de plan
        </button>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { PartyPopper } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { planInfo } from '@/lib/plans'

const router = useRouter()
const auth = useAuthStore()

const planType = computed(() => auth.user?.subscription?.planType)
const plan = computed(() => planInfo(planType.value))
const promoCodeUsed = computed(() => auth.user?.subscription?.promoCodeUsed)

const trialEndsLabel = computed(() => {
  const iso = auth.user?.subscription?.trialEndsAt
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
})
</script>
