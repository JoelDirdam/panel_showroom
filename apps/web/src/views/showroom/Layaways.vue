<template>
  <admin-layout>
    <page-breadcrumb page-title="Apartados" />

    <component-card title="Apartados">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div class="inline-flex overflow-hidden rounded-lg border border-gray-200 text-sm dark:border-gray-700">
          <button
            v-for="t in statusTabs"
            :key="t.id"
            type="button"
            class="px-3 py-1.5 font-medium"
            :class="status === t.id ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'"
            :aria-pressed="status === t.id"
            @click="setStatus(t.id)"
          >
            {{ t.label }}
          </button>
        </div>
        <input
          v-model="query"
          type="search"
          aria-label="Buscar apartado por código o cliente"
          placeholder="Código o cliente"
          class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          @input="scheduleLoad"
        />
      </div>

      <div
        v-if="loadError"
        class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        role="alert"
      >
        <span>{{ loadError }}</span>
        <button type="button" class="font-medium underline" @click="load">Reintentar</button>
      </div>
      <p v-if="notice" class="mb-3 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400" role="status">
        {{ notice }}
      </p>

      <p v-if="loading && layaways.length === 0" class="py-8 text-center text-sm text-gray-500">Cargando apartados…</p>
      <p v-else-if="layaways.length === 0 && !loadError" class="py-8 text-center text-sm text-gray-500">
        <template v-if="query.trim()">No hay apartados que coincidan.</template>
        <template v-else-if="status === 'OPEN'">
          No hay apartados abiertos. Se crean desde Caja con «Crear apartado».
        </template>
        <template v-else>No hay apartados en este estado.</template>
      </p>

      <div class="space-y-3">
        <article v-for="l in layaways" :key="l.id" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div class="min-w-0">
              <p class="font-semibold text-gray-800 dark:text-white">
                {{ l.code }}
                <span class="ml-1 text-xs font-medium" :class="statusClass(l.status)">{{ statusLabel(l.status) }}</span>
              </p>
              <p class="break-words text-xs text-gray-500">
                {{ l.customer?.name || 'Sin cliente' }}
                <template v-if="l.customer?.phone"> · {{ l.customer.phone }}</template>
                · creado {{ formatDate(l.createdAt) }}
                <template v-if="l.status === 'OPEN'">
                  ·
                  <span :class="isOverdue(l) ? 'font-medium text-error-500' : ''">
                    {{ isOverdue(l) ? 'venció' : 'vence' }} {{ formatDate(dueDate(l.createdAt)) }}
                  </span>
                </template>
                <template v-if="l.sale"> · ticket #{{ l.sale.ticketNumber }}</template>
              </p>
            </div>
            <div class="text-right text-sm">
              <p class="text-gray-600 dark:text-gray-300">Total ${{ formatMoney(Number(l.total)) }}</p>
              <p v-if="l.status === 'OPEN'" class="text-base font-semibold text-gray-800 dark:text-white">
                Debe ${{ formatMoney(Number(l.balance)) }}
              </p>
            </div>
          </div>

          <p class="mt-2 break-words text-sm text-gray-700 dark:text-gray-300">
            {{ l.lines.map((line) => `${line.quantity} × ${line.product.name}`).join(', ') }}
          </p>

          <p v-if="l.payments.length" class="mt-1 break-words text-xs text-gray-500">
            Abonos:
            {{ l.payments.map((p) => `$${formatMoney(Number(p.amount))} ${PAYMENT_LABELS[p.method].toLowerCase()} (${formatDate(p.createdAt)})`).join(' · ') }}
          </p>

          <div v-if="l.status === 'OPEN'" class="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
              @click="openPayment(l)"
            >
              Abonar / liquidar
            </button>
            <button
              type="button"
              class="rounded-lg border border-error-500 px-3 py-1.5 text-sm font-medium text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
              @click="openCancel(l)"
            >
              Cancelar apartado
            </button>
          </div>
        </article>
      </div>
      <p v-if="layaways.length >= 100" class="mt-3 text-xs text-gray-500">
        Se muestran los 100 más recientes; usa el buscador para encontrar otros.
      </p>
    </component-card>

    <!-- Abono -->
    <div
      v-if="payTarget"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar abono"
      @click.self="payTarget = null"
      @keydown.esc="payTarget = null"
    >
      <form class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900" @submit.prevent="confirmPayment">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Abono a {{ payTarget.code }}</h3>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Saldo pendiente: ${{ formatMoney(Number(payTarget.balance)) }}
        </p>
        <label class="mt-4 block text-sm text-gray-600 dark:text-gray-300">
          Monto
          <div class="mt-1 flex gap-2">
            <input
              ref="payInput"
              v-model.number="payAmount"
              type="number"
              inputmode="decimal"
              min="0.01"
              step="0.01"
              :max="Number(payTarget.balance)"
              class="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              @click="payAmount = Number(payTarget.balance)"
            >
              Liquidar todo
            </button>
          </div>
        </label>
        <fieldset class="mt-3">
          <legend class="text-sm text-gray-600 dark:text-gray-300">Forma de pago</legend>
          <div class="mt-1 grid grid-cols-3 gap-2">
            <button
              v-for="m in methods"
              :key="m"
              type="button"
              class="rounded-lg border px-2 py-2 text-sm font-medium"
              :class="payMethod === m ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'"
              :aria-pressed="payMethod === m"
              @click="payMethod = m"
            >
              {{ PAYMENT_LABELS[m] }}
            </button>
          </div>
        </fieldset>
        <p v-if="payWillSettle" class="mt-3 text-sm text-success-600">
          Con este abono el apartado queda liquidado y se genera su ticket de venta.
        </p>
        <p v-if="payError" class="mt-3 text-sm text-error-500" role="alert">{{ payError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
            @click="payTarget = null"
          >
            Cerrar
          </button>
          <button
            type="submit"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="paying"
          >
            {{ paying ? 'Registrando…' : 'Registrar abono' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Cancelación -->
    <div
      v-if="cancelTarget"
      class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-gray-900/60 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Cancelar apartado"
      @click.self="cancelTarget = null"
      @keydown.esc="cancelTarget = null"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Cancelar {{ cancelTarget.code }}</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Las piezas regresan al inventario y el apartado queda cancelado. No se puede deshacer.
        </p>
        <p v-if="paidOf(cancelTarget) > 0" class="mt-2 text-sm text-warning-600">
          El cliente ya abonó ${{ formatMoney(paidOf(cancelTarget)) }}. Ese dinero no se devuelve automáticamente: si lo
          reembolsas en efectivo, regístralo como retiro en el Corte de caja.
        </p>
        <p v-if="cancelError" class="mt-3 text-sm text-error-500" role="alert">{{ cancelError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            ref="keepBtn"
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
            @click="cancelTarget = null"
          >
            Conservar apartado
          </button>
          <button
            type="button"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:opacity-50"
            :disabled="cancelling"
            @click="confirmCancel"
          >
            {{ cancelling ? 'Cancelando…' : 'Cancelar apartado' }}
          </button>
        </div>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import type { LayawayStatus, SplitPaymentMethod } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatMoney, round2 } from '@/composables/useCajaSession'
import {
  PAYMENT_LABELS,
  addLayawayPayment,
  cancelLayaway,
  fetchLayaways,
  formatDate,
  posError,
  type LayawayFull,
} from '@/services/pos'

const auth = useAuthStore()

const statusTabs: Array<{ id: LayawayStatus; label: string }> = [
  { id: 'OPEN', label: 'Abiertos' },
  { id: 'COMPLETED', label: 'Liquidados' },
  { id: 'CANCELLED', label: 'Cancelados' },
]
const methods: SplitPaymentMethod[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA']

const status = ref<LayawayStatus>('OPEN')
const query = ref('')
const layaways = ref<LayawayFull[]>([])
const loading = ref(true)
const loadError = ref('')
const notice = ref('')
let loadSeq = 0
let timer: ReturnType<typeof setTimeout> | null = null

const dueDays = computed(() => auth.user?.preferences?.layawayDueDays ?? 15)

function dueDate(createdAt: string): Date {
  const due = new Date(createdAt)
  due.setDate(due.getDate() + dueDays.value)
  return due
}

function isOverdue(l: LayawayFull): boolean {
  return l.status === 'OPEN' && dueDate(l.createdAt).getTime() < Date.now()
}

function statusLabel(s: LayawayStatus) {
  return s === 'OPEN' ? 'Abierto' : s === 'COMPLETED' ? 'Liquidado' : 'Cancelado'
}

function statusClass(s: LayawayStatus) {
  return s === 'COMPLETED' ? 'text-success-500' : s === 'CANCELLED' ? 'text-gray-400' : 'text-warning-500'
}

function paidOf(l: LayawayFull): number {
  return round2(l.payments.reduce((acc, p) => acc + Number(p.amount), 0))
}

async function load() {
  const seq = ++loadSeq
  loading.value = true
  loadError.value = ''
  try {
    const data = await fetchLayaways({ status: status.value, q: query.value.trim() || undefined })
    if (seq !== loadSeq) return
    layaways.value = data
  } catch (e) {
    if (seq !== loadSeq) return
    loadError.value = posError(e, 'No se pudieron cargar los apartados.')
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

function scheduleLoad() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => void load(), 250)
}

function setStatus(s: LayawayStatus) {
  if (status.value === s) return
  status.value = s
  layaways.value = []
  notice.value = ''
  void load()
}

// ── Abono ──
const payTarget = ref<LayawayFull | null>(null)
const payAmount = ref<number | ''>('')
const payMethod = ref<SplitPaymentMethod>('EFECTIVO')
const payError = ref('')
const paying = ref(false)
const payInput = ref<HTMLInputElement | null>(null)

const payWillSettle = computed(
  () => !!payTarget.value && Number(payAmount.value) > 0 && round2(Number(payAmount.value)) >= Number(payTarget.value.balance),
)

function openPayment(l: LayawayFull) {
  payTarget.value = l
  payAmount.value = ''
  payMethod.value = 'EFECTIVO'
  payError.value = ''
  void nextTick(() => payInput.value?.focus())
}

async function confirmPayment() {
  const target = payTarget.value
  if (!target || paying.value) return
  const amount = round2(Number(payAmount.value))
  if (!Number.isFinite(amount) || amount <= 0) {
    payError.value = 'Captura un monto mayor a cero'
    return
  }
  if (amount > Number(target.balance)) {
    payError.value = `El abono no puede superar el saldo ($${formatMoney(Number(target.balance))})`
    return
  }
  paying.value = true
  payError.value = ''
  try {
    const updated = await addLayawayPayment(target.id, { method: payMethod.value, amount })
    payTarget.value = null
    notice.value =
      updated.status === 'COMPLETED'
        ? `${updated.code} liquidado` + (updated.sale ? ` · ticket #${updated.sale.ticketNumber}` : '') + '.'
        : `Abono de $${formatMoney(amount)} registrado en ${updated.code}. Saldo: $${formatMoney(Number(updated.balance))}.`
    await load()
  } catch (e) {
    payError.value = posError(e, 'No se pudo registrar el abono')
  } finally {
    paying.value = false
  }
}

// ── Cancelación ──
const cancelTarget = ref<LayawayFull | null>(null)
const cancelError = ref('')
const cancelling = ref(false)
const keepBtn = ref<HTMLButtonElement | null>(null)

function openCancel(l: LayawayFull) {
  cancelTarget.value = l
  cancelError.value = ''
  void nextTick(() => keepBtn.value?.focus())
}

async function confirmCancel() {
  const target = cancelTarget.value
  if (!target || cancelling.value) return
  cancelling.value = true
  cancelError.value = ''
  try {
    const result = await cancelLayaway(target.id)
    cancelTarget.value = null
    notice.value =
      `${result.code} cancelado; las piezas regresaron al inventario.` +
      (result.paidToRefund > 0 ? ` Abonos por devolver: $${formatMoney(result.paidToRefund)}.` : '')
    await load()
  } catch (e) {
    cancelError.value = posError(e, 'No se pudo cancelar el apartado')
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
