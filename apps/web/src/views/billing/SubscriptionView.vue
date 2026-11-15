<template>
  <admin-layout>
    <page-breadcrumb page-title="Mi suscripción" />

    <div
      v-if="notice"
      :class="[
        'mb-4 rounded-xl border p-4 text-sm',
        notice.kind === 'ok'
          ? 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
          : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300',
      ]"
    >
      {{ notice.text }}
    </div>

    <component-card title="Tu plan">
      <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
      <template v-else-if="sub">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-lg font-semibold text-gray-800 dark:text-white">Plan {{ plan?.name ?? sub.planType }}</p>
            <p v-if="plan?.priceMxn" class="text-sm text-gray-500 dark:text-gray-400">
              {{ formatMxn(plan.priceMxn) }} al mes, IVA incluido
            </p>
          </div>
          <span :class="['shrink-0 rounded-full px-3 py-1 text-xs font-medium', badge.cls]">{{ badge.label }}</span>
        </div>

        <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <dt class="text-gray-500 dark:text-gray-400">{{ dateLabel }}</dt>
            <dd class="mt-0.5 font-medium text-gray-800 dark:text-white">{{ dateValue }}</dd>
          </div>
          <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
            <dt class="text-gray-500 dark:text-gray-400">Forma de pago</dt>
            <dd class="mt-0.5 font-medium text-gray-800 dark:text-white">
              {{ sub.hasPaymentMethod ? 'Tarjeta registrada' : 'Sin tarjeta registrada' }}
            </dd>
          </div>
        </dl>

        <p class="mt-4 text-sm text-gray-600 dark:text-gray-300">{{ explanation }}</p>
        <p v-if="error" class="mt-3 text-sm text-error-500">{{ error }}</p>

        <div class="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            v-if="showPay"
            type="button"
            class="rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="busy"
            @click="pay"
          >
            {{ busy ? 'Abriendo…' : payLabel }}
          </button>
          <button
            v-if="sub.hasPaymentMethod"
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            :disabled="busy"
            @click="portal"
          >
            Cambiar tarjeta, ver recibos o cancelar
          </button>
        </div>
        <p v-if="showPay && !stripeConfigured" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          El pago con tarjeta aún no está disponible. Escríbenos por WhatsApp para activar tu plan.
        </p>
      </template>
      <p v-else class="text-sm text-gray-500">Tu cuenta no tiene un plan asignado.</p>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { extractApiError } from '@/services/api'
import { planInfo } from '@/lib/plans'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBillingStatus,
  formatDate,
  formatMxn,
  openBillingPortal,
  startCheckout,
  type BillingStatus,
} from '@/services/billing'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const status = ref<BillingStatus | null>(null)
const notice = ref<{ kind: 'ok' | 'info'; text: string } | null>(null)

const sub = computed(() => status.value?.subscription ?? null)
const stripeConfigured = computed(() => Boolean(status.value?.stripeConfigured))
const plan = computed(() => planInfo(sub.value?.planType))

const badge = computed(() => {
  const s = sub.value?.status
  if (s === 'ACTIVE') return { label: 'Activa', cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' }
  if (s === 'TRIALING') return { label: 'Prueba gratis', cls: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400' }
  if (s === 'CANCELED') return { label: 'Cancelada', cls: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' }
  return { label: 'Pausada', cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' }
})

const dateLabel = computed(() => {
  const s = sub.value
  if (!s) return ''
  if (s.status === 'TRIALING') return s.hasPaymentMethod ? 'Primer cobro' : 'Tu prueba termina'
  if (s.status === 'ACTIVE') return s.cancelAtPeriodEnd ? 'Activa hasta' : 'Próximo cobro'
  return 'Venció'
})

const dateValue = computed(() => {
  const s = sub.value
  if (!s) return '—'
  if (s.status === 'TRIALING') return formatDate(s.trialEndsAt)
  return formatDate(s.currentPeriodEndsAt ?? s.trialEndsAt)
})

const explanation = computed(() => {
  const s = sub.value
  if (!s) return ''
  if (s.status === 'TRIALING' && s.hasPaymentMethod)
    return 'Tu tarjeta ya está registrada. El primer cobro se hace al terminar la prueba y tu cuenta sigue sin interrupciones.'
  if (s.status === 'TRIALING')
    return 'Agrega una tarjeta para que tu cuenta no se pause al terminar la prueba. No se cobra nada antes de esa fecha.'
  if (s.status === 'ACTIVE' && s.cancelAtPeriodEnd)
    return 'Cancelaste la renovación. Puedes seguir usando tu cuenta hasta la fecha indicada.'
  if (s.status === 'ACTIVE') return 'Tu plan se renueva cada mes de forma automática.'
  return 'Tu cuenta está pausada. Tus clientes siguen pudiendo agendar en tu link y no se pierde ninguna cita. Al pagar se reactiva de inmediato.'
})

const showPay = computed(() => {
  const s = sub.value
  if (!s || !plan.value?.priceMxn) return false
  if (s.status === 'EXPIRED' || s.status === 'CANCELED') return true
  return !s.hasPaymentMethod
})

const payLabel = computed(() =>
  sub.value?.status === 'TRIALING' ? 'Agregar tarjeta' : 'Pagar y reactivar mi cuenta',
)

async function load() {
  status.value = await fetchBillingStatus()
}

onMounted(async () => {
  const result = route.query.checkout
  try {
    await load()
    if (result === 'success') {
      // El webhook de Stripe puede tardar unos segundos en confirmar el pago.
      for (let i = 0; i < 6 && !sub.value?.hasPaymentMethod; i += 1) {
        await new Promise((r) => setTimeout(r, 1500))
        await load()
      }
      notice.value = sub.value?.hasPaymentMethod
        ? { kind: 'ok', text: '¡Listo! Tu forma de pago quedó registrada.' }
        : { kind: 'info', text: 'Estamos confirmando tu pago. Recarga esta página en un minuto.' }
      await auth.fetchMe()
    } else if (result === 'cancelled') {
      notice.value = { kind: 'info', text: 'No se completó el pago. Puedes intentarlo cuando quieras.' }
    }
    if (result) void router.replace({ path: route.path })
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar tu suscripción')
  } finally {
    loading.value = false
  }
})

async function pay() {
  error.value = null
  busy.value = true
  try {
    window.location.href = await startCheckout('/suscripcion')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo abrir el pago. Intenta de nuevo.')
    busy.value = false
  }
}

async function portal() {
  error.value = null
  busy.value = true
  try {
    window.location.href = await openBillingPortal('/suscripcion')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo abrir el portal de pagos.')
    busy.value = false
  }
}
</script>
