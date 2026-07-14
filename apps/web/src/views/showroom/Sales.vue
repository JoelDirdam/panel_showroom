<template>
  <admin-layout>
    <page-breadcrumb page-title="Ventas/Tickets" />

    <component-card title="Registro de ventas">
      <div class="mb-4 flex flex-wrap justify-end gap-2">
        <button
          v-if="auth.isAdmin"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          Registrar venta
        </button>
      </div>

      <div class="overflow-x-auto">
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

    <div
      v-if="showModal"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      @click.self="closeCreate"
    >
      <div class="mt-10 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Registrar venta</h3>

        <div class="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Método de pago</label>
            <select
              v-model="form.paymentMethod"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="EFECTIVO">Efectivo</option>
              <option value="TARJETA">Tarjeta</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="OTRO">Otro</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Fecha</label>
            <input
              v-model="form.soldAtLocal"
              type="datetime-local"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div class="mb-3 flex items-center justify-between">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-200">Productos</h4>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            @click="addLine"
          >
            Agregar producto
          </button>
        </div>

        <div class="space-y-3">
          <div
            v-for="(line, index) in form.lines"
            :key="index"
            class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
          >
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div class="sm:col-span-2 lg:col-span-2">
                <label class="mb-1 block text-xs text-gray-500">Producto</label>
                <select
                  v-model="line.productId"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  @change="onProductChange(line)"
                >
                  <option value="">Seleccionar…</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.brand.name }}) — stock {{ p.stock?.quantity ?? 0 }}
                  </option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500">Cantidad</label>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500">Descuento</label>
                <input
                  v-model.number="line.discount"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500">Comisión</label>
                <input
                  v-model.number="line.commission"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div class="flex items-end justify-between gap-2">
                <div>
                  <div class="text-xs text-gray-500">SUBT / Total</div>
                  <div class="text-sm font-medium text-gray-800 dark:text-white">
                    ${{ lineSubtotal(line).toFixed(2) }} / ${{ lineTotal(line).toFixed(2) }}
                  </div>
                </div>
                <button
                  v-if="form.lines.length > 1"
                  type="button"
                  class="text-xs text-error-500 hover:underline"
                  @click="removeLine(index)"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
          <div class="text-sm text-gray-600 dark:text-gray-300">
            Gran total:
            <span class="font-semibold text-gray-800 dark:text-white">${{ grandTotal.toFixed(2) }}</span>
          </div>
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-gray-300"
              @click="closeCreate"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              :disabled="saving"
              @click="submitCreate"
            >
              {{ saving ? 'Guardando…' : 'Guardar venta' }}
            </button>
          </div>
        </div>

        <p v-if="formError" class="mt-3 text-sm text-error-500">{{ formError }}</p>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, {
  type CreateSalePayload,
  type PaymentMethod,
  type Product,
  type Sale,
  type SaleLine,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'

interface FormLine {
  productId: string
  quantity: number
  discount: number
  commission: number
  unitPrice: number
}

const auth = useAuthStore()
const sales = ref<Sale[]>([])
const products = ref<Product[]>([])
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')

const form = reactive<{
  paymentMethod: PaymentMethod
  soldAtLocal: string
  lines: FormLine[]
}>({
  paymentMethod: 'EFECTIVO',
  soldAtLocal: '',
  lines: [],
})

const flatRows = computed(() =>
  sales.value.flatMap((sale) => sale.lines.map((line) => ({ sale, line }))),
)

const grandTotal = computed(() =>
  form.lines.reduce((sum, line) => sum + lineTotal(line), 0),
)

function paymentLabel(method: PaymentMethod) {
  const map: Record<PaymentMethod, string> = {
    EFECTIVO: 'Efectivo',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    OTRO: 'Otro',
  }
  return map[method] ?? method
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function emptyLine(): FormLine {
  return { productId: '', quantity: 1, discount: 0, commission: 0, unitPrice: 0 }
}

function productPrice(productId: string) {
  const product = products.value.find((p) => p.id === productId)
  return product?.price ? Number(product.price) : 0
}

function onProductChange(line: FormLine) {
  line.unitPrice = productPrice(line.productId)
}

function lineSubtotal(line: FormLine) {
  const price = line.unitPrice || productPrice(line.productId)
  return price * (line.quantity || 0)
}

function lineTotal(line: FormLine) {
  return Math.max(0, lineSubtotal(line) - (line.discount || 0))
}

function addLine() {
  form.lines.push(emptyLine())
}

function removeLine(index: number) {
  form.lines.splice(index, 1)
}

function toLocalInputValue(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function openCreate() {
  form.paymentMethod = 'EFECTIVO'
  form.soldAtLocal = toLocalInputValue()
  form.lines = [emptyLine()]
  formError.value = ''
  showModal.value = true
}

function closeCreate() {
  showModal.value = false
  formError.value = ''
}

async function load() {
  const [salesRes, productsRes] = await Promise.all([
    api.get<Sale[]>('/sales'),
    api.get<Product[]>('/products'),
  ])
  sales.value = salesRes.data
  products.value = productsRes.data
}

async function submitCreate() {
  formError.value = ''
  if (form.lines.some((l) => !l.productId || l.quantity < 1)) {
    formError.value = 'Completa producto y cantidad en cada línea'
    return
  }

  const payload: CreateSalePayload = {
    paymentMethod: form.paymentMethod,
    soldAt: new Date(form.soldAtLocal).toISOString(),
    lines: form.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      discount: line.discount || 0,
      commission: line.commission || 0,
      unitPrice: line.unitPrice || productPrice(line.productId),
    })),
  }

  saving.value = true
  try {
    await api.post('/sales', payload)
    closeCreate()
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo registrar la venta'
  } finally {
    saving.value = false
  }
}

async function toggleFlag(line: SaleLine, field: 'inSettlement' | 'paid') {
  await api.patch(`/sales/lines/${line.id}`, { [field]: !line[field] })
  await load()
}

onMounted(load)
</script>
