<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-6 dark:bg-gray-900">
    <div class="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm sm:p-8 dark:bg-gray-800">
      <template v-if="reactivated">
        <div class="mb-3 text-4xl">✅</div>
        <h1 class="text-xl font-bold text-gray-800 dark:text-white">Tu cuenta está activa</h1>
        <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">Recibimos tu pago. Ya puedes entrar a tu panel.</p>
        <button
          class="ui-btn ui-btn-primary mt-6 block w-full"
          @click="goHome"
        >
          Ir a mi panel
        </button>
      </template>
      <template v-else>
        <div class="mb-3 text-4xl">⏸️</div>
        <h1 class="text-xl font-bold text-gray-800 dark:text-white">Tu cuenta está pausada</h1>
        <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
          Tu prueba o suscripción venció. Tus clientes <strong>siguen pudiendo agendar</strong> en tu link y
          ninguna cita se pierde: las verás completas en cuanto reactives tu plan.
        </p>

        <div v-if="price" class="mt-5 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-white/[0.04]">
          <div class="flex items-start justify-between gap-3">
            <span class="font-medium text-gray-800 dark:text-white">Plan {{ plan?.name }}</span>
            <span class="shrink-0 text-right font-semibold text-gray-800 dark:text-white">
              {{ formatMxn(price) }}
              <span class="block text-xs font-normal text-gray-500 dark:text-gray-400">al mes, IVA incluido</span>
            </span>
          </div>
        </div>

        <p v-if="checking" class="mt-4 text-sm text-gray-500 dark:text-gray-400">Confirmando tu pago…</p>
        <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>

        <button
          v-if="canPay"
          class="ui-btn ui-btn-primary mt-6 block w-full"
          :disabled="busy || checking"
          @click="pay"
        >
          {{ busy ? 'Abriendo pago seguro…' : 'Pagar y reactivar mi cuenta' }}
        </button>
        <a
          v-if="supportLink"
          :href="supportLink"
          target="_blank"
          rel="noopener"
          :class="[
            'mt-3 block rounded-lg px-4 py-3 text-sm font-medium',
            canPay
              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-white/5'
              : 'mt-6 bg-brand-500 text-white hover:bg-brand-600',
          ]"
        >
          {{ canPay ? 'Hablar con soporte por WhatsApp' : 'Reactivar mi cuenta' }}
        </a>
        <p v-else-if="!canPay" class="mt-6 text-sm text-gray-500">Contacta a soporte de COSDI para reactivar tu cuenta.</p>
        <p class="mt-5 text-xs text-gray-500 dark:text-gray-400">
          Tus datos siguen guardados. Puedes
          <router-link to="/cuenta" class="text-brand-500 underline">descargarlos o eliminar tu cuenta</router-link>
          cuando quieras.
        </p>
        <button type="button" class="mt-4 text-sm text-gray-500 underline" @click="logout">Cerrar sesión</button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/services/api'
import { planInfo, shownPrice } from '@/lib/plans'
import { fetchBillingStatus, formatMxn, startCheckout } from '@/services/billing'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const busy = ref(false)
const checking = ref(false)
const reactivated = ref(false)
const stripeConfigured = ref(false)
const error = ref<string | null>(null)

const plan = computed(() => planInfo(auth.user?.subscription?.planType))
const price = computed(() => shownPrice(plan.value, stripeConfigured.value))
const canPay = computed(() => stripeConfigured.value && Boolean(price.value))

const supportLink = computed(() => {
  const raw = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined
  const digits = raw?.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}?text=${encodeURIComponent('Hola, quiero reactivar mi cuenta de COSDI.')}`
})

onMounted(async () => {
  const paid = route.query.checkout === 'success'
  if (paid) checking.value = true
  try {
    let status = await fetchBillingStatus()
    stripeConfigured.value = status.stripeConfigured
    // El webhook de Stripe puede tardar unos segundos en reactivar la cuenta.
    for (let i = 0; paid && i < 8 && status.subscription?.status !== 'ACTIVE'; i += 1) {
      await new Promise((r) => setTimeout(r, 1500))
      status = await fetchBillingStatus()
    }
    if (status.subscription?.status === 'ACTIVE' || status.subscription?.status === 'TRIALING') {
      await auth.fetchMe()
      reactivated.value = true
    } else if (paid) {
      error.value = 'Aún no vemos tu pago. Espera un minuto y recarga la página; si ya se cobró, escríbenos.'
    }
  } catch {
    // Sin estado de cobro: queda el contacto por WhatsApp.
  } finally {
    checking.value = false
    if (route.query.checkout) void router.replace({ path: route.path })
  }
})

async function pay() {
  error.value = null
  busy.value = true
  try {
    window.location.href = await startCheckout('/suscripcion-vencida')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo abrir el pago. Intenta de nuevo.')
    busy.value = false
  }
}

function goHome() {
  void router.push('/home')
}

function logout() {
  auth.logout?.()
  void router.push('/login')
}
</script>
