<template>
  <admin-layout>
    <page-breadcrumb page-title="Stock" />

    <component-card title="Inventario en showroom" data-tour="stock-table">
      <div v-if="!auth.isAdmin" class="mb-4 flex justify-end">
        <router-link
          to="/product-requests"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Solicitar restock
        </router-link>
      </div>
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
              <td v-if="auth.isAdmin" class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ item.product.brand.name }}</td>
              <td class="py-3 pr-4">
                <input
                  v-model.number="edits[item.product.id].quantity"
                  type="number"
                  min="0"
                  :disabled="!auth.isAdmin"
                  class="w-20 rounded border border-gray-300 px-2 py-1 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </td>
              <td class="py-3 pr-4">
                <input
                  v-model.number="edits[item.product.id].minStock"
                  type="number"
                  min="0"
                  :disabled="!auth.isAdmin"
                  class="w-20 rounded border border-gray-300 px-2 py-1 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </td>
              <td class="py-3 pr-4">
                <span :class="item.quantity <= item.minStock ? 'text-error-500' : 'text-success-500'">
                  {{ item.quantity <= item.minStock ? 'Bajo' : 'OK' }}
                </span>
              </td>
              <td class="py-3">
                <button
                  v-if="auth.isAdmin"
                  type="button"
                  class="inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg px-3 py-1 text-xs text-white transition-colors duration-200"
                  :class="saveButtonClass(item.product.id)"
                  :disabled="saveStates[item.product.id] === 'saving'"
                  @click="save(item.product.id)"
                >
                  <svg
                    v-if="saveStates[item.product.id] === 'saving'"
                    class="h-3.5 w-3.5 animate-spin"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      class="opacity-25"
                      cx="7"
                      cy="7"
                      r="5.5"
                      stroke="currentColor"
                      stroke-width="2"
                    />
                    <path
                      class="opacity-75"
                      d="M12.5 7a5.5 5.5 0 0 0-5.5-5.5"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    />
                  </svg>
                  <CheckIcon
                    v-else-if="saveStates[item.product.id] === 'saved'"
                    class="h-3.5 w-3.5"
                  />
                  <span>
                    {{
                      saveStates[item.product.id] === 'saving'
                        ? 'Guardando…'
                        : saveStates[item.product.id] === 'saved'
                          ? 'Guardado'
                          : 'Guardar'
                    }}
                  </span>
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
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { CheckIcon } from '@/icons'
import api, { type StockItem } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

type SaveState = 'idle' | 'saving' | 'saved'

const auth = useAuthStore()
const stockItems = ref<StockItem[]>([])
const edits = reactive<Record<string, { quantity: number; minStock: number }>>({})
const saveStates = reactive<Record<string, SaveState>>({})
const savedTimers = new Map<string, ReturnType<typeof setTimeout>>()

function saveButtonClass(productId: string) {
  const state = saveStates[productId]
  if (state === 'saving') return 'cursor-wait bg-brand-500 opacity-90'
  if (state === 'saved') return 'bg-success-500 hover:bg-success-600'
  return 'bg-brand-500 hover:bg-brand-600'
}

function clearSavedTimer(productId: string) {
  const timer = savedTimers.get(productId)
  if (timer) {
    clearTimeout(timer)
    savedTimers.delete(productId)
  }
}

async function load() {
  const { data } = await api.get<StockItem[]>('/stock')
  stockItems.value = data
  for (const item of data) {
    edits[item.product.id] = {
      quantity: item.quantity,
      minStock: item.minStock,
    }
    if (!saveStates[item.product.id]) {
      saveStates[item.product.id] = 'idle'
    }
  }
}

async function save(productId: string) {
  if (saveStates[productId] === 'saving') return
  clearSavedTimer(productId)
  saveStates[productId] = 'saving'
  try {
    await api.patch(`/stock/${productId}`, edits[productId])
    await load()
    saveStates[productId] = 'saved'
    savedTimers.set(
      productId,
      setTimeout(() => {
        saveStates[productId] = 'idle'
        savedTimers.delete(productId)
      }, 2000),
    )
  } catch {
    saveStates[productId] = 'idle'
  }
}

onMounted(load)

onUnmounted(() => {
  for (const timer of savedTimers.values()) clearTimeout(timer)
  savedTimers.clear()
})
</script>
