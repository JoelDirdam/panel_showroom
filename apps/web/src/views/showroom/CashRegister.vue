<template>
  <admin-layout>
    <page-breadcrumb page-title="Corte de caja" />

    <div
      v-if="loadError"
      class="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
      role="alert"
    >
      <span>{{ loadError }}</span>
      <button type="button" class="font-medium underline" @click="load">Reintentar</button>
    </div>
    <p v-if="notice" class="mb-4 rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700 dark:bg-success-500/10 dark:text-success-400" role="status">
      {{ notice }}
    </p>

    <p v-if="loading" class="py-10 text-center text-sm text-gray-500">Cargando turno…</p>

    <!-- Sin turno abierto -->
    <component-card v-else-if="!session && !loadError" title="Abrir turno">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        No hay un turno de caja abierto. Ábrelo con el efectivo que dejas en el cajón; al cerrar se compara lo que
        cuentes contra lo que debería haber.
      </p>
      <form class="mt-4 flex flex-wrap items-end gap-3" @submit.prevent="open">
        <label class="text-sm text-gray-600 dark:text-gray-300">
          Fondo inicial ($)
          <input
            v-model.number="openingFloat"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            class="ui-input mt-1 w-40"
          />
        </label>
        <button
          type="submit"
          class="ui-btn ui-btn-primary"
          :disabled="busy"
        >
          {{ busy ? 'Abriendo…' : 'Abrir turno' }}
        </button>
      </form>
      <p v-if="formError" class="mt-3 text-sm text-error-500" role="alert">{{ formError }}</p>
    </component-card>

    <!-- Turno abierto -->
    <div v-else-if="session && summary" class="grid gap-4 xl:grid-cols-3">
      <div class="space-y-4 xl:col-span-2">
        <component-card title="Turno abierto">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Abierto {{ formatDateTime(session.openedAt) }}
            <template v-if="session.openedByName"> por {{ session.openedByName }}</template>
          </p>

          <dl class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Ventas</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">${{ formatMoney(summary.salesTotal) }}</dd>
              <dd class="text-xs text-gray-500">{{ summary.salesCount }} {{ summary.salesCount === 1 ? 'ticket' : 'tickets' }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Efectivo</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">${{ formatMoney(summary.sales.efectivo) }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Tarjeta</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">${{ formatMoney(summary.sales.tarjeta) }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Transferencia</dt>
              <dd class="text-base font-semibold text-gray-800 dark:text-white">${{ formatMoney(summary.sales.transferencia) }}</dd>
            </div>
          </dl>

          <h4 class="mt-5 text-sm font-semibold text-gray-800 dark:text-white">Efectivo esperado en caja</h4>
          <dl class="mt-2 space-y-1 text-sm">
            <div v-for="row in cashRows(summary)" :key="row.label" class="flex justify-between gap-3 text-gray-600 dark:text-gray-300">
              <dt>{{ row.label }}</dt>
              <dd>{{ row.sign }}${{ formatMoney(row.value) }}</dd>
            </div>
            <div class="flex justify-between gap-3 border-t border-gray-100 pt-2 text-base font-semibold text-gray-800 dark:border-gray-800 dark:text-white">
              <dt>Debe haber</dt>
              <dd>${{ formatMoney(summary.expectedCash) }}</dd>
            </div>
          </dl>
          <p v-if="summary.giftCardTotal > 0" class="mt-2 text-xs text-gray-500">
            Además se cubrieron ${{ formatMoney(summary.giftCardTotal) }} con tarjetas de regalo.
          </p>
        </component-card>

        <component-card title="Entradas y retiros de efectivo">
          <form class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end" @submit.prevent="addMovement">
            <label class="text-xs text-gray-500">
              Tipo
              <select
                v-model="movement.type"
                class="ui-input mt-1 w-full"
              >
                <option value="OUT">Retiro</option>
                <option value="IN">Entrada</option>
              </select>
            </label>
            <label class="text-xs text-gray-500">
              Monto ($)
              <input
                v-model.number="movement.amount"
                type="number"
                inputmode="decimal"
                min="0.01"
                step="0.01"
                class="ui-input mt-1 w-full sm:w-32"
              />
            </label>
            <label class="col-span-2 text-xs text-gray-500 sm:min-w-48 sm:flex-1">
              Concepto
              <input
                v-model="movement.note"
                type="text"
                maxlength="300"
                placeholder="Ej. Pago a proveedor, cambio"
                class="ui-input mt-1 w-full"
              />
            </label>
            <button
              type="submit"
              class="col-span-2 rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50 sm:col-span-1 dark:text-brand-400 dark:hover:bg-brand-500/10"
              :disabled="busy"
            >
              Registrar
            </button>
          </form>
          <p v-if="movementError" class="mt-2 text-sm text-error-500" role="alert">{{ movementError }}</p>

          <p v-if="session.movements.length === 0" class="mt-4 text-sm text-gray-500">Sin movimientos en este turno.</p>
          <ul v-else class="mt-4 divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <li v-for="m in session.movements" :key="m.id" class="flex flex-wrap justify-between gap-x-3 py-2">
              <span class="min-w-0 break-words text-gray-700 dark:text-gray-300">
                {{ m.type === 'IN' ? 'Entrada' : 'Retiro' }}
                <template v-if="m.note"> · {{ m.note }}</template>
                <span class="block text-xs text-gray-500">{{ formatDateTime(m.createdAt) }}<template v-if="m.createdByName"> · {{ m.createdByName }}</template></span>
              </span>
              <span class="font-medium" :class="m.type === 'IN' ? 'text-success-600' : 'text-error-500'">
                {{ m.type === 'IN' ? '+' : '−' }}${{ formatMoney(Number(m.amount)) }}
              </span>
            </li>
          </ul>
        </component-card>
      </div>

      <component-card title="Cerrar turno">
        <form @submit.prevent="close">
          <label class="block text-sm text-gray-600 dark:text-gray-300">
            Efectivo contado en caja ($)
            <input
              v-model.number="countedCash"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.01"
              class="ui-input mt-1 w-full"
            />
          </label>
          <p v-if="countedCash !== ''" class="mt-2 text-sm font-medium" :class="differenceClass(liveDifference)">
            {{ differenceLabel(liveDifference) }}
          </p>
          <label class="mt-3 block text-sm text-gray-600 dark:text-gray-300">
            Nota (opcional)
            <textarea
              v-model="closeNote"
              rows="2"
              maxlength="500"
              class="ui-input mt-1 w-full"
            />
          </label>
          <p v-if="formError" class="mt-3 text-sm text-error-500" role="alert">{{ formError }}</p>
          <button
            type="submit"
            class="ui-btn ui-btn-primary mt-4 w-full"
            :disabled="busy"
          >
            {{ busy ? 'Cerrando…' : 'Cerrar turno' }}
          </button>
          <p class="mt-2 text-xs text-gray-500">Al cerrar, el turno queda guardado y ya no se puede modificar.</p>
        </form>
      </component-card>
    </div>

    <!-- Historial -->
    <component-card v-if="!loading" title="Turnos anteriores" class="mt-4">
      <p v-if="history.length === 0" class="text-sm text-gray-500">Todavía no hay turnos cerrados.</p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="h in history" :key="h.id" class="py-3 text-sm">
          <div class="flex flex-wrap justify-between gap-x-4 gap-y-1">
            <span class="min-w-0 text-gray-800 dark:text-white">
              {{ formatDateTime(h.openedAt) }} → {{ h.closedAt ? formatDateTime(h.closedAt) : '—' }}
              <span class="block text-xs text-gray-500">
                <template v-if="h.closedByName">Cerró {{ h.closedByName }} · </template>
                Ventas ${{ formatMoney(h.summary?.salesTotal ?? 0) }} ({{ h.summary?.salesCount ?? 0 }} {{ h.summary?.salesCount === 1 ? 'ticket' : 'tickets' }})
              </span>
            </span>
            <span class="text-right">
              <span class="block text-gray-600 dark:text-gray-300">
                Esperado ${{ formatMoney(Number(h.expectedCash ?? 0)) }} · contado ${{ formatMoney(Number(h.countedCash ?? 0)) }}
              </span>
              <span class="block font-medium" :class="differenceClass(Number(h.difference ?? 0))">
                {{ differenceLabel(Number(h.difference ?? 0)) }}
              </span>
            </span>
          </div>
          <p v-if="h.note" class="mt-1 break-words text-xs text-gray-500">Nota: {{ h.note }}</p>
        </li>
      </ul>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { formatMoney, round2 } from '@/composables/useCajaSession'
import {
  addCashMovement,
  closeCashSession,
  fetchCashSessionHistory,
  fetchCurrentCashSession,
  formatDateTime,
  openCashSession,
  posError,
  type CashSession,
  type CashSummary,
} from '@/services/pos'

const session = ref<CashSession | null>(null)
const summary = ref<CashSummary | null>(null)
const history = ref<CashSession[]>([])
const loading = ref(true)
const loadError = ref('')
const notice = ref('')
const busy = ref(false)
const formError = ref('')
const movementError = ref('')

const openingFloat = ref<number | ''>(0)
const countedCash = ref<number | ''>('')
const closeNote = ref('')
const movement = reactive({ type: 'OUT' as 'IN' | 'OUT', amount: '' as number | '', note: '' })

const liveDifference = computed(() => round2(Number(countedCash.value || 0) - (summary.value?.expectedCash ?? 0)))

function cashRows(s: CashSummary) {
  return [
    { label: 'Fondo inicial', sign: '', value: s.openingFloat },
    { label: 'Ventas en efectivo', sign: '+', value: s.sales.efectivo },
    { label: 'Abonos de apartados en efectivo', sign: '+', value: s.layawayPayments.efectivo },
    { label: 'Entradas', sign: '+', value: s.cashIn },
    { label: 'Retiros', sign: '−', value: s.cashOut },
  ]
}

function differenceLabel(diff: number): string {
  if (Math.abs(diff) < 0.005) return 'Caja cuadrada'
  return diff > 0 ? `Sobran $${formatMoney(diff)}` : `Faltan $${formatMoney(Math.abs(diff))}`
}

function differenceClass(diff: number): string {
  if (Math.abs(diff) < 0.005) return 'text-success-600'
  return diff > 0 ? 'text-warning-600' : 'text-error-500'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [current, past] = await Promise.all([fetchCurrentCashSession(), fetchCashSessionHistory()])
    session.value = current.session
    summary.value = current.summary
    history.value = past
  } catch (e) {
    loadError.value = posError(e, 'No se pudo cargar el corte de caja.')
  } finally {
    loading.value = false
  }
}

async function open() {
  const amount = Number(openingFloat.value || 0)
  if (!Number.isFinite(amount) || amount < 0) {
    formError.value = 'El fondo inicial no puede ser negativo'
    return
  }
  busy.value = true
  formError.value = ''
  notice.value = ''
  try {
    const data = await openCashSession({ openingFloat: round2(amount) })
    session.value = data.session
    summary.value = data.summary
    countedCash.value = ''
    closeNote.value = ''
  } catch (e) {
    formError.value = posError(e, 'No se pudo abrir el turno')
  } finally {
    busy.value = false
  }
}

async function addMovement() {
  const amount = round2(Number(movement.amount))
  if (!Number.isFinite(amount) || amount <= 0) {
    movementError.value = 'Captura un monto mayor a cero'
    return
  }
  busy.value = true
  movementError.value = ''
  try {
    const data = await addCashMovement({ type: movement.type, amount, note: movement.note.trim() || null })
    session.value = data.session
    summary.value = data.summary
    movement.amount = ''
    movement.note = ''
  } catch (e) {
    movementError.value = posError(e, 'No se pudo registrar el movimiento')
  } finally {
    busy.value = false
  }
}

async function close() {
  if (countedCash.value === '' || !Number.isFinite(Number(countedCash.value)) || Number(countedCash.value) < 0) {
    formError.value = 'Captura el efectivo que contaste en caja (0 si no hay)'
    return
  }
  busy.value = true
  formError.value = ''
  try {
    const closed = await closeCashSession({
      countedCash: round2(Number(countedCash.value)),
      note: closeNote.value.trim() || null,
    })
    notice.value = `Turno cerrado. ${differenceLabel(Number(closed.difference ?? 0))}.`
    session.value = null
    summary.value = null
    openingFloat.value = 0
    history.value = [closed, ...history.value]
  } catch (e) {
    formError.value = posError(e, 'No se pudo cerrar el turno')
    // Puede que alguien más lo haya cerrado: se refresca el estado.
    void load()
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void load()
})
</script>
