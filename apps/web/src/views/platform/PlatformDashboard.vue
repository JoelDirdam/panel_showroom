<template>
  <platform-layout>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Resumen y analítica</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Resumen SaaS de negocios, suscripciones y ventas en la plataforma. No incluye las cuentas marcadas como
          prueba.
        </p>
      </div>
    </div>

    <div v-if="error" class="mb-4 text-sm text-error-500">{{ error }}</div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Cargando...</div>

    <div v-else class="grid grid-cols-12 gap-4 md:gap-6">
      <!-- Métricas principales estilo SaaS -->
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">Ingresos totales</p>
          <h3 class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            ${{ formatMoney(stats?.salesTotalSum ?? 0) }}
          </h3>
          <p class="mt-1 text-xs text-gray-500">Suma de todas las ventas</p>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">Negocios activos</p>
          <h3 class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {{ stats?.tenants ?? 0 }}
          </h3>
          <p class="mt-1 text-xs text-success-600 dark:text-success-500">
            {{ stats?.activeSubscriptions ?? 0 }} con suscripción activa
          </p>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">Ventas (30 días)</p>
          <h3 class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {{ stats?.salesLast30Days ?? 0 }}
          </h3>
          <p class="mt-1 text-xs text-gray-500">
            ${{ formatMoney(stats?.salesLast30Sum ?? 0) }} en el periodo
          </p>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">Productos en plataforma</p>
          <h3 class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {{ stats?.products ?? 0 }}
          </h3>
          <p class="mt-1 text-xs text-gray-500">{{ stats?.brands ?? 0 }} marcas · {{ stats?.employees ?? 0 }} empleados</p>
        </div>
      </div>

      <!-- Tarjetas secundarias: churn / growth equivalentes -->
      <div class="col-span-12 sm:col-span-6 xl:col-span-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">En prueba</p>
          <p class="mt-1 text-xs text-gray-400">Cuentas en trial gratuito</p>
          <h3 class="mt-4 text-3xl font-bold text-gray-800 dark:text-white">
            {{ stats?.trialingTenants ?? 0 }}
          </h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Suscripciones activas</p>
          <p class="mt-1 text-xs text-gray-400">Planes de pago vigentes</p>
          <h3 class="mt-4 text-3xl font-bold text-gray-800 dark:text-white">
            {{ stats?.activeSubscriptions ?? 0 }}
          </h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Vencidas</p>
          <p class="mt-1 text-xs text-gray-400">Trial o plan expirado</p>
          <h3 class="mt-4 text-3xl font-bold text-error-500">
            {{ stats?.expiredSubscriptions ?? 0 }}
          </h3>
        </div>
      </div>

      <StripeRevenueCard />

      <!-- Analítica de la plataforma -->
      <template v-if="analytics">
        <div class="col-span-12 sm:col-span-6 xl:col-span-3">
          <div :class="cardCls">
            <p class="text-sm text-gray-500 dark:text-gray-400">Ingreso mensual a precio de lista</p>
            <p class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">${{ formatMoney(mrr) }}</p>
            <p class="mt-1 text-xs text-gray-500">Referencia: suscripciones activas × precio publicado. El real está arriba.</p>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 xl:col-span-3">
          <div :class="cardCls">
            <p class="text-sm text-gray-500 dark:text-gray-400">Altas (30 días)</p>
            <p class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{{ analytics.totals.tenantsLast30Days }}</p>
            <p class="mt-1 text-xs text-gray-500">{{ analytics.billing.paidLast30Days }} negocios pagaron en el periodo</p>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 xl:col-span-3">
          <div :class="cardCls">
            <p class="text-sm text-gray-500 dark:text-gray-400">Con tarjeta registrada</p>
            <p class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{{ analytics.billing.withCard }}</p>
            <p class="mt-1 text-xs" :class="analytics.billing.cancelScheduled ? 'text-error-500' : 'text-gray-500'">
              {{ analytics.billing.cancelScheduled }} con cancelación programada
            </p>
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6 xl:col-span-3">
          <div :class="cardCls">
            <p class="text-sm text-gray-500 dark:text-gray-400">Usuarios</p>
            <p class="mt-2 text-title-sm font-bold text-gray-800 dark:text-white/90">{{ analytics.users.total }}</p>
            <p class="mt-1 text-xs text-gray-500">
              {{ analytics.users.twoFactor }} con 2FA · {{ analytics.users.marketingOptIn }} aceptan marketing
            </p>
          </div>
        </div>

        <!-- Altas por mes -->
        <div class="col-span-12 xl:col-span-7">
          <div :class="cardCls">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Negocios nuevos por mes</h2>
            <p class="text-xs text-gray-500">Últimos 12 meses · en rojo, cuentas eliminadas</p>
            <div class="mt-5 flex h-44 items-end gap-1.5" aria-hidden="true">
              <div v-for="m in analytics.months" :key="m.month" class="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span class="text-[11px] font-medium text-gray-600 dark:text-gray-300">{{ m.signups || '' }}</span>
                <div class="flex w-full items-end justify-center gap-0.5" :style="{ height: '100%' }">
                  <div class="w-2/3 rounded-t bg-brand-500" :style="{ height: barHeight(m.signups) }"></div>
                  <div v-if="m.deletions" class="w-1/4 rounded-t bg-error-400" :style="{ height: barHeight(m.deletions) }"></div>
                </div>
                <span class="text-[10px] text-gray-500">{{ monthLabel(m.month) }}</span>
              </div>
            </div>
            <table class="sr-only">
              <caption>Negocios nuevos y cuentas eliminadas por mes</caption>
              <thead>
                <tr><th scope="col">Mes</th><th scope="col">Altas</th><th scope="col">Eliminadas</th></tr>
              </thead>
              <tbody>
                <tr v-for="m in analytics.months" :key="m.month">
                  <th scope="row">{{ m.month }}</th><td>{{ m.signups }}</td><td>{{ m.deletions }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Embudo -->
        <div class="col-span-12 xl:col-span-5">
          <div :class="cardCls">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Embudo de conversión</h2>
            <p class="text-xs text-gray-500">Cuentas de negocio que llegaron a cada paso</p>
            <ol class="mt-4 space-y-2.5">
              <li v-for="(f, i) in analytics.funnel" :key="f.step">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-700 dark:text-gray-300">{{ f.step }}</span>
                  <span class="font-semibold text-gray-800 dark:text-white">
                    {{ f.count }}
                    <span v-if="i > 0" class="font-normal text-gray-500">({{ percent(f.count) }})</span>
                  </span>
                </div>
                <div class="mt-1 h-2 rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
                  <div class="h-2 rounded-full bg-brand-500" :style="{ width: percent(f.count) }"></div>
                </div>
              </li>
            </ol>
          </div>
        </div>

        <!-- Planes y promociones -->
        <div class="col-span-12 xl:col-span-7">
          <div :class="cardCls">
            <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Suscripciones por plan</h2>
            <div class="mt-3 overflow-x-auto">
              <table class="min-w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-gray-100 dark:border-gray-800">
                    <th scope="col" class="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Plan</th>
                    <th scope="col" class="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">En prueba</th>
                    <th scope="col" class="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Activas</th>
                    <th scope="col" class="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Vencidas</th>
                    <th scope="col" class="py-2 pr-3 font-medium text-gray-500 dark:text-gray-400">Canceladas</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in planRows" :key="row.planType" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <th scope="row" class="py-2 pr-3 font-medium text-gray-800 dark:text-white">{{ row.name }}</th>
                    <td class="py-2 pr-3 text-gray-600 dark:text-gray-300">{{ row.TRIALING }}</td>
                    <td class="py-2 pr-3 text-gray-600 dark:text-gray-300">{{ row.ACTIVE }}</td>
                    <td class="py-2 pr-3 text-gray-600 dark:text-gray-300">{{ row.EXPIRED }}</td>
                    <td class="py-2 pr-3 text-gray-600 dark:text-gray-300">{{ row.CANCELED }}</td>
                  </tr>
                  <tr v-if="planRows.length === 0">
                    <td colspan="5" class="py-6 text-center text-gray-500">Sin suscripciones</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-span-12 xl:col-span-5">
          <div :class="cardCls">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Códigos de promoción usados</h2>
              <router-link to="/platform/promociones" class="text-sm text-brand-600 underline dark:text-brand-400">Administrar</router-link>
            </div>
            <ul v-if="analytics.promoUsage.length" class="mt-3 space-y-1.5 text-sm">
              <li v-for="p in analytics.promoUsage" :key="p.code" class="flex justify-between">
                <span class="font-mono text-gray-800 dark:text-white">{{ p.code }}</span>
                <span class="text-gray-600 dark:text-gray-300">{{ p.count }} negocios</span>
              </li>
            </ul>
            <p v-else class="mt-3 text-sm text-gray-500">Ningún negocio ha usado un código.</p>
            <p class="mt-4 border-t border-gray-100 pt-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
              {{ analytics.legal.termsAcceptances }} aceptaciones de términos registradas ·
              <router-link to="/platform/legal" class="underline" :class="analytics.legal.openCopyrightClaims ? 'font-semibold text-error-600 dark:text-error-400' : ''">
                {{ analytics.legal.openCopyrightClaims }} reclamos de derechos de autor abiertos
              </router-link>
            </p>
          </div>
        </div>
      </template>

      <!-- Tabla de negocios (equivalente a Recent Invoices) -->
      <div class="col-span-12">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
        >
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Negocios recientes</h3>
            <p class="text-xs text-gray-500">{{ tenants.length }} registrados</p>
          </div>
          <div class="max-w-full overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead>
                <tr class="border-t border-gray-100 dark:border-gray-800">
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Negocio</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Plan</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Estado</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Marcas</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Productos</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400">Ventas</th>
                  <th class="py-3 pr-3 font-medium text-gray-500 dark:text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="t in tenants"
                  :key="t.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-3 font-medium text-gray-800 dark:text-white">{{ t.name }}</td>
                  <td class="py-3 pr-3 text-gray-600 dark:text-gray-300">
                    {{ t.subscription?.planType || '—' }}
                  </td>
                  <td class="py-3 pr-3">
                    <span
                      v-if="!t.active"
                      class="inline-flex rounded-full bg-error-50 px-2.5 py-0.5 text-xs font-medium text-error-700 dark:bg-error-500/15 dark:text-error-400"
                    >
                      Suspendido
                    </span>
                    <span
                      v-else
                      class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="statusBadgeClass(t.subscription?.status)"
                    >
                      {{ statusLabel(t.subscription?.status) }}
                    </span>
                    <span v-if="t.isTest" class="ml-2 inline-flex rounded-full bg-warning-50 px-2.5 py-0.5 align-middle text-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">Prueba</span>
                  </td>
                  <td class="py-3 pr-3 text-gray-600 dark:text-gray-300">{{ t.counts.brands }}</td>
                  <td class="py-3 pr-3 text-gray-600 dark:text-gray-300">{{ t.counts.products }}</td>
                  <td class="py-3 pr-3 text-gray-600 dark:text-gray-300">{{ t.counts.sales }}</td>
                  <td class="py-3 pr-3">
                    <router-link
                      :to="`/platform/tenants/${t.id}`"
                      class="text-brand-500 hover:text-brand-600"
                    >
                      Ver
                    </router-link>
                  </td>
                </tr>
                <tr v-if="tenants.length === 0">
                  <td colspan="7" class="py-8 text-center text-gray-500">Sin negocios</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </platform-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import {
  extractApiError,
  fetchPlatformStats,
  fetchPlatformTenants,
  type PlatformStats,
  type PlatformTenantRow,
} from '@/services/api'
import { formatMoney } from '@/composables/useCajaSession'
import { fetchPlatformAnalytics, type PlatformAnalytics } from '@/services/compliance'
import StripeRevenueCard from '@/components/platform/StripeRevenueCard.vue'
import { planInfo } from '@/lib/plans'
import type { PlanType } from '@/lib/entitlements'

const cardCls = 'h-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6'
const analytics = ref<PlatformAnalytics | null>(null)

const maxMonthly = computed(() =>
  Math.max(1, ...(analytics.value?.months.flatMap((m) => [m.signups, m.deletions]) ?? [1])),
)
const barHeight = (value: number) => `${Math.round((value / maxMonthly.value) * 100)}%`
const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00Z`).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')

const funnelTop = computed(() => Math.max(1, analytics.value?.funnel[0]?.count ?? 1))
const percent = (count: number) => `${Math.min(100, Math.round((count / funnelTop.value) * 100))}%`

const planRows = computed(() => {
  const rows = new Map<string, { planType: string; name: string; TRIALING: number; ACTIVE: number; EXPIRED: number; CANCELED: number }>()
  for (const s of analytics.value?.subscriptions ?? []) {
    const row =
      rows.get(s.planType) ??
      { planType: s.planType, name: planInfo(s.planType as PlanType)?.name ?? s.planType, TRIALING: 0, ACTIVE: 0, EXPIRED: 0, CANCELED: 0 }
    if (s.status in row) (row as unknown as Record<string, number>)[s.status] = s.count
    rows.set(s.planType, row)
  }
  return [...rows.values()]
})

/** Estimado con precios de lista; el ingreso real está en Stripe. */
const mrr = computed(() =>
  (analytics.value?.subscriptions ?? [])
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + s.count * (planInfo(s.planType as PlanType)?.priceMxn ?? 0), 0),
)

const stats = ref<PlatformStats | null>(null)
const tenants = ref<PlatformTenantRow[]>([])
const loading = ref(true)
const error = ref('')

function statusLabel(status?: string | null) {
  if (!status) return 'Sin plan'
  const map: Record<string, string> = {
    TRIALING: 'Prueba',
    ACTIVE: 'Activo',
    EXPIRED: 'Vencido',
    CANCELED: 'Cancelado',
  }
  return map[status] || status
}

function statusBadgeClass(status?: string | null) {
  if (status === 'ACTIVE') {
    return 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
  }
  if (status === 'TRIALING') {
    return 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400'
  }
  if (status === 'EXPIRED' || status === 'CANCELED') {
    return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
  }
  return 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
}

onMounted(async () => {
  try {
    ;[stats.value, tenants.value] = await Promise.all([
      fetchPlatformStats(),
      fetchPlatformTenants(),
    ])
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar el panel')
  } finally {
    loading.value = false
  }
  // La analítica es complementaria: si falla, el resumen sigue visible.
  try {
    analytics.value = await fetchPlatformAnalytics()
  } catch {
    analytics.value = null
  }
})
</script>
