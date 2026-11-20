<template>
  <admin-layout>
    <PageHeader title="Mi suscripción" description="Tu plan, tu forma de pago y cuándo se hace el siguiente cobro." />

    <div
      v-if="notice"
      :class="[
        'mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm',
        notice.kind === 'ok'
          ? 'border-success-200 bg-success-50 text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
          : 'border-gray-200 bg-white text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300',
      ]"
      role="status"
    >
      <CheckCircle2 v-if="notice.kind === 'ok'" class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <Info v-else class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      {{ notice.text }}
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
      <section class="ui-card overflow-hidden" aria-labelledby="plan-title">
        <div v-if="loading" class="space-y-3 p-6" aria-busy="true">
          <div class="h-8 w-48 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
          <div class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        </div>

        <template v-else-if="sub">
          <!-- Encabezado del plan -->
          <div class="border-b border-gray-100 bg-brand-50/60 px-5 py-6 dark:border-gray-800 dark:bg-brand-500/10 sm:px-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium text-brand-600 dark:text-brand-300">Tu plan</p>
                <h2 id="plan-title" class="mt-0.5 text-2xl font-semibold text-gray-900 dark:text-white">
                  Plan {{ plan?.name ?? sub.planType }}
                </h2>
                <p v-if="price" class="mt-1 text-[15px] text-gray-600 dark:text-gray-300">
                  <span class="font-display text-xl font-semibold text-gray-900 dark:text-white">{{ formatMxn(price) }}</span>
                  al mes, IVA incluido
                </p>
              </div>
              <Badge :color="badge.color">{{ badge.label }}</Badge>
            </div>
          </div>

          <div class="p-5 sm:p-6">
            <dl class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <dt class="flex items-center gap-2 text-[13px] text-gray-500">
                  <CalendarClock class="h-4 w-4" aria-hidden="true" />
                  {{ dateLabel }}
                </dt>
                <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ dateValue }}</dd>
              </div>
              <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <dt class="flex items-center gap-2 text-[13px] text-gray-500">
                  <CreditCard class="h-4 w-4" aria-hidden="true" />
                  Forma de pago
                </dt>
                <dd class="mt-1 font-semibold text-gray-900 dark:text-white">
                  {{ sub.hasPaymentMethod ? 'Tarjeta registrada' : 'Sin tarjeta registrada' }}
                </dd>
              </div>
            </dl>

            <p class="mt-5 text-[15px] text-gray-700 dark:text-gray-300">{{ explanation }}</p>
            <p
              v-if="status?.discountLabel"
              class="mt-3 flex items-start gap-2 rounded-xl border border-success-200 bg-success-50 p-3 text-sm text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
            >
              <BadgePercent class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{{ status.discountLabel }}. Se aplica al registrar tu tarjeta.</span>
            </p>

            <!-- Aviso de renovación automática: visible antes de pagar y mientras el plan esté activo. -->
            <p
              v-if="renewalNotice"
              class="mt-3 rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-white/[0.03] dark:text-gray-300"
            >
              <strong class="text-gray-900 dark:text-white">Renovación automática.</strong>
              {{ renewalNotice }}
              <router-link to="/reembolsos" class="font-medium text-brand-600 underline">Política de reembolsos</router-link>.
            </p>

            <p v-if="error" role="alert" class="ui-error mt-3">{{ error }}</p>

            <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <UiButton v-if="showPay" :loading="busy" loading-text="Abriendo…" @click="pay">
                <template #icon><CreditCard class="h-4 w-4" aria-hidden="true" /></template>
                {{ payLabel }}
              </UiButton>
              <UiButton v-if="sub.hasPaymentMethod" variant="secondary" :disabled="busy" @click="portal">
                Cambiar tarjeta o ver recibos
              </UiButton>
              <UiButton v-if="canResume" :disabled="busy" @click="resume">Reanudar mi suscripción</UiButton>
              <!-- Cancelar: mismo lugar y mismo esfuerzo que suscribirse (un botón + confirmar). -->
              <UiButton v-if="canCancel && !confirmingCancel" variant="danger" :disabled="busy" @click="confirmingCancel = true">
                Cancelar suscripción
              </UiButton>
            </div>

            <div
              v-if="confirmingCancel"
              role="alertdialog"
              aria-labelledby="cancel-title"
              aria-describedby="cancel-text"
              class="mt-4 rounded-xl border border-error-200 bg-error-50/50 p-4 dark:border-error-500/30 dark:bg-error-500/5"
            >
              <p id="cancel-title" class="text-[15px] font-semibold text-gray-900 dark:text-white">
                ¿Cancelar la renovación de tu plan?
              </p>
              <p id="cancel-text" class="mt-1 text-sm text-gray-700 dark:text-gray-300">
                No se te volverá a cobrar. Conservas el acceso hasta el <strong>{{ dateValue }}</strong> y puedes reanudar
                antes de esa fecha. Tus datos no se borran.
              </p>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                <UiButton variant="destructive" :loading="busy" loading-text="Cancelando…" @click="cancel">Sí, cancelar</UiButton>
                <UiButton variant="secondary" :disabled="busy" @click="confirmingCancel = false">No, conservar mi plan</UiButton>
              </div>
            </div>

            <p v-if="sub.status === 'TRIALING' && !sub.hasPaymentMethod" class="ui-help mt-4">
              Estás en prueba sin tarjeta: no hay nada que cancelar y no se te cobrará nada. Si no agregas una tarjeta, la
              cuenta simplemente se pausa al terminar la prueba.
            </p>
            <p v-if="showPay && !stripeConfigured" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
              El pago con tarjeta aún no está disponible. Escríbenos por WhatsApp para activar tu plan.
            </p>
          </div>
        </template>

        <div v-else class="p-6">
          <UiEmptyState
            :title="error ? 'No se pudo cargar tu suscripción' : 'Tu cuenta no tiene un plan asignado'"
            :description="error ?? 'Escríbenos por WhatsApp y te ayudamos a activarlo.'"
          >
            <template #icon><CreditCard class="h-5 w-5" /></template>
          </UiEmptyState>
        </div>
      </section>

      <referral-card v-if="sub" />
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { BadgePercent, CalendarClock, CheckCircle2, CreditCard, Info } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import Badge from '@/components/ui/Badge.vue'
import ReferralCard from '@/components/billing/ReferralCard.vue'
import { extractApiError } from '@/services/api'
import { planInfo, shownPrice } from '@/lib/plans'
import { useAuthStore } from '@/stores/auth'
import {
  fetchBillingStatus,
  formatDate,
  formatMxn,
  openBillingPortal,
  startCheckout,
  type BillingStatus,
} from '@/services/billing'
import { cancelSubscription, resumeSubscription } from '@/services/compliance'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const status = ref<BillingStatus | null>(null)
const notice = ref<{ kind: 'ok' | 'info'; text: string } | null>(null)
const confirmingCancel = ref(false)

const sub = computed(() => status.value?.subscription ?? null)
const stripeConfigured = computed(() => Boolean(status.value?.stripeConfigured))
const plan = computed(() => planInfo(sub.value?.planType))
const price = computed(() => shownPrice(plan.value, stripeConfigured.value))

const badge = computed(() => {
  const s = sub.value?.status
  if (s === 'ACTIVE') return { label: 'Activa', color: 'success' as const }
  if (s === 'TRIALING') return { label: 'Prueba gratis', color: 'primary' as const }
  if (s === 'CANCELED') return { label: 'Cancelada', color: 'error' as const }
  return { label: 'Pausada', color: 'warning' as const }
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
  if (!s || !price.value) return false
  if (s.status === 'EXPIRED' || s.status === 'CANCELED') return true
  return !s.hasPaymentMethod
})

const isLive = computed(() => sub.value?.status === 'ACTIVE' || sub.value?.status === 'TRIALING')
/** Hay cobro recurrente vigente que se puede cancelar. */
const canCancel = computed(
  () => Boolean(sub.value?.hasPaymentMethod) && isLive.value && !sub.value?.cancelAtPeriodEnd,
)
const canResume = computed(
  () => Boolean(sub.value?.hasPaymentMethod) && isLive.value && Boolean(sub.value?.cancelAtPeriodEnd),
)

const renewalNotice = computed(() => {
  const s = sub.value
  if (!s || s.cancelAtPeriodEnd) return ''
  const amount = price.value ? `${formatMxn(price.value)} (IVA incluido)` : 'el precio de tu plan'
  if (s.hasPaymentMethod && s.status === 'TRIALING')
    return `El ${formatDate(s.trialEndsAt)} se hará el primer cobro de ${amount} y después el plan se renueva solo cada mes, hasta que canceles. Te avisamos por correo antes de cada cobro y puedes cancelar aquí mismo cuando quieras.`
  if (s.hasPaymentMethod && s.status === 'ACTIVE')
    return `Tu plan se renueva solo cada mes por ${amount}; el próximo cobro es el ${formatDate(s.currentPeriodEndsAt)}. Te avisamos por correo antes de cada cobro y puedes cancelar aquí mismo cuando quieras.`
  if (showPay.value)
    return `Al registrar tu tarjeta, el plan se cobra cada mes de forma automática (${amount}) hasta que canceles. Te avisamos por correo antes de cada cobro y puedes cancelar aquí mismo, en dos clics.`
  return ''
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

async function cancel() {
  error.value = null
  busy.value = true
  try {
    await cancelSubscription()
    await load()
    await auth.fetchMe()
    confirmingCancel.value = false
    notice.value = {
      kind: 'ok',
      text: 'Listo: cancelaste la renovación. No se te volverá a cobrar y te enviamos la confirmación por correo.',
    }
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cancelar. Intenta de nuevo o escríbenos.')
  } finally {
    busy.value = false
  }
}

async function resume() {
  error.value = null
  busy.value = true
  try {
    await resumeSubscription()
    await load()
    await auth.fetchMe()
    notice.value = { kind: 'ok', text: 'Tu suscripción quedó reanudada.' }
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo reanudar la suscripción.')
  } finally {
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
