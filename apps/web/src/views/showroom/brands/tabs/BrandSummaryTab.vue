<template>
  <div class="space-y-6">
    <component-card title="Filtro de fechas">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Desde</label>
          <input v-model="range.from" type="date" class="field" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Hasta</label>
          <input v-model="range.to" type="date" class="field" />
        </div>
        <button
          type="button"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          :disabled="loading"
          @click="load"
        >
          {{ loading ? 'Cargando…' : 'Aplicar' }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          :disabled="!summary"
          @click="downloadCutPdf"
        >
          Descargar PDF de Corte
        </button>
      </div>
    </component-card>

    <div v-if="summary" class="grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Renta mensual</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ formatCurrency(summary.rent) }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Corte acumulado</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ formatCurrency(summary.totalCut) }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Mensualidad acumulada</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ formatCurrency(summary.accruedRent) }}</h3>
          <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">Estimado (renta × meses del rango)</p>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">% Comisión</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ Number(brand.commissionPercent) }}%</h3>
        </div>
      </div>
    </div>

    <component-card v-if="summary" title="Corte acumulado por método de pago">
      <div class="grid gap-4 sm:grid-cols-4">
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Efectivo</p>
          <p class="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
            {{ formatCurrency(summary.cutBreakdown.efectivo) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Tarjeta (TDC)</p>
          <p class="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
            {{ formatCurrency(summary.cutBreakdown.tarjeta) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Transferencia (Tr)</p>
          <p class="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
            {{ formatCurrency(summary.cutBreakdown.transferencia) }}
          </p>
        </div>
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Otro</p>
          <p class="mt-1 text-lg font-semibold text-gray-800 dark:text-white">
            {{ formatCurrency(summary.cutBreakdown.otro) }}
          </p>
        </div>
      </div>
    </component-card>

    <component-card title="Ingresos por venta">
      <div v-if="summary && summary.dailySeries.length" class="max-w-full overflow-x-auto">
        <VueApexCharts type="bar" height="300" :options="chartOptions" :series="chartSeries" />
      </div>
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">
        No hay ventas registradas para esta marca en el rango seleccionado.
      </p>
    </component-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { fetchBrandSummary, type Brand, type BrandSummary } from '@/services/api'

const props = defineProps<{ brand: Brand }>()

const summary = ref<BrandSummary | null>(null)
const loading = ref(false)

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

const now = new Date()
const range = reactive({
  from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  to: isoDate(now),
})

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
}

async function load() {
  loading.value = true
  try {
    summary.value = await fetchBrandSummary(props.brand.id, range.from, range.to)
  } finally {
    loading.value = false
  }
}

const chartSeries = computed(() => [
  { name: 'Ingresos', data: summary.value?.dailySeries.map((d) => Number(d.total.toFixed(2))) ?? [] },
])

const chartOptions = computed(() => ({
  chart: { fontFamily: 'Outfit, sans-serif', toolbar: { show: false } },
  colors: ['#465FFF'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '45%' } },
  dataLabels: { enabled: false },
  xaxis: {
    categories:
      summary.value?.dailySeries.map((d) =>
        new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
      ) ?? [],
  },
  yaxis: { labels: { formatter: (v: number) => formatCurrency(v) } },
  tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
}))

function downloadCutPdf() {
  if (!summary.value) return
  const s = summary.value
  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(`
    <html>
      <head>
        <title>Corte · ${props.brand.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 32px; color: #1f2937; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #6b7280; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; font-size: 14px; }
          th { background: #f3f4f6; }
          .total { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>Corte de marca — ${props.brand.name}</h1>
        <p class="sub">Periodo: ${s.from.slice(0, 10)} al ${s.to.slice(0, 10)}</p>
        <table>
          <tr><th>Concepto</th><th>Monto</th></tr>
          <tr><td>Renta mensual</td><td>${formatCurrency(s.rent)}</td></tr>
          <tr><td>Mensualidad acumulada (estimado)</td><td>${formatCurrency(s.accruedRent)}</td></tr>
          <tr><td>Efectivo</td><td>${formatCurrency(s.cutBreakdown.efectivo)}</td></tr>
          <tr><td>Tarjeta</td><td>${formatCurrency(s.cutBreakdown.tarjeta)}</td></tr>
          <tr><td>Transferencia</td><td>${formatCurrency(s.cutBreakdown.transferencia)}</td></tr>
          <tr><td>Otro</td><td>${formatCurrency(s.cutBreakdown.otro)}</td></tr>
          <tr class="total"><td>Total corte</td><td>${formatCurrency(s.totalCut)}</td></tr>
        </table>
      </body>
    </html>
  `)
  win.document.close()
  win.focus()
  win.print()
}

onMounted(load)
</script>

<style scoped>
.field {
  border: 1px solid #d0d5dd;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}
</style>
