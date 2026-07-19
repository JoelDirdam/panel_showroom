<template>
  <admin-layout>
    <page-breadcrumb page-title="Ventas/Tickets" />

    <component-card title="Registro de ventas">
      <div class="mb-4 flex flex-wrap justify-end gap-2">
        <button
          v-if="auth.isAdmin"
          data-tour="sales-create"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
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

    <div
      v-if="showModal"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      @click.self="closeCreate"
    >
      <div data-tour="sales-modal" class="mt-10 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Registrar venta</h3>

        <div class="mb-4 grid gap-4 sm:grid-cols-2">
          <div data-tour="sales-payment-method">
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

        <div class="mb-3 flex items-center justify-between gap-2">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-200">Productos</h4>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            @click="openProductSearch"
          >
            <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M10.5 10.5 14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
            Buscar producto
          </button>
        </div>

        <div
          v-if="showProductSearch"
          class="mb-3 rounded-lg border border-brand-200 bg-brand-50/40 p-3 dark:border-brand-500/30 dark:bg-brand-500/10"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300">Buscar por SKU o nombre</label>
            <button
              type="button"
              class="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              @click="closeProductSearch"
            >
              Cerrar
            </button>
          </div>
          <input
            ref="productSearchInputRef"
            v-model="productSearchQuery"
            type="text"
            autocomplete="off"
            placeholder="Escribe SKU o nombre del producto…"
            class="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            @input="searchHighlightIndex = 0"
            @keydown.escape.prevent="closeProductSearch"
            @keydown.enter.prevent="confirmHighlightedSearchProduct"
            @keydown.down.prevent="moveSearchHighlight(1)"
            @keydown.up.prevent="moveSearchHighlight(-1)"
          />
          <ul class="max-h-52 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
            <li
              v-for="(p, pIndex) in searchResults"
              :key="p.id"
              class="cursor-pointer border-b border-gray-100 px-3 py-2 text-sm last:border-b-0 dark:border-gray-800"
              :class="
                pIndex === searchHighlightIndex
                  ? 'bg-brand-50 dark:bg-brand-500/15'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5'
              "
              @click="addProductFromSearch(p)"
            >
              <div class="font-medium text-gray-800 dark:text-white">
                {{ p.sku }}
                <span class="font-normal text-gray-600 dark:text-gray-300">— {{ p.name }}</span>
              </div>
              <div class="text-xs text-gray-500">
                {{ p.brand.name }} · stock {{ p.stock?.quantity ?? 0 }}
                <span v-if="p.price"> · ${{ Number(p.price).toFixed(2) }}</span>
              </div>
            </li>
            <li
              v-if="searchResults.length === 0"
              class="px-3 py-4 text-center text-sm text-gray-500"
            >
              Sin resultados
            </li>
          </ul>
        </div>

        <div class="space-y-3">
          <div
            v-for="(line, index) in form.lines"
            :key="index"
            class="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
          >
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <div
                class="relative sm:col-span-2 lg:col-span-2"
                :data-tour="index === 0 ? 'sales-product-input' : undefined"
              >
                <label class="mb-1 block text-xs text-gray-500">Producto / SKU</label>
                <input
                  :ref="(el) => setProductInputRef(index, el)"
                  v-model="line.query"
                  type="text"
                  autocomplete="off"
                  placeholder="Escribe SKU o nombre…"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  @focus="openProductDropdown(index)"
                  @input="onProductQueryInput(line, index)"
                  @keydown="onProductKeydown($event, line, index)"
                  @blur="closeProductDropdownSoon"
                />
                <ul
                  v-if="activeProductIndex === index && filteredProducts(line.query).length > 0"
                  class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                >
                  <li
                    v-for="(p, pIndex) in filteredProducts(line.query)"
                    :key="p.id"
                    class="cursor-pointer px-3 py-2 text-sm text-gray-800 dark:text-gray-100"
                    :class="pIndex === highlightIndex ? 'bg-brand-50 dark:bg-brand-500/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'"
                    @mousedown.prevent="pickProduct(line, p, index)"
                  >
                    <span class="font-medium">{{ p.sku }}</span>
                    <span class="text-gray-500"> — {{ p.name }} ({{ p.brand.name }}) · stock {{ p.stock?.quantity ?? 0 }}</span>
                  </li>
                </ul>
                <p v-if="line.productId" class="mt-1 text-[11px] text-gray-500">
                  Seleccionado: {{ productLabel(line.productId) }}
                </p>
              </div>
              <div :data-tour="index === 0 ? 'sales-quantity' : undefined">
                <label class="mb-1 block text-xs text-gray-500">Cantidad</label>
                <input
                  v-model.number="line.quantity"
                  type="number"
                  min="1"
                  class="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  @keydown.enter.prevent="addLineAndFocus"
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

        <div
          data-tour="sales-total"
          class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800"
        >
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
              data-tour="sales-save"
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
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
import {
  TOUR_CLOSE_MODALS,
  TOUR_OPEN_SALES_MODAL,
} from '@/tours/tourEvents'

interface FormLine {
  productId: string
  query: string
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
const activeProductIndex = ref<number | null>(null)
const highlightIndex = ref(0)
const productInputRefs = ref<(HTMLInputElement | null)[]>([])
const showProductSearch = ref(false)
const productSearchQuery = ref('')
const searchHighlightIndex = ref(0)
const productSearchInputRef = ref<HTMLInputElement | null>(null)
let blurCloseTimer: ReturnType<typeof setTimeout> | null = null

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

const searchResults = computed(() => filteredProducts(productSearchQuery.value))

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
  return { productId: '', query: '', quantity: 1, discount: 0, commission: 0, unitPrice: 0 }
}

function productById(productId: string) {
  return products.value.find((p) => p.id === productId)
}

function productPrice(productId: string) {
  const product = productById(productId)
  return product?.price ? Number(product.price) : 0
}

function productLabel(productId: string) {
  const product = productById(productId)
  if (!product) return ''
  return `${product.sku} — ${product.name}`
}

function filteredProducts(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return products.value.slice(0, 40)
  return products.value
    .filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.name.toLowerCase().includes(q),
    )
    .slice(0, 40)
}

function resolveProduct(query: string): Product | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  const exactSku = products.value.find((p) => p.sku.toLowerCase() === q)
  if (exactSku) return exactSku
  const matches = filteredProducts(query)
  return matches[highlightIndex.value] ?? matches[0]
}

function setProductInputRef(index: number, el: unknown) {
  productInputRefs.value[index] = (el as HTMLInputElement | null) ?? null
}

function focusProductInput(index: number) {
  const input = productInputRefs.value[index]
  if (!input) return
  input.focus()
  input.select()
}

function openProductDropdown(index: number) {
  if (blurCloseTimer) {
    clearTimeout(blurCloseTimer)
    blurCloseTimer = null
  }
  activeProductIndex.value = index
  highlightIndex.value = 0
}

function closeProductDropdownSoon() {
  blurCloseTimer = setTimeout(() => {
    activeProductIndex.value = null
  }, 120)
}

function onProductQueryInput(line: FormLine, index: number) {
  line.productId = ''
  line.unitPrice = 0
  openProductDropdown(index)
  highlightIndex.value = 0
}

function selectProduct(line: FormLine, product: Product) {
  line.productId = product.id
  line.query = `${product.sku} — ${product.name}`
  line.unitPrice = product.price ? Number(product.price) : 0
  activeProductIndex.value = null
}

function pickProduct(line: FormLine, product: Product, index: number) {
  selectProduct(line, product)
  focusProductInput(index)
}

async function addLineAndFocus() {
  addLine()
  await nextTick()
  focusProductInput(form.lines.length - 1)
}

async function onProductEnter(line: FormLine, index: number) {
  if (!line.productId) {
    const product = resolveProduct(line.query)
    if (!product) {
      formError.value = 'No se encontró un producto con ese SKU o nombre'
      return
    }
    selectProduct(line, product)
  }
  formError.value = ''
  await addLineAndFocus()
}

function onProductKeydown(event: KeyboardEvent, line: FormLine, index: number) {
  const matches = filteredProducts(line.query)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    openProductDropdown(index)
    if (matches.length === 0) return
    highlightIndex.value = (highlightIndex.value + 1) % matches.length
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    openProductDropdown(index)
    if (matches.length === 0) return
    highlightIndex.value = (highlightIndex.value - 1 + matches.length) % matches.length
    return
  }
  if (event.key === 'Escape') {
    activeProductIndex.value = null
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    void onProductEnter(line, index)
  }
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
  productInputRefs.value.splice(index, 1)
  if (activeProductIndex.value === index) activeProductIndex.value = null
}

async function openProductSearch() {
  showProductSearch.value = true
  productSearchQuery.value = ''
  searchHighlightIndex.value = 0
  await nextTick()
  productSearchInputRef.value?.focus()
}

function closeProductSearch() {
  showProductSearch.value = false
  productSearchQuery.value = ''
  searchHighlightIndex.value = 0
}

function moveSearchHighlight(delta: number) {
  const total = searchResults.value.length
  if (total === 0) return
  searchHighlightIndex.value = (searchHighlightIndex.value + delta + total) % total
}

function confirmHighlightedSearchProduct() {
  const product = searchResults.value[searchHighlightIndex.value]
  if (product) addProductFromSearch(product)
}

async function addProductFromSearch(product: Product) {
  const last = form.lines[form.lines.length - 1]
  let targetIndex: number

  if (last && !last.productId && !last.query.trim()) {
    selectProduct(last, product)
    targetIndex = form.lines.length - 1
  } else {
    const line = emptyLine()
    selectProduct(line, product)
    form.lines.push(line)
    targetIndex = form.lines.length - 1
  }

  formError.value = ''
  closeProductSearch()
  await nextTick()
  focusProductInput(targetIndex)
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
  activeProductIndex.value = null
  closeProductSearch()
  showModal.value = true
  void nextTick(() => focusProductInput(0))
}

function closeCreate() {
  showModal.value = false
  formError.value = ''
  activeProductIndex.value = null
  closeProductSearch()
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

  // Enter suele dejar una línea vacía al final; se ignora al guardar
  while (form.lines.length > 1) {
    const last = form.lines[form.lines.length - 1]
    if (last.productId || last.query.trim()) break
    form.lines.pop()
  }

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

onMounted(() => {
  load()
  window.addEventListener(TOUR_OPEN_SALES_MODAL, openCreate)
  window.addEventListener(TOUR_CLOSE_MODALS, closeCreate)
})

onUnmounted(() => {
  window.removeEventListener(TOUR_OPEN_SALES_MODAL, openCreate)
  window.removeEventListener(TOUR_CLOSE_MODALS, closeCreate)
})
</script>
