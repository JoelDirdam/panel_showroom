<template>
  <component-card title="Tickets de la marca">
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
    <div v-else class="overflow-x-auto">
      <table class="min-w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <th class="py-3 pr-4">Ticket</th>
            <th class="py-3 pr-4">Producto</th>
            <th class="py-3 pr-4">Cantidad</th>
            <th class="py-3 pr-4">Total</th>
            <th class="py-3 pr-4">Fecha</th>
            <th class="py-3">Método de pago</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in flatRows" :key="row.line.id" class="border-b border-gray-100 dark:border-gray-800">
            <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ row.sale.ticketNumber }}</td>
            <td class="py-3 pr-4 text-gray-800 dark:text-white">
              {{ row.line.product.name }}
              <span class="block text-xs text-gray-500">{{ row.line.product.sku }}</span>
            </td>
            <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ row.line.quantity }}</td>
            <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">${{ row.line.total }}</td>
            <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ formatDate(row.sale.soldAt) }}</td>
            <td class="py-3 text-gray-600 dark:text-gray-300">{{ paymentLabel(row.sale.paymentMethod) }}</td>
          </tr>
          <tr v-if="flatRows.length === 0">
            <td colspan="6" class="py-8 text-center text-gray-500">No hay tickets registrados para esta marca.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </component-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand, type PaymentMethod, type Sale } from '@/services/api'

const props = defineProps<{ brand: Brand }>()

const sales = ref<Sale[]>([])
const loading = ref(true)

const flatRows = computed(() =>
  sales.value.flatMap((sale) =>
    sale.lines.filter((line) => line.product.brandId === props.brand.id).map((line) => ({ sale, line })),
  ),
)

function paymentLabel(method: PaymentMethod) {
  const labels: Record<PaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    OTRO: 'Otro',
    MIXTO: 'Mixto',
  }
  return labels[method] || method
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

onMounted(async () => {
  try {
    const { data } = await api.get<Sale[]>('/sales')
    sales.value = data
  } finally {
    loading.value = false
  }
})
</script>
