<template>
  <div class="space-y-6">
    <component-card title="Filtrar productos">
      <form class="space-y-4" @submit.prevent="applyFilters">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input v-model="filters.name" type="text" class="field" placeholder="Buscar por nombre" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Código de barras / SKU</label>
            <input v-model="filters.sku" type="text" class="field" placeholder="Buscar por SKU" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio (Min - Máx)</label>
            <div class="flex items-center gap-2">
              <input v-model.number="filters.priceMin" type="number" step="0.01" min="0" placeholder="Min" class="field w-20 px-2 py-1.5 text-sm" />
              <span class="text-gray-400">-</span>
              <input v-model.number="filters.priceMax" type="number" step="0.01" min="0" placeholder="Máx" class="field w-20 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock (Min - Máx)</label>
            <div class="flex items-center gap-2">
              <input v-model.number="filters.stockMin" type="number" min="0" placeholder="Min" :disabled="filters.sinStock" class="field w-20 px-2 py-1.5 text-sm disabled:opacity-60" />
              <span class="text-gray-400">-</span>
              <input v-model.number="filters.stockMax" type="number" min="0" placeholder="Máx" :disabled="filters.sinStock" class="field w-20 px-2 py-1.5 text-sm disabled:opacity-60" />
            </div>
          </div>
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="filters.sinStock" type="checkbox" class="rounded border-gray-300" />
              Sin stock
            </label>
          </div>
        </div>
        <div class="flex flex-wrap justify-end gap-2">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5" @click="clearFilters">
            Limpiar filtros
          </button>
          <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Aplicar filtros
          </button>
        </div>
      </form>
    </component-card>

    <component-card title="Productos de la marca">
      <template #header-action>
        <div class="flex flex-wrap items-center gap-2">
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="router.push(`/brands/${brand.id}/products/import`)">
            Importar
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" :disabled="selected.length === 0" @click="printSelectedLabels">
            Imprimir etiquetas
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="router.push(`/brands/${brand.id}/products/add-stock`)">
            Agregar stock
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="router.push(`/brands/${brand.id}/products/withdraw`)">
            Solicitar retiro
          </button>
          <button type="button" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" @click="router.push(`/brands/${brand.id}/products/new`)">
            Agregar producto
          </button>
          <button type="button" class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="selected.length === 0" @click="openBulkDelete">
            Eliminar ({{ selected.length }})
          </button>
        </div>
      </template>

      <p v-if="banner" class="mb-4 rounded-lg border px-4 py-3 text-sm" :class="bannerType === 'error' ? 'border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400' : 'border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400'">
        {{ banner }}
      </p>

      <p v-if="importResult" class="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
        Importación: {{ importResult.createdCount }} creado(s), {{ importResult.errorCount }} con error.
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
              <th class="py-3 pr-3"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
              <th class="py-3 pr-4">SKU</th>
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">Categoría</th>
              <th class="py-3 pr-4">Stock actual</th>
              <th class="py-3 pr-4">Stock mín.</th>
              <th class="py-3 pr-4">Precio</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in products" :key="product.id" class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-3 pr-3"><input v-model="selected" type="checkbox" :value="product.id" /></td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ product.sku }}</td>
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ product.name }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ product.category?.name || '—' }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ product.stock?.quantity ?? 0 }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ product.stock?.minStock ?? 0 }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ product.price ? `$${product.price}` : '—' }}</td>
              <td class="py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <router-link
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-success-600 hover:bg-success-50 dark:text-success-400 dark:hover:bg-success-500/10"
                    :to="`/brands/${brand.id}/products/${product.id}/edit`"
                    title="Editar"
                    aria-label="Editar"
                  >
                    <Pencil class="h-4 w-4" />
                  </router-link>
                  <a
                    href="#"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10"
                    title="Imprimir"
                    aria-label="Imprimir"
                    @click.prevent="printOne(product)"
                  >
                    <Printer class="h-4 w-4" />
                  </a>
                  <button
                    type="button"
                    class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
                    title="Eliminar"
                    aria-label="Eliminar"
                    @click="openSingleDelete(product)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td colspan="8" class="py-6 text-center text-gray-500 dark:text-gray-400">
                No hay productos con estos filtros
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <div v-if="showDeleteModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">
          Eliminar {{ deleteIds.length }} producto(s)
        </h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">Esta acción no se puede deshacer.</p>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300" :disabled="deleting" @click="showDeleteModal = false">Cancelar</button>
          <button type="button" class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? 'Eliminando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <LabelPrintModal v-model="showLabelModal" :items="labelItems" :default-size-id="defaultLabelSizeId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Pencil, Printer, Trash2 } from 'lucide-vue-next'
import ComponentCard from '@/components/common/ComponentCard.vue'
import LabelPrintModal from '@/components/labels/LabelPrintModal.vue'
import api, {
  bulkDeleteProducts,
  extractApiError,
  fetchPreferences,
  type Brand,
  type Product,
  type ProductImportResult,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { matchLabelSizeFromMm, type LabelPrintItem, type LabelSizeId } from '@/utils/labelPdf'

const props = defineProps<{ brand: Brand }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const router = useRouter()
const auth = useAuthStore()

const products = ref<Product[]>([])
const selected = ref<string[]>([])
const showDeleteModal = ref(false)
const deleteIds = ref<string[]>([])
const deleting = ref(false)
const banner = ref<string | null>(null)
const bannerType = ref<'success' | 'error'>('success')
const importResult = ref<ProductImportResult | null>(null)
const showLabelModal = ref(false)
const labelItems = ref<LabelPrintItem[]>([])
const defaultLabelSizeId = ref<LabelSizeId | null>(null)

const filters = reactive({
  name: '',
  sku: '',
  priceMin: null as number | null,
  priceMax: null as number | null,
  stockMin: null as number | null,
  stockMax: null as number | null,
  sinStock: false,
})

const allSelected = computed(() => products.value.length > 0 && products.value.every((p) => selected.value.includes(p.id)))

function showBanner(message: string, type: 'success' | 'error' = 'success') {
  banner.value = message
  bannerType.value = type
  setTimeout(() => {
    if (banner.value === message) banner.value = null
  }, 5000)
}

function consumeImportResultFromHistory() {
  const raw = sessionStorage.getItem('productsImportResult')
  if (raw) {
    try {
      importResult.value = JSON.parse(raw) as ProductImportResult
    } catch {
      // ignore malformed payload
    }
    sessionStorage.removeItem('productsImportResult')
  }
}

function buildParams() {
  const params: Record<string, string | number | boolean> = { brandId: props.brand.id }
  if (filters.name.trim()) params.name = filters.name.trim()
  if (filters.sku.trim()) params.sku = filters.sku.trim()
  if (typeof filters.priceMin === 'number' && !Number.isNaN(filters.priceMin)) params.priceMin = filters.priceMin
  if (typeof filters.priceMax === 'number' && !Number.isNaN(filters.priceMax)) params.priceMax = filters.priceMax
  if (filters.sinStock) {
    params.sinStock = true
  } else {
    if (typeof filters.stockMin === 'number' && !Number.isNaN(filters.stockMin)) params.stockMin = filters.stockMin
    if (typeof filters.stockMax === 'number' && !Number.isNaN(filters.stockMax)) params.stockMax = filters.stockMax
  }
  return params
}

async function load() {
  const { data } = await api.get<Product[]>('/products', { params: buildParams() })
  products.value = data
  selected.value = selected.value.filter((id) => data.some((p) => p.id === id))
}

function applyFilters() {
  return load()
}

function clearFilters() {
  Object.assign(filters, { name: '', sku: '', priceMin: null, priceMax: null, stockMin: null, stockMax: null, sinStock: false })
  return load()
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  selected.value = checked ? products.value.map((p) => p.id) : []
}

function openSingleDelete(product: Product) {
  deleteIds.value = [product.id]
  showDeleteModal.value = true
}

function openBulkDelete() {
  deleteIds.value = [...selected.value]
  showDeleteModal.value = true
}

async function confirmDelete() {
  const ids = deleteIds.value.length ? deleteIds.value : selected.value
  deleting.value = true
  try {
    const result = await bulkDeleteProducts(ids)
    showBanner(`${result.deleted} producto(s) eliminado(s).`)
    selected.value = []
    deleteIds.value = []
    showDeleteModal.value = false
    await load()
    emit('changed')
  } catch (e: unknown) {
    showBanner(extractApiError(e, 'No se pudieron eliminar los productos'), 'error')
  } finally {
    deleting.value = false
  }
}

function printOne(product: Product) {
  labelItems.value = [{ sku: product.sku, name: product.name, price: product.price, quantity: 1 }]
  showLabelModal.value = true
}

function printSelectedLabels() {
  labelItems.value = products.value
    .filter((p) => selected.value.includes(p.id))
    .map((p) => ({ sku: p.sku, name: p.name, price: p.price, quantity: 1 }))
  showLabelModal.value = true
}

onMounted(async () => {
  consumeImportResultFromHistory()
  await load()
  if (auth.isAdmin) {
    try {
      const prefs = await fetchPreferences()
      defaultLabelSizeId.value = matchLabelSizeFromMm(prefs.labelWidthMm, prefs.labelHeightMm)
    } catch {
      defaultLabelSizeId.value = null
    }
  }
})
</script>

<style scoped>
.field {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}
</style>
