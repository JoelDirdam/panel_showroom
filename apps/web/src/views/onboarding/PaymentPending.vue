<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
          <CreditCard class="h-6 w-6 text-brand-500" />
        </div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Activa tu plan</h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Tu prueba gratis termina el <strong class="text-gray-700 dark:text-gray-200">{{ trialEndsLabel }}</strong
          ><span v-if="promoCodeUsed"> (código {{ promoCodeUsed }})</span>. No se cobra nada antes de esa fecha.
        </p>

        <div class="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-white/[0.03]">
          <div class="flex items-start justify-between gap-3">
            <p class="font-medium text-gray-800 dark:text-white">Plan {{ plan?.name ?? 'seleccionado' }}</p>
            <p v-if="plan?.priceMxn" class="shrink-0 text-right font-semibold text-gray-800 dark:text-white">
              {{ formatMxn(plan.priceMxn) }}
              <span class="block text-xs font-normal text-gray-500 dark:text-gray-400">al mes, IVA incluido</span>
            </p>
          </div>
        </div>

        <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>

        <template v-if="canPay">
          <button
            type="button"
            class="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
            :disabled="busy !== null"
            @click="pay"
          >
            {{ busy === 'pay' ? 'Abriendo pago seguro…' : 'Agregar tarjeta' }}
          </button>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Pago seguro con Stripe. El primer cobro se hace al terminar la prueba y puedes cancelar cuando quieras.
          </p>
          <button
            type="button"
            class="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            :disabled="busy !== null"
            @click="continueTrial"
          >
            {{ busy === 'trial' ? 'Activando…' : 'Probar gratis sin tarjeta' }}
          </button>
        </template>
        <template v-else>
          <p v-if="!loadingStatus" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
            El pago con tarjeta para este plan estará disponible pronto. Por ahora puedes empezar tu prueba gratis.
          </p>
          <button
            type="button"
            class="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
            :disabled="busy !== null || loadingStatus"
            @click="continueTrial"
          >
            {{ busy === 'trial' ? 'Activando…' : 'Activar prueba gratis' }}
          </button>
        </template>

        <button
          type="button"
          class="mt-4 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          @click="router.push('/onboarding/confirm-plan')"
        >
          Volver
        </button>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CreditCard } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { planInfo } from '@/lib/plans'
import { skipPayment, extractApiError } from '@/services/api'
import { fetchBillingStatus, formatDate, formatMxn, startCheckout } from '@/services/billing'

const router = useRouter()
const auth = useAuthStore()
const busy = ref<'pay' | 'trial' | null>(null)
const error = ref<string | null>(null)
const loadingStatus = ref(true)
const stripeConfigured = ref(false)

const planType = computed(() => auth.user?.subscription?.planType)
const plan = computed(() => planInfo(planType.value))
const promoCodeUsed = computed(() => auth.user?.subscription?.promoCodeUsed)
const trialEndsLabel = computed(() => formatDate(auth.user?.subscription?.trialEndsAt))
const canPay = computed(() => stripeConfigured.value && Boolean(plan.value?.priceMxn))

onMounted(async () => {
  try {
    const status = await fetchBillingStatus()
    stripeConfigured.value = status.stripeConfigured
  } catch {
    stripeConfigured.value = false
  } finally {
    loadingStatus.value = false
  }
})

async function pay() {
  error.value = null
  busy.value = 'pay'
  try {
    // La prueba queda activa aunque el cliente abandone el pago a medias.
    const { user } = await skipPayment()
    auth.user = user
    window.location.href = await startCheckout('/onboarding/create-business')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo abrir el pago. Intenta de nuevo.')
    busy.value = null
  }
}

async function continueTrial() {
  error.value = null
  busy.value = 'trial'
  try {
    const { user } = await skipPayment()
    auth.user = user
    router.push('/onboarding/create-business')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo activar la prueba')
  } finally {
    busy.value = null
  }
}
</script>
