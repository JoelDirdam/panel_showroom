<template>
  <admin-layout>
    <page-breadcrumb page-title="Clientes" />

    <component-card title="Directorio de clientes">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <input
          v-model="query"
          type="search"
          aria-label="Buscar cliente por nombre o teléfono"
          placeholder="Buscar por nombre o teléfono"
          class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          @input="scheduleLoad"
        />
        <button
          type="button"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openForm(null)"
        >
          + Nuevo cliente
        </button>
      </div>

      <div
        v-if="loadError"
        class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        role="alert"
      >
        <span>{{ loadError }}</span>
        <button type="button" class="font-medium underline" @click="load">Reintentar</button>
      </div>

      <p v-if="loading && customers.length === 0" class="py-8 text-center text-sm text-gray-500">
        Cargando clientes…
      </p>
      <p v-else-if="customers.length === 0 && !loadError" class="py-8 text-center text-sm text-gray-500">
        <template v-if="query.trim()">No hay clientes que coincidan con «{{ query.trim() }}».</template>
        <template v-else>
          Aún no tienes clientes. Agrégalos aquí o al cobrar en Caja para llevar su historial de compras.
        </template>
      </p>

      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="c in customers" :key="c.id">
          <button
            type="button"
            class="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 py-3 text-left hover:bg-gray-50 dark:hover:bg-white/[0.03]"
            @click="openDetail(c.id)"
          >
            <span class="min-w-0">
              <span class="block break-words font-medium text-gray-800 dark:text-white">{{ c.name }}</span>
              <span class="block text-xs text-gray-500">{{ c.phone || 'Sin teléfono' }}</span>
            </span>
            <span class="text-right text-xs text-gray-500">
              <span class="block text-sm font-medium text-gray-800 dark:text-white">
                ${{ formatMoney(c.totalSpent) }}
              </span>
              <span class="block">
                {{ c.purchases }} {{ c.purchases === 1 ? 'compra' : 'compras' }}
                <template v-if="c.lastPurchaseAt"> · última {{ formatDate(c.lastPurchaseAt) }}</template>
              </span>
            </span>
          </button>
        </li>
      </ul>

      <div v-if="total > pageSize" class="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          :disabled="page <= 1 || loading"
          @click="goTo(page - 1)"
        >
          Anterior
        </button>
        <span>Página {{ page }} de {{ pageCount }} · {{ total }} clientes</span>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          :disabled="page >= pageCount || loading"
          @click="goTo(page + 1)"
        >
          Siguiente
        </button>
      </div>
    </component-card>

    <!-- Ficha del cliente -->
    <div
      v-if="detailOpen"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Ficha del cliente"
      @click.self="closeDetail"
      @keydown.esc="closeDetail"
    >
      <div class="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <p v-if="detailLoading" class="py-10 text-center text-sm text-gray-500">Cargando ficha…</p>
        <div v-else-if="detailError" class="py-6 text-center text-sm text-error-500" role="alert">
          {{ detailError }}
          <button type="button" class="ml-2 underline" @click="closeDetail">Cerrar</button>
        </div>
        <template v-else-if="detail">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="break-words text-lg font-semibold text-gray-800 dark:text-white">{{ detail.name }}</h3>
              <p class="text-sm text-gray-500">
                {{ detail.phone || 'Sin teléfono' }} · Cliente desde {{ formatDate(detail.createdAt) }}
              </p>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                @click="openForm(detail)"
              >
                Editar
              </button>
              <button
                ref="closeDetailBtn"
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                @click="closeDetail"
              >
                Cerrar
              </button>
            </div>
          </div>

          <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Total gastado</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">${{ formatMoney(detail.totalSpent) }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Compras</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">{{ detail.purchases }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Ticket promedio</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">
                ${{ formatMoney(detail.purchases ? detail.totalSpent / detail.purchases : 0) }}
              </dd>
            </div>
          </dl>

          <template v-if="detail.layaways.length">
            <h4 class="mt-5 text-sm font-semibold text-gray-800 dark:text-white">Apartados</h4>
            <ul class="mt-2 divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <li v-for="l in detail.layaways" :key="l.id" class="flex flex-wrap justify-between gap-x-3 py-2">
                <span class="text-gray-800 dark:text-white">
                  {{ l.code }}
                  <span class="ml-1 text-xs text-gray-500">{{ layawayStatus(l.status) }} · {{ formatDate(l.createdAt) }}</span>
                </span>
                <span class="text-gray-600 dark:text-gray-300">
                  ${{ formatMoney(Number(l.total)) }}
                  <template v-if="l.status === 'OPEN'"> · debe ${{ formatMoney(Number(l.balance)) }}</template>
                </span>
              </li>
            </ul>
          </template>

          <h4 class="mt-5 text-sm font-semibold text-gray-800 dark:text-white">Historial de compras</h4>
          <p v-if="detail.sales.length === 0" class="mt-2 text-sm text-gray-500">
            Este cliente todavía no tiene compras registradas.
          </p>
          <ul v-else class="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="s in detail.sales" :key="s.id" class="py-2.5 text-sm">
              <div class="flex flex-wrap justify-between gap-x-3">
                <span class="font-medium text-gray-800 dark:text-white">
                  Ticket #{{ s.ticketNumber }}
                  <span class="ml-1 text-xs font-normal text-gray-500">
                    {{ formatDateTime(s.soldAt) }} · {{ PAYMENT_LABELS[s.paymentMethod] }}
                  </span>
                </span>
                <span class="font-medium text-gray-800 dark:text-white">${{ formatMoney(Number(s.total)) }}</span>
              </div>
              <p class="mt-0.5 break-words text-xs text-gray-500">
                {{ s.lines.map((l) => `${l.quantity} × ${l.product.name}`).join(', ') }}
              </p>
            </li>
          </ul>
          <p v-if="detail.sales.length >= 50" class="mt-2 text-xs text-gray-500">
            Se muestran las 50 compras más recientes.
          </p>
          <p v-if="detail.cancelledCount > 0" class="mt-2 text-xs text-gray-500">
            {{ detail.cancelledCount }} venta(s) cancelada(s) no se cuentan aquí.
          </p>
        </template>
      </div>
    </div>

    <!-- Alta / edición -->
    <div
      v-if="form.open"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      :aria-label="form.id ? 'Editar cliente' : 'Nuevo cliente'"
      @click.self="form.open = false"
      @keydown.esc="form.open = false"
    >
      <form class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900" @submit.prevent="save">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
          {{ form.id ? 'Editar cliente' : 'Nuevo cliente' }}
        </h3>
        <label class="mt-4 block text-sm text-gray-600 dark:text-gray-300">
          Nombre
          <input
            ref="nameInput"
            v-model="form.name"
            type="text"
            maxlength="200"
            autocomplete="off"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <label class="mt-3 block text-sm text-gray-600 dark:text-gray-300">
          Teléfono (opcional)
          <input
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            maxlength="40"
            autocomplete="off"
            class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <span class="mt-1 block text-xs text-gray-500">Sirve para encontrarlo en Caja y enviarle su ticket por WhatsApp.</span>
        </label>
        <p v-if="form.error" class="mt-3 text-sm text-error-500" role="alert">{{ form.error }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
            @click="form.open = false"
          >
            Cancelar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="form.saving"
          >
            {{ form.saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { formatMoney } from '@/composables/useCajaSession'
import {
  PAYMENT_LABELS,
  createCustomer,
  fetchCustomer,
  fetchCustomersPage,
  formatDate,
  formatDateTime,
  posError,
  updateCustomer,
  type CustomerDetail,
  type CustomerWithStats,
} from '@/services/pos'

const customers = ref<CustomerWithStats[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 25
const query = ref('')
const loading = ref(true)
const loadError = ref('')
let loadSeq = 0
let timer: ReturnType<typeof setTimeout> | null = null

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    const data = await fetchCustomersPage({ q: query.value.trim() || undefined, page: page.value, pageSize })
    if (seq !== loadSeq) return
    customers.value = data.items
    total.value = data.total
  } catch (e) {
    if (seq !== loadSeq) return
    loadError.value = posError(e, 'No se pudieron cargar los clientes.')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function scheduleLoad() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    page.value = 1
    void load()
  }, 250)
}

function goTo(p: number) {
  page.value = p
  void load()
}

// ── Ficha ──
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<CustomerDetail | null>(null)
const closeDetailBtn = ref<HTMLButtonElement | null>(null)

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await fetchCustomer(id)
    void nextTick(() => closeDetailBtn.value?.focus())
  } catch (e) {
    detailError.value = posError(e, 'No se pudo cargar la ficha del cliente.')
  } finally {
    detailLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
}

function layawayStatus(status: string) {
  return status === 'OPEN' ? 'Abierto' : status === 'COMPLETED' ? 'Liquidado' : 'Cancelado'
}

// ── Alta / edición ──
const form = reactive({ open: false, id: '' as string, name: '', phone: '', saving: false, error: '' })
const nameInput = ref<HTMLInputElement | null>(null)

function openForm(c: { id: string; name: string; phone: string | null } | null) {
  form.id = c?.id ?? ''
  form.name = c?.name ?? ''
  form.phone = c?.phone ?? ''
  form.error = ''
  form.open = true
  void nextTick(() => nameInput.value?.focus())
}

async function save() {
  const name = form.name.trim()
  if (!name) {
    form.error = 'Escribe el nombre del cliente'
    return
  }
  form.saving = true
  form.error = ''
  try {
    if (form.id) {
      await updateCustomer(form.id, { name, phone: form.phone.trim() || null })
      form.open = false
      if (detailOpen.value) void openDetail(form.id)
    } else {
      const { customer, existed } = await createCustomer({ name, phone: form.phone.trim() || null })
      if (existed) {
        form.error = `Ya tienes un cliente con ese teléfono: ${customer.name}`
        return
      }
      form.open = false
    }
    void load()
  } catch (e) {
    form.error = posError(e, 'No se pudo guardar el cliente')
  } finally {
    form.saving = false
  }
}

onMounted(() => {
  void load()
})
</script>
