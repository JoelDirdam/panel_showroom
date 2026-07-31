<template>
  <admin-layout>
    <page-breadcrumb page-title="Caja" />

    <div class="mb-4 flex flex-wrap items-center gap-2" data-tour="caja-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition"
        :class="
          tab.id === activeId
            ? 'border-brand-500 bg-brand-500 text-white'
            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
        "
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
        <span
          class="rounded px-1 text-xs opacity-80 hover:bg-black/10"
          title="Cerrar"
          @click.stop="closeTab(tab.id)"
        >
          ×
        </span>
      </button>
      <button
        type="button"
        class="rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
        :disabled="tabs.length >= MAX_CAJAS"
        @click="addTab"
      >
        + Nueva caja
      </button>
      <span class="ml-auto text-xs text-gray-500">{{ tabs.length }}/{{ MAX_CAJAS }} abiertas</span>
    </div>

    <div class="grid gap-4 xl:grid-cols-3">
      <!-- Columna izquierda -->
      <div class="space-y-4 xl:col-span-2">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white">
            Buscar o escanear producto
          </h3>
          <div class="relative" data-tour="caja-search">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              type="text"
              class="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              placeholder="Escanea o busca por código, nombre o marca"
              autocomplete="off"
              @input="scheduleSearch"
              @keydown="onSearchKeydown"
              @focus="showSearchDropdown = true"
            />
            <ul
              v-if="showSearchDropdown && searchResults.length"
              class="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            >
              <li
                v-for="(p, i) in searchResults"
                :key="p.id"
                class="cursor-pointer px-4 py-2 text-sm"
                :class="i === searchHighlight ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'"
                @mousedown.prevent="pickSearchProduct(p)"
              >
                <span class="font-medium text-gray-800 dark:text-white">{{ p.name }}</span>
                <span class="ml-2 text-xs text-gray-500">{{ p.sku }} · {{ p.brand.name }}</span>
                <span class="float-right text-xs text-gray-500">
                  ${{ formatMoney(Number(p.price || 0)) }} · stock {{ p.stock?.quantity ?? 0 }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          data-tour="caja-cart"
        >
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Artículos en venta</h3>
            <span class="text-xs text-gray-500">
              {{ activeTab.lines.reduce((s, l) => s + l.quantity, 0) }} Productos totales
            </span>
          </div>

          <div v-if="activeTab.lines.length === 0" class="py-12 text-center text-sm text-gray-500">
            Agrega productos o apartados para comenzar
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="line in activeTab.lines"
              :key="line.productId"
              class="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-medium text-gray-800 dark:text-white">{{ line.name }}</p>
                  <p class="text-xs uppercase tracking-wide text-gray-500">
                    Marca: {{ line.brandName }}
                  </p>
                  <p class="text-xs text-gray-500">Stock disponible: {{ line.stock }}</p>
                </div>
                <p class="text-lg font-semibold text-gray-800 dark:text-white">
                  ${{ formatMoney(Math.max(0, line.unitPrice * line.quantity - line.discount)) }}
                </p>
              </div>
              <div class="mt-3 flex flex-wrap items-end gap-3">
                <label class="text-xs text-gray-500">
                  Descuento ($)
                  <input
                    v-model.number="line.discount"
                    type="number"
                    min="0"
                    step="0.01"
                    class="mt-1 w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </label>
                <div class="text-xs text-gray-500">
                  Cantidad
                  <div class="mt-1 flex items-center gap-1">
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg border border-gray-300 dark:border-gray-700"
                      @click="line.quantity = Math.max(1, line.quantity - 1)"
                    >
                      −
                    </button>
                    <input
                      v-model.number="line.quantity"
                      type="number"
                      min="1"
                      :max="line.stock || undefined"
                      class="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      class="h-8 w-8 rounded-lg border border-gray-300 dark:border-gray-700"
                      @click="line.quantity = Math.min(line.stock || line.quantity + 1, line.quantity + 1)"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  class="ml-auto rounded-lg border border-error-500 px-3 py-1.5 text-sm text-error-500 hover:bg-error-50"
                  @click="removeLine(line.productId)"
                >
                  Quitar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Resumen -->
      <div class="space-y-4">
        <div
          class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
          data-tour="caja-summary"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Resumen rápido</h3>
            <span class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10">
              Ticket
            </span>
          </div>

          <label class="mb-1 block text-xs text-gray-500">Atiende</label>
          <select
            v-model="activeTab.attendedById"
            data-tour="caja-attendant"
            class="mb-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
          </select>
          <p class="mb-4 text-xs text-gray-500">
            {{ attendantLabel }}
          </p>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal sin descuentos</span>
              <span>${{ formatMoney(grossSubtotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Total con descuentos</span>
              <span>${{ formatMoney(subtotalWithDiscount) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-600 dark:text-gray-300">Aplicar IVA (16%)</span>
              <button
                type="button"
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="
                  activeTab.applyTax
                    ? 'bg-success-500 text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                "
                @click="activeTab.applyTax = !activeTab.applyTax"
              >
                {{ activeTab.applyTax ? 'Activado' : 'Desactivado' }}
              </button>
            </div>
            <div v-if="activeTab.applyTax" class="flex justify-between text-gray-600 dark:text-gray-300">
              <span>IVA (16%)</span>
              <span>${{ formatMoney(taxAmount) }}</span>
            </div>
            <div
              v-if="activeTab.giftCardApplied > 0"
              class="flex justify-between text-success-600"
            >
              <span>Tarjeta de regalo</span>
              <span>−${{ formatMoney(activeTab.giftCardApplied) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white">
              <span>Total a pagar</span>
              <span data-tour="caja-total">${{ formatMoney(totalToPay) }}</span>
            </div>
          </div>

          <div class="mt-5 rounded-xl bg-gray-50 p-3 dark:bg-gray-900/50">
            <p class="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Conversor pesos a dólares
            </p>
            <label class="text-xs text-gray-500">
              Monto en pesos
              <input
                v-model.number="activeTab.converterPesos"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <div class="mt-2 flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                @click="activeTab.converterPesos = totalToPay"
              >
                Usar total
              </button>
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                @click="activeTab.converterPesos = changeDue"
              >
                Usar cambio
              </button>
            </div>
            <p class="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Equivalente en USD: ${{ formatMoney((activeTab.converterPesos || 0) / USD_RATE) }} USD
              <span class="text-gray-400">(tasa {{ USD_RATE }})</span>
            </p>
          </div>

          <div v-if="activeTab.paymentMethod === 'EFECTIVO'" class="mt-4">
            <label class="text-xs text-gray-500">
              Efectivo recibido
              <input
                v-model.number="activeTab.cashReceived"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <p v-if="changeDue > 0" class="mt-1 text-xs text-success-600">
              Cambio: ${{ formatMoney(changeDue) }}
            </p>
          </div>

          <button
            type="button"
            class="mt-4 w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            :disabled="saving || activeTab.lines.length === 0"
            @click="createLayaway"
          >
            + Crear apartado
          </button>

          <p class="mb-2 mt-4 text-xs font-medium text-gray-600 dark:text-gray-300">Forma de pago</p>
          <div class="grid grid-cols-2 gap-2" data-tour="caja-payment">
            <button
              v-for="opt in paymentOptions"
              :key="opt.value"
              type="button"
              class="rounded-xl border px-3 py-3 text-sm font-medium transition"
              :class="
                activeTab.paymentMethod === opt.value
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-400'
              "
              @click="activeTab.paymentMethod = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>

          <div
            v-if="activeTab.paymentMethod === 'MIXTO'"
            class="mt-3 space-y-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800"
          >
            <label
              v-for="field in mixedFields"
              :key="field.key"
              class="block text-xs text-gray-500"
            >
              {{ field.label }}
              <input
                v-model.number="activeTab.mixed[field.key]"
                type="number"
                min="0"
                step="0.01"
                class="mt-1 w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
            <p class="text-xs" :class="mixedOk ? 'text-success-600' : 'text-error-500'">
              Suma: ${{ formatMoney(mixedSum) }} / ${{ formatMoney(totalToPay) }}
            </p>
          </div>

          <button
            type="button"
            data-tour="caja-confirm"
            class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="saving || activeTab.lines.length === 0"
            @click="confirmSale"
          >
            Confirmar compra
          </button>

          <p v-if="formError" class="mt-3 text-sm text-error-500">{{ formError }}</p>
          <p v-if="successMsg" class="mt-3 text-sm text-success-600">{{ successMsg }}</p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h4 class="mb-2 text-sm font-semibold text-gray-800 dark:text-white">Descuentos aplicados</h4>
          <p v-if="discountTotal <= 0" class="text-sm text-gray-500">No hay descuentos aplicados</p>
          <p v-else class="text-sm text-gray-700 dark:text-gray-300">
            Total descuentos: ${{ formatMoney(discountTotal) }}
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Código de tarjeta de regalo
          </label>
          <div class="flex gap-2">
            <input
              v-model="activeTab.giftCardCode"
              type="text"
              placeholder="Escanea o ingresa el código"
              class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
              @click="applyGiftCard"
            >
              Aplicar
            </button>
          </div>
          <p v-if="giftMsg" class="mt-1 text-xs text-gray-500">{{ giftMsg }}</p>

          <label class="mb-1 mt-4 block text-xs font-medium text-gray-600 dark:text-gray-300">
            Cliente frecuente
          </label>
          <div class="relative">
            <input
              v-model="customerQuery"
              type="text"
              placeholder="Nombre o teléfono"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              @input="searchCustomers"
              @keydown.enter.prevent="createOrSelectCustomer"
            />
            <ul
              v-if="customerResults.length"
              class="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow dark:border-gray-700 dark:bg-gray-900"
            >
              <li
                v-for="c in customerResults"
                :key="c.id"
                class="cursor-pointer px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                @mousedown.prevent="selectCustomer(c)"
              >
                {{ c.name }}
                <span v-if="c.phone" class="text-xs text-gray-500">· {{ c.phone }}</span>
              </li>
            </ul>
          </div>
          <p v-if="activeTab.customerLabel" class="mt-1 text-xs text-brand-600">
            Seleccionado: {{ activeTab.customerLabel }}
            <button type="button" class="ml-2 underline" @click="clearCustomer">Quitar</button>
          </p>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h4 class="mb-1 text-sm font-semibold text-gray-800 dark:text-white">Comentario en ticket</h4>
          <p class="mb-2 text-xs text-gray-500">
            Agrega notas internas que se guardarán junto con la venta y aparecerán en el ticket
            impreso.
          </p>
          <textarea
            v-model="activeTab.ticketComment"
            maxlength="500"
            rows="3"
            placeholder="Ej. Cliente solicita entregar mañana por la tarde"
            class="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <p class="mt-1 text-xs text-gray-400">
            Máximo 500 caracteres · {{ activeTab.ticketComment.length }}/500
          </p>
        </div>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import api, {
  type CreateLayawayPayload,
  type CreateSalePayload,
  type Customer,
  type GiftCardPreview,
  type PaymentMethod,
  type Product,
  type Sale,
  type TenantUser,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import {
  MAX_CAJAS,
  USD_RATE,
  formatMoney,
  round2,
  useCajaSession,
} from '@/composables/useCajaSession'

const auth = useAuthStore()
const {
  tabs,
  activeId,
  activeTab,
  addTab,
  closeTab,
  selectTab,
  resetTab,
  addProduct,
  removeLine,
  grossSubtotal,
  discountTotal,
  subtotalWithDiscount,
  taxAmount,
  totalBeforeGift,
  totalToPay,
  changeDue,
  mixedPayments,
} = useCajaSession(() => auth.user?.id || '')

const users = ref<TenantUser[]>([])
const searchQuery = ref('')
const searchResults = ref<Product[]>([])
const showSearchDropdown = ref(false)
const searchHighlight = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const saving = ref(false)
const formError = ref('')
const successMsg = ref('')
const giftMsg = ref('')
const customerQuery = ref('')
const customerResults = ref<Customer[]>([])
let customerTimer: ReturnType<typeof setTimeout> | null = null

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TARJETA', label: 'Tarjeta' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
  { value: 'MIXTO', label: 'Mixto' },
]

const mixedFields = [
  { key: 'efectivo' as const, label: 'Efectivo' },
  { key: 'tarjeta' as const, label: 'Tarjeta' },
  { key: 'transferencia' as const, label: 'Transferencia' },
]

const mixedSum = computed(() =>
  round2(
    (activeTab.value.mixed.efectivo || 0) +
      (activeTab.value.mixed.tarjeta || 0) +
      (activeTab.value.mixed.transferencia || 0),
  ),
)

const mixedOk = computed(() => Math.abs(mixedSum.value - totalToPay.value) < 0.01)

const attendantLabel = computed(() => {
  const u = users.value.find((x) => x.id === activeTab.value.attendedById)
  if (!u) return ''
  return `${u.name} · ${u.role === 'ADMIN' ? 'Propietario' : 'Marca'}`
})

function scheduleSearch() {
  if (searchTimer.value) clearTimeout(searchTimer.value)
  searchTimer.value = setTimeout(() => void runSearch(), 200)
}

async function runSearch() {
  const q = searchQuery.value.trim()
  if (!q) {
    searchResults.value = []
    return
  }
  const { data } = await api.get<Product[]>('/products', { params: { q } })
  searchResults.value = data.slice(0, 30)
  searchHighlight.value = 0
  showSearchDropdown.value = true
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (!searchResults.value.length) return
    searchHighlight.value = (searchHighlight.value + 1) % searchResults.value.length
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (!searchResults.value.length) return
    searchHighlight.value =
      (searchHighlight.value - 1 + searchResults.value.length) % searchResults.value.length
    return
  }
  if (e.key === 'Escape') {
    showSearchDropdown.value = false
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    void commitSearch()
  }
}

async function commitSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  await runSearch()
  const exact = searchResults.value.find((p) => p.sku.toLowerCase() === q.toLowerCase())
  const pick = exact || searchResults.value[searchHighlight.value]
  if (!pick) {
    formError.value = 'No se encontró producto'
    return
  }
  pickSearchProduct(pick)
}

function pickSearchProduct(product: Product) {
  formError.value = ''
  addProduct(product)
  searchQuery.value = ''
  searchResults.value = []
  showSearchDropdown.value = false
  void nextTick(() => searchInputRef.value?.focus())
}

async function applyGiftCard() {
  giftMsg.value = ''
  const code = activeTab.value.giftCardCode.trim()
  if (!code) {
    giftMsg.value = 'Ingresa un código'
    return
  }
  try {
    const { data } = await api.post<GiftCardPreview>('/gift-cards/preview', {
      code,
      amountDue: totalBeforeGift.value,
    })
    activeTab.value.giftCardApplied = data.applicable
    giftMsg.value = `Saldo $${formatMoney(data.balance)} · se aplicarán $${formatMoney(data.applicable)}`
  } catch (e: unknown) {
    activeTab.value.giftCardApplied = 0
    const err = e as { response?: { data?: { error?: string } } }
    giftMsg.value = err.response?.data?.error || 'No se pudo aplicar'
  }
}

async function searchCustomers() {
  if (customerTimer) clearTimeout(customerTimer)
  customerTimer = setTimeout(async () => {
    const q = customerQuery.value.trim()
    if (!q) {
      customerResults.value = []
      return
    }
    const { data } = await api.get<Customer[]>('/customers', { params: { q } })
    customerResults.value = data
  }, 200)
}

function selectCustomer(c: Customer) {
  activeTab.value.customerId = c.id
  activeTab.value.customerLabel = c.phone ? `${c.name} (${c.phone})` : c.name
  customerQuery.value = ''
  customerResults.value = []
}

function clearCustomer() {
  activeTab.value.customerId = null
  activeTab.value.customerLabel = ''
}

async function createOrSelectCustomer() {
  const q = customerQuery.value.trim()
  if (!q) return
  if (customerResults.value[0]) {
    selectCustomer(customerResults.value[0])
    return
  }
  const looksPhone = /^\d[\d\s-]{5,}$/.test(q)
  const { data } = await api.post<Customer>('/customers', {
    name: looksPhone ? q : q,
    phone: looksPhone ? q.replace(/\s/g, '') : null,
  })
  selectCustomer(data)
}

function buildLinesPayload() {
  return activeTab.value.lines.map((l) => ({
    productId: l.productId,
    quantity: l.quantity,
    discount: l.discount || 0,
    unitPrice: l.unitPrice,
  }))
}

async function confirmSale() {
  formError.value = ''
  successMsg.value = ''
  if (activeTab.value.lines.length === 0) {
    formError.value = 'Agrega al menos un producto'
    return
  }
  if (activeTab.value.paymentMethod === 'MIXTO' && !mixedOk.value) {
    formError.value = 'Los montos del pago mixto deben sumar el total'
    return
  }

  const payload: CreateSalePayload = {
    paymentMethod: activeTab.value.paymentMethod,
    applyTax: activeTab.value.applyTax,
    taxRate: 0.16,
    ticketComment: activeTab.value.ticketComment || null,
    attendedById: activeTab.value.attendedById || auth.user?.id,
    customerId: activeTab.value.customerId,
    giftCardCode: activeTab.value.giftCardApplied > 0 ? activeTab.value.giftCardCode.trim() : null,
    lines: buildLinesPayload(),
    ...(activeTab.value.paymentMethod === 'MIXTO'
      ? { payments: mixedPayments() }
      : {}),
  }

  saving.value = true
  try {
    const { data } = await api.post<Sale>('/sales', payload)
    successMsg.value = `Venta registrada · ticket #${data.ticketNumber}`
    resetTab(activeTab.value.id)
    giftMsg.value = ''
    void nextTick(() => searchInputRef.value?.focus())
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo confirmar la compra'
  } finally {
    saving.value = false
  }
}

async function createLayaway() {
  formError.value = ''
  successMsg.value = ''
  if (activeTab.value.lines.length === 0) {
    formError.value = 'Agrega productos para el apartado'
    return
  }

  const payload: CreateLayawayPayload = {
    lines: buildLinesPayload(),
    applyTax: activeTab.value.applyTax,
    taxRate: 0.16,
    ticketComment: activeTab.value.ticketComment || null,
    customerId: activeTab.value.customerId,
  }

  saving.value = true
  try {
    const { data } = await api.post<{ code: string }>('/layaways', payload)
    successMsg.value = `Apartado creado · código ${data.code}`
    resetTab(activeTab.value.id)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo crear el apartado'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const { data } = await api.get<TenantUser[]>('/users')
  users.value = data
  if (!activeTab.value.attendedById && auth.user?.id) {
    activeTab.value.attendedById = auth.user.id
  }
  void nextTick(() => searchInputRef.value?.focus())
})
</script>
