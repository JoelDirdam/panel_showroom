<template>
  <admin-layout>
    <page-breadcrumb page-title="Dashboard Showroom" />

    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Cargando...</div>

    <div v-else class="grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Productos</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats?.totalProducts ?? 0 }}</h3>
        </div>
      </div>
      <div v-if="auth.isAdmin" class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Marcas activas</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats?.totalBrands ?? 0 }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Unidades en stock</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats?.totalStockUnits ?? 0 }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Stock bajo</p>
          <h3 class="mt-2 text-2xl font-bold text-error-500">{{ stats?.lowStockCount ?? 0 }}</h3>
        </div>
      </div>

      <div class="col-span-12">
        <component-card title="Productos con stock bajo">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-800 text-left text-gray-500">
                  <th class="py-3 pr-4">Producto</th>
                  <th class="py-3 pr-4">SKU</th>
                  <th v-if="auth.isAdmin" class="py-3 pr-4">Marca</th>
                  <th class="py-3 pr-4">Cantidad</th>
                  <th class="py-3">Mínimo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in stats?.lowStockItems ?? []"
                  :key="item.id"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ item.product.name }}</td>
                  <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ item.product.sku }}</td>
                  <td v-if="auth.isAdmin" class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                    {{ item.product.brand.name }}
                  </td>
                  <td class="py-3 pr-4 font-medium text-error-500">{{ item.quantity }}</td>
                  <td class="py-3 text-gray-600 dark:text-gray-300">{{ item.minStock }}</td>
                </tr>
                <tr v-if="!stats?.lowStockItems?.length">
                  <td :colspan="auth.isAdmin ? 5 : 4" class="py-6 text-center text-gray-500">
                    No hay productos con stock bajo
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </component-card>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type DashboardStats } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const stats = ref<DashboardStats | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data } = await api.get<DashboardStats>('/dashboard')
    stats.value = data
  } finally {
    loading.value = false
  }
})
</script>
