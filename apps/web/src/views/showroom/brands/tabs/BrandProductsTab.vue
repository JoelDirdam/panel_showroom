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
          <input ref="importInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onImportFile" />
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="downloadTemplate">
            Descargar plantilla
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" :disabled="importing" @click="importInput?.click()">
            {{ importing ? 'Leyendo…' : 'Importar' }}
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
                <div class="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    class="rounded-lg bg-success-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-success-600"
                    @click="router.push(`/brands/${brand.id}/products/${product.id}/edit`)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-brand-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-600"
                    @click="printOne(product)"
                  >
                    Imprimir
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-error-300 bg-error-50 px-2.5 py-1 text-xs font-medium text-error-600 hover:bg-error-100 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-400"
                    @click="openSingleDelete(product)"
                  >
                    Eliminar
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

    <ImportPreviewPanel
      v-if="importPreview"
      title="Previsualizar productos"
      :columns="productImportColumns"
      :rows="importPreview"
      :saving="importSaving"
      @cancel="importPreview = null"
      @confirm="confirmImport"
    />

    <LabelPrintModal v-model="showLabelModal" :items="labelItems" :default-size-id="defaultLabelSizeId" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ImportPreviewPanel from '@/components/import/ImportPreviewPanel.vue'
import LabelPrintModal from '@/components/labels/LabelPrintModal.vue'
import api, {
  bulkDeleteProducts,
  downloadProductsTemplate,
  extractApiError,
  fetchPreferences,
  importProductsRows,
  type Brand,
  type Product,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { parseSpreadsheetFile, type ImportColumn } from '@/composables/useXlsxImport'
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
const importing = ref(false)
const importSaving = ref(false)
const importInput = ref<HTMLInputElement | null>(null)
const importPreview = ref<Record<string, string>[] | null>(null)
const banner = ref<string | null>(null)
const bannerType = ref<'success' | 'error'>('success')
const showLabelModal = ref(false)
const labelItems = ref<LabelPrintItem[]>([])
const defaultLabelSizeId = ref<LabelSizeId | null>(null)

const productImportColumns: ImportColumn[] = [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'price', label: 'Precio', required: true },
  { key: 'quantity', label: 'Stock' },
  { key: 'sku', label: 'SKU' },
  { key: 'minStock', label: 'Stock mín.' },
  { key: 'description', label: 'Descripción' },
]

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

async function downloadTemplate() {
  try {
    const blob = await downloadProductsTemplate()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-productos.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    showBanner(extractApiError(e, 'No se pudo descargar la plantilla'), 'error')
  }
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  importing.value = true
  try {
    const { rows } = await parseSpreadsheetFile(file)
    const mapped = rows.map((row) => ({
      name: row.name || row.producto || row.nombre || '',
      price: row.price || row.precio || '',
      quantity: row.quantity || row.stock || '0',
      sku: row.sku || '',
      minStock: row.minstock || row.min_stock || '5',
      description: row.description || row.descripcion || '',
    }))
    if (!mapped.length) {
      showBanner('El archivo no tiene filas de datos', 'error')
      return
    }
    importPreview.value = mapped
  } catch (e: unknown) {
    showBanner(e instanceof Error ? e.message : 'No se pudo leer el archivo', 'error')
  } finally {
    importing.value = false
  }
}

async function confirmImport(rows: Record<string, string>[]) {
  importSaving.value = true
  try {
    const result = await importProductsRows(
      rows.map((r) => ({
        name: r.name,
        price: Number(r.price),
        quantity: Number(r.quantity) || 0,
        sku: r.sku || undefined,
        minStock: Number(r.minStock) || 5,
        description: r.description || undefined,
        brandId: props.brand.id,
      })),
      props.brand.id,
    )
    importPreview.value = null
    showBanner(
      `Importación: ${result.createdCount} creado(s), ${result.errorCount} con error.`,
      result.errorCount > 0 ? 'error' : 'success',
    )
    await load()
    emit('changed')
  } catch (e: unknown) {
    showBanner(extractApiError(e, 'No se pudo importar'), 'error')
  } finally {
    importSaving.value = false
  }
}

onMounted(async () => {
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
