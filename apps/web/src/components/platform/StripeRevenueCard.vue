<template>
  <div class="col-span-12">
    <section
      class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
      aria-labelledby="revenue-title"
    >
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="revenue-title" class="text-lg font-semibold text-gray-800 dark:text-white/90">Ingresos reales (Stripe)</h2>
          <p class="text-xs text-gray-500">
            Cobros pagados menos reembolsos, en MXN con IVA incluido.
            <template v-if="data && data.configured">
              Modo <strong>{{ data.mode === 'live' ? 'real' : 'de prueba' }}</strong> · actualizado {{ formatDateTime(data.fetchedAt) }}
            </template>
          </p>
        </div>
        <button
          v-if="data && data.configured"
          type="button"
          class="ui-btn ui-btn-secondary ui-btn-sm"
          :disabled="loading"
          @click="load(true)"
        >
          {{ loading ? 'Consultando…' : 'Actualizar' }}
        </button>
      </div>

      <p v-if="loading && !data" class="mt-4 text-sm text-gray-500">Consultando Stripe…</p>
      <p v-if="error" role="alert" class="mt-4 text-sm text-error-500">{{ error }}</p>
      <p v-if="data && !data.configured" class="mt-4 text-sm text-gray-500">Stripe no está configurado en este entorno.</p>

      <template v-if="data && data.configured">
        <dl class="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">Ingreso recurrente mensual</dt>
            <dd class="mt-1 text-xl font-bold text-gray-800 dark:text-white">{{ formatMxn(data.mrr) }}</dd>
            <dd class="text-xs text-gray-500">{{ data.subscriptions.active }} suscripciones pagando</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">Cobrado este mes</dt>
            <dd class="mt-1 text-xl font-bold text-gray-800 dark:text-white">{{ formatMxn(data.totals.grossThisMonth) }}</dd>
            <dd class="text-xs text-gray-500">Esperado próximos 30 días: {{ formatMxn(data.expectedNext30Days) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">Neto 12 meses</dt>
            <dd class="mt-1 text-xl font-bold text-gray-800 dark:text-white">{{ formatMxn(data.totals.net12m) }}</dd>
            <dd class="text-xs text-gray-500">Reembolsado: {{ formatMxn(data.totals.refunds12m) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-gray-500 dark:text-gray-400">Suscripciones</dt>
            <dd class="mt-1 text-sm text-gray-700 dark:text-gray-300">
              {{ data.subscriptions.trialing }} en prueba con tarjeta<br />
              <span :class="data.subscriptions.pastDue ? 'font-semibold text-error-600 dark:text-error-400' : ''">{{ data.subscriptions.pastDue }} con pago fallido</span><br />
              {{ data.subscriptions.canceling }} cancelando · {{ data.subscriptions.paused }} pausadas
            </dd>
          </div>
        </dl>

        <div class="mt-6 flex h-36 items-end gap-1.5" aria-hidden="true">
          <div v-for="m in data.months" :key="m.month" class="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div class="w-3/4 rounded-t bg-success-500" :style="{ height: bar(m.net) }"></div>
            <span class="text-[10px] text-gray-500">{{ monthLabel(m.month) }}</span>
          </div>
        </div>
        <table class="sr-only">
          <caption>Ingresos netos por mes</caption>
          <thead><tr><th scope="col">Mes</th><th scope="col">Cobrado</th><th scope="col">Reembolsado</th><th scope="col">Neto</th></tr></thead>
          <tbody>
            <tr v-for="m in data.months" :key="m.month">
              <th scope="row">{{ m.month }}</th><td>{{ formatMxn(m.gross) }}</td><td>{{ formatMxn(m.refunds) }}</td><td>{{ formatMxn(m.net) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3 text-xs text-gray-500">
          Último pago recibido: {{ data.lastPaymentAt ? formatDateTime(data.lastPaymentAt) : 'ninguno' }}.
          Las comisiones de Stripe no están descontadas.
          <span v-if="data.ignoredOtherCurrency"> {{ data.ignoredOtherCurrency }} movimientos en otra moneda no se sumaron.</span>
          <span v-if="data.truncated"> Hay más movimientos de los que se leyeron: las cifras pueden estar incompletas.</span>
        </p>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { extractApiError } from '@/services/api'
import { fetchStripeRevenue, formatDateTime, formatMxn, type StripeRevenue } from '@/services/compliance'

const data = ref<StripeRevenue | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const maxNet = computed(() =>
  data.value && data.value.configured ? Math.max(1, ...data.value.months.map((m) => m.net)) : 1,
)
const bar = (value: number) => `${Math.max(value > 0 ? 3 : 0, Math.round((Math.max(0, value) / maxNet.value) * 100))}%`
const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')

async function load(refresh = false) {
  loading.value = true
  error.value = null
  try {
    data.value = await fetchStripeRevenue(refresh)
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo consultar Stripe')
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>
