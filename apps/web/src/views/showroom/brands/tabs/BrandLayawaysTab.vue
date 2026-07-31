<template>
  <component-card title="Apartados de la marca">
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th class="py-3 pr-4">Código</th>
            <th class="py-3 pr-4">Cliente</th>
            <th class="py-3 pr-4">Estado</th>
            <th class="py-3 pr-4">Total</th>
            <th class="py-3 pr-4">Saldo</th>
            <th class="py-3 pr-4">Fecha</th>
            <th class="py-3">Vence</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="layaway in brandLayaways" :key="layaway.id" class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ layaway.code }}</td>
            <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ layaway.customer?.name || '—' }}</td>
            <td class="py-3 pr-4" :class="statusClass(layaway.status)">{{ statusLabel(layaway.status) }}</td>
            <td class="py-3 pr-4 text-gray-800 dark:text-white">${{ layaway.total }}</td>
            <td class="py-3 pr-4 text-gray-800 dark:text-white">${{ layaway.balance }}</td>
            <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ formatDate(layaway.createdAt) }}</td>
            <td class="py-3" :class="isOverdue(layaway) ? 'text-error-500' : 'text-gray-600 dark:text-gray-300'">
              {{ layaway.status === 'OPEN' ? formatDueDate(layaway.createdAt) : '—' }}
            </td>
          </tr>
          <tr v-if="brandLayaways.length === 0">
            <td colspan="7" class="py-8 text-center text-gray-500">No hay apartados registrados para esta marca.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </component-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand, type Layaway, type LayawayStatus } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ brand: Brand }>()

const auth = useAuthStore()
const layaways = ref<Layaway[]>([])
const loading = ref(true)

/**
 * `layawayDueDays` viene de `BusinessPreferences` (ver `/auth/me` en
 * `apps/api/src/lib/meShape.ts`, Agente D). El modelo `Layaway` todavía no
 * guarda una fecha de vencimiento propia, así que se calcula en el cliente
 * como `createdAt + layawayDueDays` — solo para mostrar; no bloquea nada.
 */
const layawayDueDays = computed(() => auth.user?.preferences?.layawayDueDays ?? 15)

function dueDate(createdAt: string): Date {
  const due = new Date(createdAt)
  due.setDate(due.getDate() + layawayDueDays.value)
  return due
}

function isOverdue(layaway: Layaway): boolean {
  return layaway.status === 'OPEN' && dueDate(layaway.createdAt).getTime() < Date.now()
}

function formatDueDate(createdAt: string): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(dueDate(createdAt))
}

const brandLayaways = computed(() =>
  layaways.value.filter((l) => l.lines.some((line) => line.product.brand.id === props.brand.id)),
)

function statusLabel(status: LayawayStatus) {
  return status === 'OPEN' ? 'Abierto' : status === 'COMPLETED' ? 'Completado' : 'Cancelado'
}

function statusClass(status: LayawayStatus) {
  if (status === 'COMPLETED') return 'text-success-500'
  if (status === 'CANCELLED') return 'text-gray-400'
  return 'text-warning-500'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

onMounted(async () => {
  try {
    const { data } = await api.get<Layaway[]>('/layaways')
    layaways.value = data
  } catch {
    layaways.value = []
  } finally {
    loading.value = false
  }
})
</script>
