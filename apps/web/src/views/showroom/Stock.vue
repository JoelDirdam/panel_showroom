<template>
  <admin-layout>
    <page-breadcrumb page-title="Stock" />

    <component-card title="Inventario en showroom">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
              <th class="py-3 pr-4">Producto</th>
              <th class="py-3 pr-4">SKU</th>
              <th v-if="auth.isAdmin" class="py-3 pr-4">Marca</th>
              <th class="py-3 pr-4">Cantidad</th>
              <th class="py-3 pr-4">Mínimo</th>
              <th class="py-3 pr-4">Estado</th>
              <th class="py-3">Actualizar</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in stockItems"
              :key="item.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ item.product.name }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ item.product.sku }}</td>
              <td v-if="auth.isAdmin" class="py-3 pr-4">{{ item.product.brand.name }}</td>
              <td class="py-3 pr-4">
                <input
                  v-model.number="edits[item.product.id].quantity"
                  type="number"
                  min="0"
                  class="w-20 rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-800"
                />
              </td>
              <td class="py-3 pr-4">
                <input
                  v-model.number="edits[item.product.id].minStock"
                  type="number"
                  min="0"
                  class="w-20 rounded border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-800"
                />
              </td>
              <td class="py-3 pr-4">
                <span :class="item.quantity <= item.minStock ? 'text-error-500' : 'text-success-500'">
                  {{ item.quantity <= item.minStock ? 'Bajo' : 'OK' }}
                </span>
              </td>
              <td class="py-3">
                <button
                  class="rounded-lg bg-brand-500 px-3 py-1 text-xs text-white hover:bg-brand-600"
                  @click="save(item.product.id)"
                >
                  Guardar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type StockItem } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const stockItems = ref<StockItem[]>([])
const edits = reactive<Record<string, { quantity: number; minStock: number }>>({})

async function load() {
  const { data } = await api.get<StockItem[]>('/stock')
  stockItems.value = data
  for (const item of data) {
    edits[item.product.id] = {
      quantity: item.quantity,
      minStock: item.minStock,
    }
  }
}

async function save(productId: string) {
  await api.patch(`/stock/${productId}`, edits[productId])
  await load()
}

onMounted(load)
</script>
