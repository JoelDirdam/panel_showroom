<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-4 sm:p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
          <CreditCard class="h-6 w-6 text-brand-500" />
        </div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Activa tu plan</h1>
        <p v-if="hasTrial" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Tu prueba gratis termina el <strong class="text-gray-700 dark:text-gray-200">{{ trialEndsLabel }}</strong
          ><span v-if="promoCodeUsed"> (código {{ promoCodeUsed }})</span>. No se cobra nada antes de esa fecha.
        </p>
        <p v-else class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Agrega tu tarjeta para activar tu plan<span v-if="promoCodeUsed"> (código {{ promoCodeUsed }})</span>.
          ¿Tienes un código de prueba gratis?
          <router-link to="/onboarding/select-plan" class="text-brand-500 underline">Escríbelo aquí</router-link>.
        </p>

        <div class="mt-6 rounded-xl bg-gray-50 p-4 text-left text-sm dark:bg-white/[0.03]">
          <div class="flex items-start justify-between gap-3">
            <p class="font-medium text-gray-800 dark:text-white">Plan {{ plan?.name ?? 'seleccionado' }}</p>
            <p v-if="price" class="shrink-0 text-right font-semibold text-gray-800 dark:text-white">
              {{ formatMxn(price) }}
              <span class="block text-xs font-normal text-gray-500 dark:text-gray-400">al mes, IVA incluido</span>
            </p>
          </div>
          <p v-if="discountLabel" class="mt-2 text-xs font-medium text-success-600 dark:text-success-400">
            {{ discountLabel }}. Se aplica al agregar tu tarjeta.
          </p>
        </div>

        <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>

        <template v-if="canPay">
          <button
            type="button"
            class="mt-6 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50"
            :disabled="busy !== null"
            @click="pay"
          >
            {{ busy === 'pay' ? 'Abriendo pago seguro…' : hasTrial ? 'Agregar tarjeta' : 'Pagar y activar mi plan' }}
          </button>
          <p class="mt-2 text-left text-xs leading-relaxed text-gray-600 dark:text-gray-300">
            <strong>Renovación automática:</strong> al agregar tu tarjeta, el primer cobro<span v-if="price">
              de {{ formatMxn(price) }}</span
            >
            se hace {{ hasTrial ? `el ${trialEndsLabel}` : 'hoy' }} y después el plan se renueva solo cada mes hasta que canceles. Te avisamos
            por correo antes de cada cobro y puedes cancelar en línea, en dos clics, desde “Mi suscripción”.
            <router-link to="/reembolsos" target="_blank" class="text-brand-500 underline">Política de reembolsos</router-link>.
            Pago seguro con Stripe.
          </p>
          <button
            v-if="hasTrial"
            type="button"
            class="mt-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            :disabled="busy !== null"
            @click="continueTrial"
          >
            {{ busy === 'trial' ? 'Activando…' : 'Probar gratis sin tarjeta' }}
          </button>
        </template>
        <template v-else>
          <p v-if="!loadingStatus && hasTrial" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
            El pago con tarjeta para este plan estará disponible pronto. Por ahora puedes empezar tu prueba gratis.
          </p>
          <p v-else-if="!loadingStatus" class="mt-4 text-sm text-gray-500 dark:text-gray-400">
            El pago con tarjeta para este plan aún no está disponible.
            <a :href="BUSINESS.whatsappLink" target="_blank" rel="noopener" class="text-brand-500 underline">Escríbenos por WhatsApp</a>
            para activarlo o pídenos un código de prueba.
          </p>
          <button
            v-if="hasTrial"
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
import { planInfo, shownPrice } from '@/lib/plans'
import { skipPayment, extractApiError } from '@/services/api'
import { fetchBillingStatus, formatDate, formatMxn, startCheckout } from '@/services/billing'
import { BUSINESS } from '@/lib/business'

const router = useRouter()
const auth = useAuthStore()
const busy = ref<'pay' | 'trial' | null>(null)
const error = ref<string | null>(null)
const loadingStatus = ref(true)
const stripeConfigured = ref(false)
const discountLabel = ref<string | null>(null)

const planType = computed(() => auth.user?.subscription?.planType)
const plan = computed(() => planInfo(planType.value))
const promoCodeUsed = computed(() => auth.user?.subscription?.promoCodeUsed)
/** La prueba gratis solo existe si se usó un código de prueba. */
const hasTrial = computed(() => {
  const iso = auth.user?.subscription?.trialEndsAt
  return Boolean(iso && new Date(iso).getTime() > Date.now())
})
const trialEndsLabel = computed(() => formatDate(auth.user?.subscription?.trialEndsAt))
const price = computed(() => shownPrice(plan.value, stripeConfigured.value))
const canPay = computed(() => stripeConfigured.value && Boolean(price.value))

onMounted(async () => {
  try {
    const status = await fetchBillingStatus()
    stripeConfigured.value = status.stripeConfigured
    discountLabel.value = status.discountLabel ?? null
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
    // Con prueba: queda activa aunque el cliente abandone el pago a medias.
    if (hasTrial.value) {
      const { user } = await skipPayment()
      auth.user = user
    }
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
