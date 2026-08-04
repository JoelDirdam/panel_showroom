<template>
  <admin-layout>
    <page-breadcrumb page-title="Dashboard" />

    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 dark:text-white">Overview</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Ingresos, ventas, inventario y actividad reciente del showroom.
        </p>
      </div>
      <button
        type="button"
        class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        :disabled="loading"
        @click="load"
      >
        Actualizar
      </button>
    </div>

    <div v-if="loading && !data" class="text-gray-500 dark:text-gray-400">Cargando...</div>

    <div v-else-if="data" class="grid grid-cols-12 gap-4 md:gap-6">
      <!-- KPIs -->
      <div
        v-for="kpi in kpiCards"
        :key="kpi.label"
        class="col-span-12 sm:col-span-6 xl:col-span-3"
      >
        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div class="flex items-start justify-between gap-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ kpi.label }}</p>
            <span
              v-if="kpi.pct != null"
              class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="
                kpi.pct >= 0
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500'
                  : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
              "
            >
              {{ formatPct(kpi.pct) }}
            </span>
          </div>
          <h3 class="mt-3 text-title-sm font-bold text-gray-800 dark:text-white/90">
            {{ kpi.value }}
          </h3>
          <p v-if="kpi.hint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ kpi.hint }}
          </p>
        </div>
      </div>

      <!-- Sparklines -->
      <div class="col-span-12 xl:col-span-6">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Apartados abiertos</p>
              <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                {{ data.sparkline.layawaysOpen }}
              </h3>
              <p
                class="mt-1 text-xs"
                :class="
                  data.sparkline.layawayWeekDelta >= 0
                    ? 'text-error-500'
                    : 'text-success-500'
                "
              >
                {{ data.sparkline.layawayWeekDelta >= 0 ? '+' : '' }}{{ data.sparkline.layawayWeekDelta }}
                vs semana anterior
              </p>
              <p class="mt-0.5 text-xs text-gray-500">Saldo pendiente por liquidar</p>
            </div>
            <div class="h-16 w-36 shrink-0">
              <VueApexCharts
                type="area"
                height="64"
                :options="sparkOptions('#F04438', '#F0443833')"
                :series="[{ name: 'Ingresos', data: data.sparkline.revenueLast7Days }]"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="col-span-12 xl:col-span-6">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Ventas de la semana</p>
              <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                {{ data.sparkline.salesWeekCount }}
              </h3>
              <p
                class="mt-1 text-xs"
                :class="
                  data.sparkline.salesWeekChangePct >= 0
                    ? 'text-success-500'
                    : 'text-error-500'
                "
              >
                {{ formatPct(data.sparkline.salesWeekChangePct) }} vs semana anterior
              </p>
              <p class="mt-0.5 text-xs text-gray-500">Tickets registrados</p>
            </div>
            <div class="h-16 w-36 shrink-0">
              <VueApexCharts
                type="area"
                height="64"
                :options="sparkOptions('#12B76A', '#12B76A33')"
                :series="[{ name: 'Ventas', data: data.sparkline.salesLast7Days }]"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Stacked monthly -->
      <div class="col-span-12 xl:col-span-8">
        <div
          class="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            Ventas por marca
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ingresos mensuales de los últimos 8 meses
          </p>
          <div class="mt-4">
            <VueApexCharts
              type="bar"
              height="300"
              :options="stackedOptions"
              :series="data.salesByBrandMonthly.series"
            />
          </div>
        </div>
      </div>

      <!-- Weekly performance -->
      <div class="col-span-12 xl:col-span-4">
        <div
          class="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <div class="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            <button
              v-for="tab in perfTabs"
              :key="tab"
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="
                perfTab === tab
                  ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
              "
              @click="perfTab = tab"
            >
              {{ tab }}
            </button>
          </div>

          <template v-if="perfTab === 'Ventas diarias'">
            <div class="mt-5 grid grid-cols-2 gap-3">
              <div
                v-for="p in data.weekly.topProducts.slice(0, 2)"
                :key="p.name"
                class="text-sm"
              >
                <p class="truncate text-gray-500 dark:text-gray-400">{{ p.name }}</p>
                <p class="mt-1 font-semibold text-gray-800 dark:text-white">
                  {{ p.qty }}
                  <span
                    :class="
                      p.changeDir === 'up'
                        ? 'text-success-500'
                        : p.changeDir === 'down'
                          ? 'text-error-500'
                          : 'text-gray-400'
                    "
                  >
                    {{ p.changeDir === 'up' ? '↑' : p.changeDir === 'down' ? '↓' : '·' }}
                  </span>
                </p>
              </div>
            </div>
            <div class="mt-5">
              <p class="text-sm text-gray-500 dark:text-gray-400">Promedio ventas diarias</p>
              <div class="mt-1 flex items-end gap-2">
                <h4 class="text-2xl font-bold text-gray-800 dark:text-white">
                  ${{ formatMoney(data.weekly.avgDailySales) }}
                </h4>
                <span
                  class="mb-1 text-xs font-medium"
                  :class="
                    data.weekly.avgDailyChangePct >= 0
                      ? 'text-success-500'
                      : 'text-error-500'
                  "
                >
                  {{ formatPct(data.weekly.avgDailyChangePct) }}
                </span>
              </div>
            </div>
            <div class="mt-4 flex-1">
              <VueApexCharts
                type="bar"
                height="180"
                :options="weeklyBarOptions"
                :series="[{ name: 'Ingresos', data: data.weekly.revenueByDay }]"
              />
            </div>
          </template>

          <template v-else>
            <ul class="mt-5 space-y-3">
              <li
                v-for="p in data.weekly.topProducts"
                :key="p.name"
                class="flex items-center justify-between gap-2 text-sm"
              >
                <span class="truncate text-gray-700 dark:text-gray-300">{{ p.name }}</span>
                <span class="shrink-0 font-semibold text-gray-800 dark:text-white">
                  {{ p.qty }} uds
                  <span
                    :class="
                      p.changeDir === 'up'
                        ? 'text-success-500'
                        : p.changeDir === 'down'
                          ? 'text-error-500'
                          : 'text-gray-400'
                    "
                  >
                    {{ p.changeDir === 'up' ? '↑' : p.changeDir === 'down' ? '↓' : '' }}
                  </span>
                </span>
              </li>
              <li
                v-if="!data.weekly.topProducts.length"
                class="text-sm text-gray-500"
              >
                Sin ventas esta semana
              </li>
            </ul>
          </template>
        </div>
      </div>

      <!-- Recent sales -->
      <div class="col-span-12 xl:col-span-8">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Ventas recientes
            </h3>
            <router-link
              to="/sales"
              class="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Ver todas →
            </router-link>
          </div>
          <div class="max-w-full overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-t border-gray-100 text-left dark:border-gray-800">
                  <th class="py-3 pr-4 font-medium text-gray-500">Ticket</th>
                  <th class="py-3 pr-4 font-medium text-gray-500">Fecha</th>
                  <th class="py-3 pr-4 font-medium text-gray-500">Cliente / Atendió</th>
                  <th class="py-3 pr-4 font-medium text-gray-500">Monto</th>
                  <th class="py-3 font-medium text-gray-500">Pago</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="sale in data.recentSales"
                  :key="sale.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                    #{{ sale.ticketNumber }}
                  </td>
                  <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                    {{ formatDate(sale.soldAt) }}
                  </td>
                  <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                    {{ sale.customerName || sale.attendantName || '—' }}
                  </td>
                  <td class="py-3 pr-4 text-gray-800 dark:text-white">
                    ${{ formatMoney(sale.total) }}
                  </td>
                  <td class="py-3">
                    <span
                      class="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500"
                    >
                      {{ sale.paymentMethod }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!data.recentSales.length">
                  <td colspan="5" class="py-6 text-center text-gray-500">
                    Aún no hay ventas registradas
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Activities -->
      <div class="col-span-12 xl:col-span-4">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
        >
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Actividad</h3>
          <ul class="mt-5 space-y-4">
            <li
              v-for="act in data.activities"
              :key="act.id"
              class="flex gap-3"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                :class="activityColor(act.type)"
              >
                {{ initials(act.actorName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm text-gray-800 dark:text-white/90">
                  <span class="font-medium">{{ act.actorName }}</span>
                  {{ act.action }}
                  <span class="font-medium text-brand-500">{{ act.reference }}</span>
                </p>
                <p class="mt-0.5 text-xs text-gray-500">{{ relativeTime(act.at) }}</p>
              </div>
            </li>
            <li v-if="!data.activities.length" class="text-sm text-gray-500">
              Sin actividad reciente
            </li>
          </ul>
        </div>
      </div>

      <!-- Low stock -->
      <div class="col-span-12">
        <div
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6"
        >
          <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
              Productos con stock bajo
            </h3>
            <router-link
              to="/stock"
              class="text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              Ver inventario →
            </router-link>
          </div>
          <div class="max-w-full overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-t border-gray-100 text-left dark:border-gray-800">
                  <th class="py-3 pr-4 font-medium text-gray-500">Producto</th>
                  <th class="py-3 pr-4 font-medium text-gray-500">SKU</th>
                  <th
                    v-if="auth.isAdmin"
                    class="py-3 pr-4 font-medium text-gray-500"
                  >
                    Marca
                  </th>
                  <th class="py-3 pr-4 font-medium text-gray-500">Cantidad</th>
                  <th class="py-3 font-medium text-gray-500">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in data.lowStockItems"
                  :key="item.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-4 text-gray-800 dark:text-white">
                    {{ item.product.name }}
                  </td>
                  <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                    {{ item.product.sku }}
                  </td>
                  <td
                    v-if="auth.isAdmin"
                    class="py-3 pr-4 text-gray-600 dark:text-gray-300"
                  >
                    {{ item.product.brand.name }}
                  </td>
                  <td class="py-3 pr-4 font-medium text-error-500">{{ item.quantity }}</td>
                  <td class="py-3 text-gray-600 dark:text-gray-300">{{ item.minStock }}</td>
                </tr>
                <tr v-if="!data.lowStockItems.length">
                  <td
                    :colspan="auth.isAdmin ? 5 : 4"
                    class="py-6 text-center text-gray-500"
                  >
                    No hay productos con stock bajo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import {
  fetchDashboardAnalytics,
  type DashboardAnalytics,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/composables/useCajaSession'

const auth = useAuthStore()
const data = ref<DashboardAnalytics | null>(null)
const loading = ref(true)
const perfTabs = ['Ventas diarias', 'Top productos'] as const
const perfTab = ref<(typeof perfTabs)[number]>('Ventas diarias')

const STACK_COLORS = ['#1E3A8A', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE']

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}%`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `Hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function activityColor(type: DashboardAnalytics['activities'][number]['type']): string {
  if (type === 'sale') return 'bg-brand-500'
  if (type === 'product_request') return 'bg-warning-500'
  return 'bg-success-500'
}

const kpiCards = computed(() => {
  const k = data.value?.kpis
  if (!k) return []
  return [
    {
      label: 'Ingresos del mes',
      value: `$${formatMoney(k.revenueMonth)}`,
      pct: k.revenueChangePct,
      hint: null as string | null,
    },
    {
      label: 'Clientes con compra',
      value: String(k.customersMonth),
      pct: k.customersChangePct,
      hint: null,
    },
    {
      label: 'Ticket promedio',
      value: `$${formatMoney(k.avgTicketMonth)}`,
      pct: k.avgTicketChangePct,
      hint: null,
    },
    {
      label: 'Stock bajo',
      value: String(k.lowStockCount),
      pct: null as number | null,
      hint: `${k.totalStockUnits} unidades en inventario`,
    },
  ]
})

function sparkOptions(color: string, fill: string) {
  return {
    chart: {
      sparkline: { enabled: true },
      toolbar: { show: false },
      animations: { enabled: true },
    },
    stroke: { curve: 'smooth', width: 2 },
    colors: [color],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 100],
        colorStops: [
          { offset: 0, color: fill, opacity: 1 },
          { offset: 100, color: fill, opacity: 0.05 },
        ],
      },
    },
    tooltip: { enabled: false },
    grid: { show: false },
    xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { show: false },
  }
}

const stackedOptions = computed(() => ({
  chart: {
    stacked: true,
    toolbar: { show: false },
    fontFamily: 'Outfit, sans-serif',
  },
  colors: STACK_COLORS,
  plotOptions: {
    bar: { horizontal: false, columnWidth: '45%', borderRadius: 4, borderRadiusApplication: 'end' },
  },
  dataLabels: { enabled: false },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontFamily: 'Outfit, sans-serif',
  },
  xaxis: {
    categories: data.value?.salesByBrandMonthly.months ?? [],
  },
  yaxis: {
    labels: {
      formatter: (v: number) => `$${formatMoney(v)}`,
    },
  },
  tooltip: {
    y: { formatter: (v: number) => `$${formatMoney(v)}` },
  },
  grid: {
    borderColor: '#F3F4F6',
  },
}))

const weeklyBarOptions = computed(() => ({
  chart: {
    toolbar: { show: false },
    fontFamily: 'Outfit, sans-serif',
  },
  colors: ['#465FFF'],
  plotOptions: {
    bar: { borderRadius: 4, columnWidth: '45%' },
  },
  dataLabels: { enabled: false },
  xaxis: {
    categories: data.value?.weekly.days ?? [],
  },
  yaxis: { show: false },
  grid: { show: false },
  tooltip: {
    y: { formatter: (v: number) => `$${formatMoney(v)}` },
  },
}))

async function load() {
  loading.value = true
  try {
    data.value = await fetchDashboardAnalytics()
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
