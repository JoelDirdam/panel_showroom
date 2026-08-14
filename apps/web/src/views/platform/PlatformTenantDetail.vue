<template>
  <platform-layout>
    <router-link to="/platform" class="mb-4 inline-block text-sm text-brand-600 hover:underline">
      ← Volver
    </router-link>

    <div v-if="error" class="mb-4 text-sm text-error-500">{{ error }}</div>
    <div v-if="loading" class="text-sm text-gray-500">Cargando…</div>

    <template v-else-if="tenant">
      <h2 class="mb-1 text-xl font-semibold text-gray-800 dark:text-white">{{ tenant.name }}</h2>
      <p class="mb-6 text-sm text-gray-500">
        {{ tenant.slug }} · {{ tenant.subscription?.planType || 'sin plan' }}
        ({{ tenant.subscription?.status || '—' }})
      </p>

      <div class="mb-6 grid gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p class="text-xs text-gray-500">Ventas</p>
          <p class="text-lg font-semibold dark:text-white">
            {{ tenant.salesSummary?.count ?? 0 }}
          </p>
          <p class="text-xs text-gray-500">
            ${{
              Number(tenant.salesSummary?.totalSum || 0).toLocaleString('es-MX', {
                minimumFractionDigits: 2,
              })
            }}
          </p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p class="text-xs text-gray-500">Usuarios</p>
          <p class="text-lg font-semibold dark:text-white">{{ tenant.users?.length || 0 }}</p>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p class="text-xs text-gray-500">Empleados</p>
          <p class="text-lg font-semibold dark:text-white">{{ tenant.employees?.length || 0 }}</p>
        </div>
      </div>

      <section class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-semibold dark:text-white">Marcas</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="b in tenant.brands || []" :key="b.id" class="flex justify-between">
            <span class="text-gray-800 dark:text-gray-200">{{ b.name }}</span>
            <span class="text-gray-500">{{ b._count?.products ?? 0 }} productos</span>
          </li>
          <li v-if="!(tenant.brands || []).length" class="text-gray-500">Sin marcas</li>
        </ul>
      </section>

      <section class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-semibold dark:text-white">Usuarios</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="u in tenant.users || []" :key="u.id" class="flex justify-between gap-4">
            <span class="text-gray-800 dark:text-gray-200">{{ u.name }}</span>
            <span class="text-gray-500">{{ u.email }} · {{ u.role }}</span>
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-semibold dark:text-white">Últimas ventas</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="s in sales" :key="s.id" class="flex justify-between gap-4">
            <span class="text-gray-800 dark:text-gray-200">#{{ s.ticketNumber }}</span>
            <span class="text-gray-500">
              ${{ Number(s.total).toLocaleString('es-MX', { minimumFractionDigits: 2 }) }} ·
              {{ new Date(s.soldAt).toLocaleString('es-MX') }}
            </span>
          </li>
          <li v-if="!sales.length" class="text-gray-500">Sin ventas</li>
        </ul>
      </section>
    </template>
  </platform-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import api, { extractApiError, fetchPlatformTenant } from '@/services/api'

const route = useRoute()
const loading = ref(true)
const error = ref('')
const tenant = ref<any>(null)
const sales = ref<any[]>([])

onMounted(async () => {
  const id = String(route.params.id)
  try {
    tenant.value = await fetchPlatformTenant(id)
    const { data } = await api.get(`/platform/tenants/${id}/sales`, { params: { limit: 20 } })
    sales.value = data.items || []
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar el negocio')
  } finally {
    loading.value = false
  }
})
</script>
