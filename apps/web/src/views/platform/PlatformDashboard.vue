<template>
  <platform-layout>
    <h2 class="mb-6 text-xl font-semibold text-gray-800 dark:text-white">Resumen de plataforma</h2>

    <div v-if="error" class="mb-4 text-sm text-error-500">{{ error }}</div>

    <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="card in cards"
        :key="card.label"
        class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      >
        <p class="text-xs text-gray-500">{{ card.label }}</p>
        <p class="mt-1 text-2xl font-semibold text-gray-800 dark:text-white">{{ card.value }}</p>
      </div>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <h3 class="mb-4 text-sm font-semibold text-gray-800 dark:text-white">Negocios</h3>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-gray-500 dark:border-gray-800">
              <th class="py-2 pr-3">Nombre</th>
              <th class="py-2 pr-3">Plan</th>
              <th class="py-2 pr-3">Marcas</th>
              <th class="py-2 pr-3">Productos</th>
              <th class="py-2 pr-3">Ventas</th>
              <th class="py-2 pr-3">Empleados</th>
              <th class="py-2 pr-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="t in tenants"
              :key="t.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-3 font-medium text-gray-800 dark:text-white">{{ t.name }}</td>
              <td class="py-3 pr-3 text-gray-600 dark:text-gray-300">
                {{ t.subscription?.planType || '—' }}
                <span class="text-xs text-gray-400">{{ t.subscription?.status }}</span>
              </td>
              <td class="py-3 pr-3">{{ t.counts.brands }}</td>
              <td class="py-3 pr-3">{{ t.counts.products }}</td>
              <td class="py-3 pr-3">{{ t.counts.sales }}</td>
              <td class="py-3 pr-3">{{ t.counts.employees }}</td>
              <td class="py-3 pr-3">
                <router-link
                  :to="`/platform/tenants/${t.id}`"
                  class="text-brand-600 hover:underline"
                >
                  Ver
                </router-link>
              </td>
            </tr>
            <tr v-if="!loading && tenants.length === 0">
              <td colspan="7" class="py-8 text-center text-gray-500">Sin negocios</td>
            </tr>
          </tbody>
        </table>
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

const stats = ref<PlatformStats | null>(null)
const tenants = ref<PlatformTenantRow[]>([])
const loading = ref(true)
const error = ref('')

const cards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: 'Negocios', value: s.tenants },
    { label: 'Marcas', value: s.brands },
    { label: 'Productos', value: s.products },
    { label: 'Ventas (total)', value: s.sales },
    { label: 'Ventas 30 días', value: s.salesLast30Days },
    { label: 'Empleados', value: s.employees },
    {
      label: 'Suma ventas ($)',
      value: s.salesTotalSum.toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    },
  ]
})

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
