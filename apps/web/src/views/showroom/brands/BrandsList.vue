<template>
  <admin-layout>
    <page-breadcrumb page-title="Marcas" />

    <div
      class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Módulos disponibles
      </p>
      <ul class="mt-3 space-y-2 text-sm">
        <li class="flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="setup?.businessConfigured ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
          />
          {{ setup?.businessConfigured ? 'Negocio configurado' : 'Negocio pendiente' }}
        </li>
        <li class="flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="setup?.hasHouseBrand ? 'bg-success-500' : 'bg-gray-300 dark:bg-gray-600'"
          />
          {{ setup?.hasHouseBrand ? 'Marca propia registrada' : 'Marca no registrada' }}
        </li>
      </ul>
      <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Estas opciones habilitan preferencias adicionales dentro de tu perfil.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <router-link
          v-if="!setup?.hasHouseBrand"
          to="/brands/mine"
          class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
        >
          Registrar mi marca
        </router-link>
        <router-link
          to="/brands/new"
          class="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-gray-200 dark:ring-gray-700"
        >
          Agregar otra marca
        </router-link>
      </div>
    </div>

    <div v-if="stats" class="mb-6 grid grid-cols-12 gap-4 md:gap-6">
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Total de marcas</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats.total }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Con negocio asignado</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats.withBusiness }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Con propietario vinculado</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ stats.withOwner }}</h3>
        </div>
      </div>
      <div class="col-span-12 sm:col-span-6 xl:col-span-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-sm text-gray-500 dark:text-gray-400">Renta promedio</p>
          <h3 class="mt-2 text-2xl font-bold text-gray-800 dark:text-white">{{ formatCurrency(stats.avgRent) }}</h3>
        </div>
      </div>
    </div>

    <component-card title="Gestión de marcas">
      <template #header-action>
        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            @click="router.push('/brands/import')"
          >
            Importar
          </button>
          <button
            data-tour="brands-create"
            type="button"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            @click="router.push('/brands/new')"
          >
            Nueva marca
          </button>
          <button
            type="button"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="selected.length === 0"
            @click="openBulkDeleteModal"
          >
            Eliminar seleccionadas ({{ selected.length }})
          </button>
        </div>
      </template>

      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          type="search"
          placeholder="Buscar por nombre, espacio o slug…"
          class="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <p
        v-if="banner"
        class="mb-4 rounded-lg border px-4 py-3 text-sm"
        :class="
          bannerType === 'error'
            ? 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400'
            : 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'
        "
        role="status"
      >
        {{ banner }}
      </p>

      <p v-if="importResult" class="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
        Importación: {{ importResult.createdCount }} creadas, {{ importResult.errorCount }} con error.
        <span v-if="importResult.errors.length">
          <br />
          <span v-for="err in importResult.errors" :key="err.row" class="block text-xs text-error-500">
            Fila {{ err.row }} ({{ err.name || 'sin nombre' }}): {{ err.error }}
          </span>
        </span>
      </p>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3 pr-3">
                <input type="checkbox" :checked="allSelectableSelected" @change="toggleAll" />
              </th>
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">Espacio</th>
              <th class="py-3 pr-4">Renta</th>
              <th class="py-3 pr-4">Comisión</th>
              <th class="py-3 pr-4">Propietario</th>
              <th class="py-3 pr-4">Estado</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="brand in filteredBrands"
              :key="brand.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-3">
                <input
                  v-if="!brand.isHouseBrand"
                  v-model="selected"
                  type="checkbox"
                  :value="brand.id"
                />
              </td>
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">
                {{ brand.name }}
                <span class="block text-xs font-normal text-gray-400">{{ brand.slug }}</span>
              </td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ brand.assignedSpace || '—' }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ formatCurrency(Number(brand.monthlyRent)) }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ Number(brand.commissionPercent) }}%</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ brand.owner ? brand.owner.name : 'Sin asignar' }}
              </td>
              <td class="py-3 pr-4">
                <span :class="brand.active ? 'text-success-500' : 'text-gray-400 dark:text-gray-500'">
                  {{ brand.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="py-3">
                <div class="flex flex-wrap gap-3">
                  <router-link class="text-brand-500 hover:underline" :to="`/brands/${brand.id}/products`">
                    Cargar
                  </router-link>
                  <router-link class="text-brand-500 hover:underline" :to="`/brands/${brand.id}/edit`">
                    Editar
                  </router-link>
                  <router-link class="text-gray-600 hover:underline dark:text-gray-300" :to="`/brands/${brand.id}`">
                    Ver resumen
                  </router-link>
                  <button
                    v-if="!brand.isHouseBrand"
                    type="button"
                    class="text-error-500 hover:underline"
                    @click="openDeleteModal(brand)"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredBrands.length === 0">
              <td colspan="8" class="py-8 text-center text-gray-500">No hay marcas que coincidan con la búsqueda.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <!-- Eliminar una marca -->
    <div v-if="deleteTarget" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-brand-title"
      >
        <h3 id="delete-brand-title" class="text-lg font-semibold text-gray-800 dark:text-white">Eliminar marca</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Si estás seguro de eliminar la marca, escribe
          <strong class="font-mono text-gray-800 dark:text-white">'{{ deleteTarget.slug }}'</strong>
          para confirmar.
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Si la marca tiene productos o ventas, se marcará como inactiva en lugar de eliminarse.
        </p>
        <input
          v-model="deleteConfirmation"
          type="text"
          autocomplete="off"
          :placeholder="deleteTarget.slug"
          class="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-gray-800 outline-none focus:border-error-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          @input="deleteError = null"
          @keyup.enter="removeBrand"
        />
        <p v-if="deleteError" class="mt-2 text-sm text-error-500" role="alert">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            :disabled="deleting"
            @click="closeDeleteModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="deleting || deleteConfirmation !== deleteTarget.slug"
            @click="removeBrand"
          >
            {{ deleting ? 'Procesando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Eliminar varias marcas -->
    <div v-if="showBulkDeleteModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900" role="dialog" aria-modal="true">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Eliminar {{ selected.length }} marcas</h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Las marcas con productos o ventas se marcarán como inactivas en lugar de eliminarse. Esta acción no se
          puede deshacer.
        </p>
        <ul class="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm text-gray-700 dark:text-gray-300">
          <li v-for="brand in selectedBrands" :key="brand.id">• {{ brand.name }}</li>
        </ul>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            :disabled="bulkDeleting"
            @click="showBulkDeleteModal = false"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="bulkDeleting"
            @click="confirmBulkDelete"
          >
            {{ bulkDeleting ? 'Procesando…' : 'Confirmar eliminación' }}
          </button>
        </div>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, {
  type Brand,
  type BrandImportResult,
  type BrandStats,
  bulkDeleteBrands,
  fetchBrandStats,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const setup = computed(() => auth.user?.setupStatus)

const brands = ref<Brand[]>([])
const stats = ref<BrandStats | null>(null)
const search = ref('')
const selected = ref<string[]>([])

const banner = ref<string | null>(null)
const bannerType = ref<'success' | 'error'>('success')

const importResult = ref<BrandImportResult | null>(null)

const deleteTarget = ref<Brand | null>(null)
const deleteConfirmation = ref('')
const deleteError = ref<string | null>(null)
const deleting = ref(false)

const showBulkDeleteModal = ref(false)
const bulkDeleting = ref(false)

const filteredBrands = computed(() => {
  const term = search.value.trim().toLowerCase()
  if (!term) return brands.value
  return brands.value.filter((brand) =>
    [brand.name, brand.slug, brand.assignedSpace || ''].some((field) => field.toLowerCase().includes(term)),
  )
})

const selectableBrands = computed(() => filteredBrands.value.filter((b) => !b.isHouseBrand))

const allSelectableSelected = computed(
  () => selectableBrands.value.length > 0 && selectableBrands.value.every((b) => selected.value.includes(b.id)),
)

const selectedBrands = computed(() => brands.value.filter((b) => selected.value.includes(b.id)))

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0)
}

function showBanner(message: string, type: 'success' | 'error' = 'success') {
  banner.value = message
  bannerType.value = type
}

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

async function load() {
  const [brandsRes, statsRes] = await Promise.all([api.get<Brand[]>('/brands'), fetchBrandStats()])
  brands.value = brandsRes.data
  stats.value = statsRes
  selected.value = selected.value.filter((id) => brands.value.some((b) => b.id === id))
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  const ids = selectableBrands.value.map((b) => b.id)
  selected.value = checked ? [...new Set([...selected.value, ...ids])] : selected.value.filter((id) => !ids.includes(id))
}

function openDeleteModal(brand: Brand) {
  if (brand.isHouseBrand) return
  deleteTarget.value = brand
  deleteConfirmation.value = ''
  deleteError.value = null
}

function closeDeleteModal() {
  if (deleting.value) return
  deleteTarget.value = null
  deleteConfirmation.value = ''
  deleteError.value = null
}

async function removeBrand() {
  const brand = deleteTarget.value
  if (!brand || deleting.value) return
  if (deleteConfirmation.value !== brand.slug) {
    deleteError.value = `Escribe '${brand.slug}' exactamente para confirmar`
    return
  }

  deleting.value = true
  deleteError.value = null
  try {
    const { data } = await api.delete<{ action: 'deleted' | 'deactivated'; message: string }>(
      `/brands/${brand.id}`,
      { data: { slug: deleteConfirmation.value } },
    )
    showBanner(data.message)
    deleteTarget.value = null
    deleteConfirmation.value = ''
    await load()
  } catch (e: unknown) {
    deleteError.value = apiError(e, 'No se pudo eliminar la marca')
  } finally {
    deleting.value = false
  }
}

function openBulkDeleteModal() {
  if (selected.value.length === 0) return
  showBulkDeleteModal.value = true
}

async function confirmBulkDelete() {
  bulkDeleting.value = true
  try {
    const result = await bulkDeleteBrands(selected.value)
    showBanner(
      `${result.deleted} eliminadas, ${result.deactivated} desactivadas` +
        (result.skipped.length ? `, ${result.skipped.length} omitidas` : ''),
    )
    showBulkDeleteModal.value = false
    selected.value = []
    await load()
  } catch (e: unknown) {
    showBanner(apiError(e, 'No se pudieron eliminar las marcas seleccionadas'), 'error')
  } finally {
    bulkDeleting.value = false
  }
}

function consumeImportResultFromHistory() {
  const raw = sessionStorage.getItem('brandsImportResult')
  if (raw) {
    try {
      importResult.value = JSON.parse(raw) as BrandImportResult
    } catch {
      // ignore malformed payload
    }
    sessionStorage.removeItem('brandsImportResult')
    return
  }
  const state = window.history.state as { importResult?: BrandImportResult } | null
  if (state?.importResult) {
    importResult.value = state.importResult
    const { importResult: _removed, ...rest } = state
    window.history.replaceState(rest, '')
  }
}

onMounted(() => {
  consumeImportResultFromHistory()
  void load()
})
</script>
