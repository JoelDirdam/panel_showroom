<template>
  <platform-layout>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white">Overview</h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Resumen SaaS de negocios, suscripciones y ventas en la plataforma.
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
                      class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      :class="statusBadgeClass(t.subscription?.status)"
                    >
                      {{ statusLabel(t.subscription?.status) }}
                    </span>
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
import { onMounted, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import {
  extractApiError,
  fetchPlatformStats,
  fetchPlatformTenants,
  type PlatformStats,
  type PlatformTenantRow,
} from '@/services/api'
import { formatMoney } from '@/composables/useCajaSession'

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
})
</script>
