<template>
  <admin-layout>
    <PageHeader
      title="Clientes"
      :description="
        hasCaja
          ? 'Tu directorio de clientes con su historial de compras.'
          : 'Tu directorio de clientes con su teléfono a la mano.'
      "
    >
      <template #actions>
        <UiButton @click="openForm(null)">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Agregar cliente
        </UiButton>
      </template>
    </PageHeader>

    <UiCard>
      <div class="relative">
        <label for="customer-search" class="sr-only">Buscar cliente por nombre o teléfono</label>
        <Search class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
        <input
          id="customer-search"
          v-model="query"
          type="search"
          placeholder="Buscar por nombre o teléfono"
          class="ui-input pl-10"
          @input="scheduleLoad"
        />
      </div>

      <div
        v-if="loadError"
        class="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
        role="alert"
      >
        <span>{{ loadError }}</span>
        <button type="button" class="font-semibold underline" @click="load">Reintentar</button>
      </div>

      <div v-if="loading && customers.length === 0" class="mt-4 space-y-2" aria-busy="true" aria-label="Cargando clientes">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
      </div>

      <UiEmptyState
        v-else-if="customers.length === 0 && !loadError"
        :title="query.trim() ? `Sin resultados para «${query.trim()}»` : 'Aún no tienes clientes'"
        :description="
          query.trim()
            ? 'Revisa la ortografía o busca por teléfono.'
            : hasCaja
              ? 'Agrégalos aquí o al cobrar en Caja para llevar su historial de compras.'
              : 'Agrégalos aquí para tener su nombre y WhatsApp siempre a la mano.'
        "
      >
        <template #icon><Contact class="h-5 w-5" /></template>
        <UiButton v-if="!query.trim()" variant="secondary" @click="openForm(null)">Agregar cliente</UiButton>
      </UiEmptyState>

      <template v-else>
        <!-- Escritorio -->
        <div class="mt-4 hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 md:block">
          <table class="ui-table">
            <caption class="sr-only">Clientes</caption>
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Teléfono</th>
                <template v-if="hasCaja">
                  <th scope="col" class="text-right">Compras</th>
                  <th scope="col" class="text-right">Total gastado</th>
                  <th scope="col">Última compra</th>
                </template>
                <th scope="col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in customers" :key="c.id" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <td class="font-medium">{{ c.name }}</td>
                <td class="text-gray-600 dark:text-gray-400">{{ c.phone || 'Sin teléfono' }}</td>
                <template v-if="hasCaja">
                  <td class="text-right tabular-nums">{{ c.purchases }}</td>
                  <td class="text-right tabular-nums">${{ formatMoney(c.totalSpent) }}</td>
                  <td class="text-gray-600 dark:text-gray-400">{{ c.lastPurchaseAt ? formatDate(c.lastPurchaseAt) : '—' }}</td>
                </template>
                <td class="text-right">
                  <UiButton size="sm" variant="secondary" :aria-label="`Ver ficha de ${c.name}`" @click="openDetail(c.id)">
                    Ver ficha
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Móvil -->
        <ul class="mt-4 space-y-2 md:hidden" aria-label="Clientes">
          <li v-for="c in customers" :key="c.id">
            <button
              type="button"
              class="flex min-h-14 w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
              @click="openDetail(c.id)"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15"
                aria-hidden="true"
              >
                {{ c.name.trim().charAt(0).toUpperCase() }}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ c.name }}</span>
                <span class="block text-sm text-gray-500">{{ c.phone || 'Sin teléfono' }}</span>
              </span>
              <span v-if="hasCaja" class="text-right text-sm">
                <span class="block font-semibold tabular-nums text-gray-900 dark:text-white">${{ formatMoney(c.totalSpent) }}</span>
                <span class="block text-xs text-gray-500">{{ c.purchases }} {{ c.purchases === 1 ? 'compra' : 'compras' }}</span>
              </span>
              <ChevronRight class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
            </button>
          </li>
        </ul>
      </template>

      <nav
        v-if="total > pageSize"
        class="mt-4 flex items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300"
        aria-label="Paginación"
      >
        <UiButton size="sm" variant="secondary" :disabled="page <= 1 || loading" @click="goTo(page - 1)">Anterior</UiButton>
        <span class="text-center">Página {{ page }} de {{ pageCount }} · {{ total }} clientes</span>
        <UiButton size="sm" variant="secondary" :disabled="page >= pageCount || loading" @click="goTo(page + 1)">Siguiente</UiButton>
      </nav>
    </UiCard>

    <!-- Ficha del cliente -->
    <UiModal
      :open="detailOpen"
      :title="detail?.name ?? 'Ficha del cliente'"
      :description="detailSubtitle"
      size="lg"
      @close="closeDetail"
    >
      <div v-if="detailLoading" class="space-y-3" aria-busy="true">
        <div class="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        <div class="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
      </div>
      <p v-else-if="detailError" class="ui-error" role="alert">{{ detailError }}</p>
      <template v-else-if="detail">
        <div class="flex flex-wrap gap-2">
          <UiButton size="sm" variant="secondary" @click="openForm(detail)">Editar datos</UiButton>
          <UiButton v-if="detail.phone" size="sm" variant="wa" :href="`https://wa.me/${waNumber(detail.phone)}`" target="_blank">
            Escribir por WhatsApp
          </UiButton>
        </div>

        <template v-if="hasCaja">
          <dl class="mt-5 grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Total gastado</dt>
              <dd class="mt-0.5 font-display text-lg font-semibold text-gray-900 dark:text-white">${{ formatMoney(detail.totalSpent) }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Compras</dt>
              <dd class="mt-0.5 font-display text-lg font-semibold text-gray-900 dark:text-white">{{ detail.purchases }}</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
              <dt class="text-xs text-gray-500">Ticket promedio</dt>
              <dd class="mt-0.5 font-display text-lg font-semibold text-gray-900 dark:text-white">
                ${{ formatMoney(detail.purchases ? detail.totalSpent / detail.purchases : 0) }}
              </dd>
            </div>
          </dl>

          <template v-if="detail.layaways.length">
            <h3 class="mt-6 text-sm font-semibold text-gray-900 dark:text-white">Apartados</h3>
            <ul class="mt-2 divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <li v-for="l in detail.layaways" :key="l.id" class="flex flex-wrap justify-between gap-x-3 py-2.5">
                <span class="text-gray-900 dark:text-white">
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

          <h3 class="mt-6 text-sm font-semibold text-gray-900 dark:text-white">Historial de compras</h3>
          <p v-if="detail.sales.length === 0" class="mt-2 text-sm text-gray-500">Este cliente todavía no tiene compras registradas.</p>
          <ul v-else class="mt-2 divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="s in detail.sales" :key="s.id" class="py-2.5 text-sm">
              <div class="flex flex-wrap justify-between gap-x-3">
                <span class="font-medium text-gray-900 dark:text-white">
                  Ticket #{{ s.ticketNumber }}
                  <span class="ml-1 text-xs font-normal text-gray-500">
                    {{ formatDateTime(s.soldAt) }} · {{ PAYMENT_LABELS[s.paymentMethod] }}
                  </span>
                </span>
                <span class="font-medium tabular-nums text-gray-900 dark:text-white">${{ formatMoney(Number(s.total)) }}</span>
              </div>
              <p class="mt-0.5 break-words text-xs text-gray-500">
                {{ s.lines.map((l) => `${l.quantity} × ${l.product.name}`).join(', ') }}
              </p>
            </li>
          </ul>
          <p v-if="detail.sales.length >= 50" class="mt-2 text-xs text-gray-500">Se muestran las 50 compras más recientes.</p>
          <p v-if="detail.cancelledCount > 0" class="mt-2 text-xs text-gray-500">
            {{ detail.cancelledCount }} venta(s) cancelada(s) no se cuentan aquí.
          </p>
        </template>
      </template>
    </UiModal>

    <!-- Alta / edición -->
    <UiModal :open="form.open" :title="form.id ? 'Editar cliente' : 'Agregar cliente'" size="sm" @close="form.open = false">
      <form id="customer-form" class="space-y-4" novalidate @submit.prevent="save">
        <UiField v-slot="f" label="Nombre" required>
          <input
            :id="f.id"
            ref="nameInput"
            v-model="form.name"
            type="text"
            maxlength="200"
            autocomplete="off"
            placeholder="Ej. Ana López"
            class="ui-input"
          />
        </UiField>
        <UiField
          v-slot="f"
          label="Teléfono"
          optional
          :help="
            hasCaja
              ? 'Sirve para encontrarlo en Caja y enviarle su ticket por WhatsApp.'
              : 'Su WhatsApp a 10 dígitos, para escribirle cuando lo necesites.'
          "
        >
          <input
            :id="f.id"
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            maxlength="40"
            autocomplete="off"
            placeholder="618 123 4567"
            class="ui-input"
            :aria-describedby="f.describedBy"
          />
        </UiField>
        <p v-if="form.error" class="ui-error" role="alert">{{ form.error }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="form.open = false">Cancelar</UiButton>
        <UiButton type="submit" form="customer-form" :loading="form.saving" loading-text="Guardando…">
          {{ form.id ? 'Guardar cambios' : 'Agregar cliente' }}
        </UiButton>
      </template>
    </UiModal>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ChevronRight, Contact, Plus, Search } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
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

const auth = useAuthStore()
const toast = useToast()
/** Los datos de compras solo tienen sentido si el plan incluye Caja. */
const hasCaja = computed(() => auth.canAccess('caja'))
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `52${digits}` : digits
}

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
const detailSubtitle = computed(() =>
  detail.value ? `${detail.value.phone || 'Sin teléfono'} · Cliente desde ${formatDate(detail.value.createdAt)}` : undefined,
)

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    detail.value = await fetchCustomer(id)
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
      toast.success('Cambios guardados', name)
      if (detailOpen.value) void openDetail(form.id)
    } else {
      const { customer, existed } = await createCustomer({ name, phone: form.phone.trim() || null })
      if (existed) {
        form.error = `Ya tienes un cliente con ese teléfono: ${customer.name}`
        return
      }
      form.open = false
      toast.success('Cliente agregado', name)
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
