<template>
  <admin-layout>
    <page-breadcrumb page-title="Ventas/Tickets" />

    <component-card title="Registro de ventas">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div v-if="auth.isAdmin" class="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-gray-700">
          <button
            v-for="t in viewTabs"
            :key="t.id"
            type="button"
            class="px-3 py-1.5 font-medium"
            :class="view === t.id ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'"
            :aria-pressed="view === t.id"
            @click="setView(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
        <button
          v-if="auth.isAdmin"
          data-tour="sales-create"
          class="ui-btn ui-btn-primary ml-auto"
          @click="goToCaja"
        >
          Registrar venta
        </button>
      </div>

      <form class="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end" @submit.prevent="applyFilters">
        <label class="text-xs text-gray-500">
          Desde
          <input
            v-model="filters.from"
            type="date"
            :max="filters.to || undefined"
            class="ui-input mt-1 w-full"
            @change="applyFilters"
          />
        </label>
        <label class="text-xs text-gray-500">
          Hasta
          <input
            v-model="filters.to"
            type="date"
            :min="filters.from || undefined"
            class="ui-input mt-1 w-full"
            @change="applyFilters"
          />
        </label>
        <label v-if="view === 'sales'" class="col-span-2 text-xs text-gray-500 sm:min-w-56 sm:flex-1">
          Buscar
          <input
            v-model="filters.q"
            type="search"
            :placeholder="auth.isAdmin ? 'Ticket, cliente, producto o SKU' : 'Ticket, producto o SKU'"
            class="ui-input mt-1 w-full"
            @input="scheduleFilters"
          />
        </label>
        <button
          v-if="hasFilters"
          type="button"
          class="ui-btn ui-btn-secondary col-span-2 sm:col-span-1"
          @click="clearFilters"
        >
          Limpiar filtros
        </button>
      </form>

      <div
        v-if="loadError"
        class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        role="alert"
      >
        <span>{{ loadError }}</span>
        <button type="button" class="font-medium underline" @click="load">Reintentar</button>
      </div>
      <p v-if="actionError" class="mb-3 text-sm text-error-500" role="alert">{{ actionError }}</p>
      <p v-if="notice" class="mb-3 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400" role="status">
        {{ notice }}
      </p>

      <!-- Ventas vigentes, agrupadas por ticket -->
      <div v-if="view === 'sales'" data-tour="sales-table" class="space-y-3">
        <p v-if="loading && sales.length === 0" class="py-8 text-center text-sm text-gray-500">Cargando ventas…</p>
        <p v-else-if="sales.length === 0 && !loadError" class="py-8 text-center text-sm text-gray-500">
          <template v-if="hasFilters">No hay ventas con esos filtros.</template>
          <template v-else>
            Aún no hay ventas registradas.
            <template v-if="auth.isAdmin">Regístralas desde Caja.</template>
          </template>
        </p>

        <article
          v-for="sale in sales"
          :key="sale.id"
          class="rounded-xl border border-gray-200 dark:border-gray-800"
        >
          <header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div class="min-w-0">
              <p class="font-semibold text-gray-800 dark:text-white">
                Ticket #{{ sale.ticketNumber }}
                <span class="ml-1 text-xs font-normal text-gray-500">{{ formatDateTime(sale.soldAt) }}</span>
              </p>
              <p class="break-words text-xs text-gray-500">
                {{ PAYMENT_LABELS[sale.paymentMethod] }}
                <template v-if="sale.customer"> · {{ sale.customer.name }}</template>
                <template v-if="attendedBy(sale)"> · atendió {{ attendedBy(sale) }}</template>
                <template v-if="sale.layawayId"> · de apartado</template>
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-base font-semibold text-gray-800 dark:text-white">
                ${{ formatMoney(saleAmount(sale)) }}
              </span>
              <template v-if="auth.isAdmin">
                <button
                  type="button"
                  class="ui-btn ui-btn-secondary ui-btn-sm"
                  @click="ticketSale = sale"
                >
                  Ver ticket
                </button>
                <button
                  v-if="!sale.layawayId"
                  type="button"
                  class="ui-btn ui-btn-danger ui-btn-sm"
                  @click="openCancel(sale)"
                >
                  Cancelar
                </button>
              </template>
            </div>
          </header>

          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left text-xs text-gray-500 dark:text-gray-400">
                  <th class="px-4 py-2 font-medium">Producto</th>
                  <th v-if="auth.isAdmin" class="py-2 pr-4 font-medium">Marca</th>
                  <th class="py-2 pr-4 font-medium">Cant.</th>
                  <th class="py-2 pr-4 font-medium">Descuento</th>
                  <th class="py-2 pr-4 font-medium">Total</th>
                  <th class="py-2 pr-4 font-medium" title="Incluida en liquidación de corte">En corte</th>
                  <th class="py-2 pr-4 font-medium" title="La marca ya cobró esta línea">Pagado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="line in sale.lines" :key="line.id" class="border-t border-gray-100 dark:border-gray-800">
                  <td class="px-4 py-2 text-gray-800 dark:text-white">
                    {{ line.product.name }}
                    <span class="block text-xs text-gray-500">{{ line.product.sku }}</span>
                  </td>
                  <td v-if="auth.isAdmin" class="py-2 pr-4 text-gray-600 dark:text-gray-300">
                    {{ line.product.brand.name }}
                  </td>
                  <td class="py-2 pr-4 text-gray-800 dark:text-white">{{ line.quantity }}</td>
                  <td class="py-2 pr-4 text-gray-800 dark:text-white">${{ line.discount }}</td>
                  <td class="py-2 pr-4 font-medium text-gray-800 dark:text-white">${{ line.total }}</td>
                  <td v-for="flag in lineFlags" :key="flag.field" class="py-2 pr-4">
                    <button
                      v-if="auth.isAdmin"
                      type="button"
                      class="rounded px-2 py-1 text-sm font-medium underline decoration-dotted underline-offset-4 disabled:opacity-50"
                      :class="line[flag.field] ? 'text-success-500' : 'text-gray-500'"
                      :aria-pressed="line[flag.field]"
                      :aria-label="`Ticket ${sale.ticketNumber}, ${line.product.name}: ${flag.label}`"
                      :disabled="togglingId === line.id"
                      @click="toggleFlag(line, flag.field)"
                    >
                      {{ line[flag.field] ? 'Sí' : 'No' }}
                    </button>
                    <span v-else :class="line[flag.field] ? 'text-success-500' : 'text-gray-500'">
                      {{ line[flag.field] ? 'Sí' : 'No' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </div>

      <!-- Ventas canceladas -->
      <div v-else class="space-y-3">
        <p v-if="loading && cancelled.length === 0" class="py-8 text-center text-sm text-gray-500">Cargando…</p>
        <p v-else-if="cancelled.length === 0 && !loadError" class="py-8 text-center text-sm text-gray-500">
          No hay ventas canceladas{{ hasFilters ? ' en esas fechas' : '' }}.
        </p>
        <article
          v-for="c in cancelled"
          :key="c.id"
          class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800"
        >
          <div class="min-w-0">
            <p class="font-semibold text-gray-800 dark:text-white">
              Ticket #{{ c.ticketNumber }}
              <span class="ml-1 text-xs font-normal text-gray-500">vendido {{ formatDateTime(c.soldAt) }}</span>
            </p>
            <p class="break-words text-xs text-gray-500">
              Cancelado {{ formatDateTime(c.cancelledAt) }}
              <template v-if="c.cancelledByName"> por {{ c.cancelledByName }}</template>
              <template v-if="c.customerName"> · {{ c.customerName }}</template>
            </p>
            <p v-if="c.reason" class="break-words text-xs text-gray-600 dark:text-gray-300">Motivo: {{ c.reason }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-base font-semibold text-gray-500 line-through">${{ formatMoney(Number(c.total)) }}</span>
            <button
              type="button"
              class="ui-btn ui-btn-secondary ui-btn-sm"
              @click="openCancelledTicket(c)"
            >
              Ver ticket
            </button>
          </div>
        </article>
      </div>

      <div v-if="total > pageSize" class="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300">
        <button
          type="button"
          class="ui-btn ui-btn-secondary ui-btn-sm"
          :disabled="page <= 1 || loading"
          @click="goTo(page - 1)"
        >
          Anterior
        </button>
        <span>Página {{ page }} de {{ pageCount }} · {{ total }} {{ view === 'sales' ? 'tickets' : 'canceladas' }}</span>
        <button
          type="button"
          class="ui-btn ui-btn-secondary ui-btn-sm"
          :disabled="page >= pageCount || loading"
          @click="goTo(page + 1)"
        >
          Siguiente
        </button>
      </div>
    </component-card>

    <sale-ticket
      v-if="ticketSale"
      :sale="ticketSale"
      :cancelled="ticketIsCancelled"
      @close="closeTicket"
    />

    <!-- Confirmar cancelación -->
    <div
      v-if="cancelTarget"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Cancelar venta"
      @click.self="cancelTarget = null"
      @keydown.esc="cancelTarget = null"
    >
      <form class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900" @submit.prevent="confirmCancel">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
          Cancelar ticket #{{ cancelTarget.ticketNumber }}
        </h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Se cancela la venta completa por ${{ formatMoney(Number(cancelTarget.total ?? 0)) }}: las piezas regresan al
          inventario y la venta deja de contar en reportes y cortes. No se puede deshacer.
        </p>
        <p v-if="Number(cancelTarget.giftCardAmount ?? 0) > 0" class="mt-2 text-sm text-warning-600">
          Esta venta usó ${{ formatMoney(Number(cancelTarget.giftCardAmount)) }} de una tarjeta de regalo. Ese saldo no
          se repone automáticamente.
        </p>
        <label class="mt-4 block text-sm text-gray-600 dark:text-gray-300">
          Motivo (opcional)
          <input
            ref="reasonInput"
            v-model="cancelReason"
            type="text"
            maxlength="500"
            placeholder="Ej. Devolución, error al cobrar"
            class="ui-input mt-1 w-full"
          />
        </label>
        <p v-if="cancelError" class="mt-3 text-sm text-error-500" role="alert">{{ cancelError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="ui-btn ui-btn-secondary"
            @click="cancelTarget = null"
          >
            Conservar venta
          </button>
          <button
            type="submit"
            class="ui-btn ui-btn-destructive"
            :disabled="cancelling"
          >
            {{ cancelling ? 'Cancelando…' : 'Cancelar venta' }}
          </button>
        </div>
      </form>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import SaleTicket from '@/components/pos/SaleTicket.vue'
import api, { type Sale, type SaleLine } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatMoney } from '@/composables/useCajaSession'
import {
  PAYMENT_LABELS,
  cancelSale,
  dayBoundary,
  fetchCancelledSales,
  fetchSalesPage,
  formatDateTime,
  posError,
  type CancelledSale,
} from '@/services/pos'

type View = 'sales' | 'cancelled'

const auth = useAuthStore()
const router = useRouter()

const viewTabs: Array<{ id: View; label: string }> = [
  { id: 'sales', label: 'Ventas' },
  { id: 'cancelled', label: 'Canceladas' },
]
const lineFlags: Array<{ field: 'inSettlement' | 'paid'; label: string }> = [
  { field: 'inSettlement', label: 'en corte' },
  { field: 'paid', label: 'pagada a la marca' },
]

const view = ref<View>('sales')
const sales = ref<Sale[]>([])
const cancelled = ref<CancelledSale[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const loading = ref(true)
const loadError = ref('')
const actionError = ref('')
const notice = ref('')
const togglingId = ref<string | null>(null)
const filters = reactive({ from: '', to: '', q: '' })
let loadSeq = 0
let timer: ReturnType<typeof setTimeout> | null = null

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
const hasFilters = computed(() => !!(filters.from || filters.to || filters.q.trim()))

function attendedBy(sale: Sale): string {
  return sale.attendedBy?.name || sale.attendedByUser?.name || ''
}

/** El negocio ve el total del ticket; una marca, solo la suma de sus líneas. */
function saleAmount(sale: Sale): number {
  if (auth.isAdmin) return Number(sale.total ?? 0)
  return sale.lines.reduce((acc, l) => acc + Number(l.total), 0)
}

function goToCaja() {
  void router.push('/caja')
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  const range = { from: dayBoundary(filters.from), to: dayBoundary(filters.to, true) }
  try {
    if (view.value === 'sales') {
      const data = await fetchSalesPage({ ...range, q: filters.q.trim() || undefined, page: page.value, pageSize })
      if (seq !== loadSeq) return
      sales.value = data.items
      total.value = data.total
    } else {
      const data = await fetchCancelledSales({ ...range, page: page.value })
      if (seq !== loadSeq) return
      cancelled.value = data.items
      total.value = data.total
    }
  } catch (e) {
    if (seq !== loadSeq) return
    loadError.value = posError(e, 'No se pudieron cargar las ventas.')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function applyFilters() {
  if (timer) clearTimeout(timer)
  page.value = 1
  void load()
}

function scheduleFilters() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(applyFilters, 300)
}

function clearFilters() {
  filters.from = ''
  filters.to = ''
  filters.q = ''
  applyFilters()
}

function setView(v: View) {
  if (view.value === v) return
  view.value = v
  total.value = 0
  notice.value = ''
  actionError.value = ''
  applyFilters()
}

function goTo(p: number) {
  page.value = p
  void load()
}

async function toggleFlag(line: SaleLine, field: 'inSettlement' | 'paid') {
  if (togglingId.value) return
  actionError.value = ''
  togglingId.value = line.id
  const next = !line[field]
  try {
    await api.patch(`/sales/lines/${line.id}`, { [field]: next })
    line[field] = next
  } catch (e) {
    actionError.value = posError(e, 'No se pudo actualizar la venta. Intenta de nuevo.')
  } finally {
    togglingId.value = null
  }
}

// ── Ticket ──
const ticketSale = ref<Sale | null>(null)
const ticketIsCancelled = ref(false)

function openCancelledTicket(c: CancelledSale) {
  ticketIsCancelled.value = true
  ticketSale.value = c.snapshot
}

function closeTicket() {
  ticketSale.value = null
  ticketIsCancelled.value = false
}

// ── Cancelación ──
const cancelTarget = ref<Sale | null>(null)
const cancelReason = ref('')
const cancelError = ref('')
const cancelling = ref(false)
const reasonInput = ref<HTMLInputElement | null>(null)

function openCancel(sale: Sale) {
  cancelTarget.value = sale
  cancelReason.value = ''
  cancelError.value = ''
  void nextTick(() => reasonInput.value?.focus())
}

async function confirmCancel() {
  const sale = cancelTarget.value
  if (!sale || cancelling.value) return
  cancelling.value = true
  cancelError.value = ''
  try {
    const result = await cancelSale(sale.id, cancelReason.value.trim())
    cancelTarget.value = null
    const gift = Number(result.giftCardAmountToRestore ?? 0)
    notice.value =
      `Ticket #${sale.ticketNumber} cancelado; las piezas regresaron al inventario.` +
      (gift > 0 ? ` Recuerda reponer $${formatMoney(gift)} a la tarjeta de regalo.` : '')
    await load()
  } catch (e) {
    cancelError.value = posError(e, 'No se pudo cancelar la venta')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
