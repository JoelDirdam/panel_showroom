<template>
  <admin-layout>
    <page-breadcrumb page-title="Ventas/Tickets" />

    <component-card title="Registro de ventas">
      <div class="mb-4 flex flex-wrap justify-end gap-2">
        <button
          v-if="auth.isAdmin"
          data-tour="sales-create"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="goToCaja"
        >
          Registrar venta
        </button>
      </div>

      <div class="overflow-x-auto" data-tour="sales-table">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3 pr-4">ID</th>
              <th class="py-3 pr-4">Producto</th>
              <th v-if="auth.isAdmin" class="py-3 pr-4">Marca</th>
              <th class="py-3 pr-4">Cantidad</th>
              <th class="py-3 pr-4">SUBT</th>
              <th class="py-3 pr-4">Descuento</th>
              <th class="py-3 pr-4">Comisión</th>
              <th class="py-3 pr-4">Total</th>
              <th class="py-3 pr-4">Fecha</th>
              <th class="py-3 pr-4">Método de pago</th>
              <th class="py-3 pr-4">En corte</th>
              <th class="py-3">Pagado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in flatRows"
              :key="row.line.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                {{ row.sale.ticketNumber }}
              </td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">
                {{ row.line.product.name }}
                <span class="block text-xs text-gray-500">{{ row.line.product.sku }}</span>
              </td>
              <td v-if="auth.isAdmin" class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ row.line.product.brand.name }}
              </td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ row.line.quantity }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">${{ row.line.subtotal }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">${{ row.line.discount }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">${{ row.line.commission }}</td>
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">${{ row.line.total }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ formatDate(row.sale.soldAt) }}
              </td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ paymentLabel(row.sale.paymentMethod) }}
              </td>
              <td class="py-3 pr-4">
                <button
                  v-if="auth.isAdmin"
                  type="button"
                  class="text-sm font-medium"
                  :class="row.line.inSettlement ? 'text-success-500' : 'text-gray-500'"
                  @click="toggleFlag(row.line, 'inSettlement')"
                >
                  {{ row.line.inSettlement ? 'Sí' : 'No' }}
                </button>
                <span v-else :class="row.line.inSettlement ? 'text-success-500' : 'text-gray-500'">
                  {{ row.line.inSettlement ? 'Sí' : 'No' }}
                </span>
              </td>
              <td class="py-3">
                <button
                  v-if="auth.isAdmin"
                  type="button"
                  class="text-sm font-medium"
                  :class="row.line.paid ? 'text-success-500' : 'text-gray-500'"
                  @click="toggleFlag(row.line, 'paid')"
                >
                  {{ row.line.paid ? 'Sí' : 'No' }}
                </button>
                <span v-else :class="row.line.paid ? 'text-success-500' : 'text-gray-500'">
                  {{ row.line.paid ? 'Sí' : 'No' }}
                </span>
              </td>
            </tr>
            <tr v-if="flatRows.length === 0">
              <td :colspan="auth.isAdmin ? 12 : 11" class="py-8 text-center text-gray-500">
                No hay ventas registradas
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type PaymentMethod, type Sale, type SaleLine } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const sales = ref<Sale[]>([])

const flatRows = computed(() =>
  sales.value.flatMap((sale) => sale.lines.map((line) => ({ sale, line }))),
)

function paymentLabel(method: PaymentMethod) {
  const map: Record<PaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    OTRO: 'Otro',
    MIXTO: 'Mixto',
  }
  return map[method] ?? method
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function goToCaja() {
  void router.push('/caja')
}

async function load() {
  const { data } = await api.get<Sale[]>('/sales')
  sales.value = data
}

async function toggleFlag(line: SaleLine, field: 'inSettlement' | 'paid') {
  await api.patch(`/sales/lines/${line.id}`, { [field]: !line[field] })
  await load()
}

onMounted(() => {
  void load()
})
</script>
