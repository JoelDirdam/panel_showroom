<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
          <CreditCard class="h-6 w-6 text-brand-500" />
        </div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Pago del plan</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          La integración con Stripe y Mercado Pago estará disponible pronto. Por ahora puedes
          activar tu prueba gratuita y configurar tu negocio.
        </p>

        <div class="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-white/[0.03]">
          <p class="font-medium text-gray-800 dark:text-white">{{ plan?.name ?? 'Plan' }}</p>
          <p class="mt-1 text-gray-500 dark:text-gray-400">
            Prueba gratis hasta el {{ trialEndsLabel }}
            <span v-if="promoCodeUsed"> (código {{ promoCodeUsed }})</span>
          </p>
        </div>

        <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>

        <button
          type="button"
          class="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
          :disabled="loading"
          @click="continueTrial"
        >
          {{ loading ? 'Activando…' : 'Activar prueba gratis' }}
        </button>
        <button
          type="button"
          class="mt-3 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          @click="router.push('/onboarding/confirm-plan')"
        >
          Volver
        </button>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CreditCard } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { planInfo } from '@/lib/plans'
import { skipPayment, extractApiError } from '@/services/api'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const error = ref<string | null>(null)

const planType = computed(() => auth.user?.subscription?.planType)
const plan = computed(() => planInfo(planType.value))
const promoCodeUsed = computed(() => auth.user?.subscription?.promoCodeUsed)

const trialEndsLabel = computed(() => {
  const iso = auth.user?.subscription?.trialEndsAt
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
})

async function continueTrial() {
  error.value = null
  loading.value = true
  try {
    const { user } = await skipPayment()
    auth.user = user
    router.push('/onboarding/create-business')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo activar la prueba')
  } finally {
    loading.value = false
  }
}
</script>
