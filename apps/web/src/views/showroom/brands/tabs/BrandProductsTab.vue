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
          <input ref="importInput" type="file" accept=".csv" class="hidden" @change="onImportFile" />
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="downloadTemplate">
            Plantilla Excel/CSV
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" :disabled="importing" @click="importInput?.click()">
            {{ importing ? 'Importando…' : 'Importar' }}
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" :disabled="selected.length === 0" @click="printLabels">
            Imprimir etiquetas
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="openAddStock">
            Agregar stock
          </button>
          <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800" @click="openWithdraw">
            Solicitar retiro
          </button>
          <button type="button" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" @click="router.push(`/brands/${brand.id}/products/new`)">
            Agregar producto
          </button>
          <button type="button" class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50" :disabled="selected.length === 0" @click="showDeleteModal = true">
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
                <button class="text-brand-500 hover:underline" @click="openEdit(product)">Ver/Editar</button>
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

    <!-- Ver/Editar producto -->
    <div v-if="detail" class="fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-black/50 p-4" @click.self="detail = null">
      <div class="mt-10 w-full max-w-2xl rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Ver/Editar producto</h3>
        <form class="space-y-4" @submit.prevent="saveDetail">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
              <input v-model="detailForm.name" required class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
              <input :value="detail.sku" disabled class="field opacity-60" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Categoría</label>
              <select v-model="detailForm.categoryId" class="field">
                <option value="">Sin categoría</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio</label>
              <input v-model.number="detailForm.price" type="number" step="0.01" min="0" class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock mínimo</label>
              <input v-model.number="detailForm.minStock" type="number" min="0" class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad actual</label>
              <input :value="detail.stock?.quantity ?? 0" disabled class="field opacity-60" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
            <textarea v-model="detailForm.description" rows="2" class="field" />
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400" @click="detail = null">Cerrar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Agregar stock -->
    <div v-if="showStockModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4" @click.self="showStockModal = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Agregar stock</h3>
        <form class="space-y-4" @submit.prevent="saveStockEntry">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
            <select v-model="stockForm.productId" required class="field">
              <option value="" disabled>Selecciona un producto</option>
              <option v-for="p in products" :key="p.id" :value="p.id">{{ p.sku }} — {{ p.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
            <input v-model.number="stockForm.quantity" type="number" min="1" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nota (opcional)</label>
            <input v-model="stockForm.note" class="field" />
          </div>
          <p v-if="!auth.isAdmin" class="text-xs text-gray-500 dark:text-gray-400">
            Se enviará como solicitud de restock para su aprobación.
          </p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" @click="showStockModal = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
              {{ auth.isAdmin ? 'Agregar' : 'Enviar solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Solicitar retiro -->
    <div v-if="showWithdrawModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4" @click.self="showWithdrawModal = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Solicitar retiro</h3>
        <form class="space-y-4" @submit.prevent="saveWithdraw">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
            <select v-model="withdrawForm.productId" required class="field">
              <option value="" disabled>Selecciona un producto</option>
              <option v-for="p in products" :key="p.id" :value="p.id">
                {{ p.sku }} — {{ p.name }} (stock: {{ p.stock?.quantity ?? 0 }})
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad a retirar</label>
            <input v-model.number="withdrawForm.quantity" type="number" min="1" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Motivo / notas</label>
            <textarea v-model="withdrawForm.notes" rows="2" class="field" />
          </div>
          <p v-if="withdrawError" class="text-sm text-error-500">{{ withdrawError }}</p>
          <p v-if="!auth.isAdmin" class="text-xs text-gray-500 dark:text-gray-400">
            Se enviará como solicitud de retiro para su aprobación.
          </p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" @click="showWithdrawModal = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
              {{ auth.isAdmin ? 'Retirar' : 'Enviar solicitud' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Confirmar eliminación -->
    <div v-if="showDeleteModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Eliminar {{ selected.length }} producto(s)</h3>
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
import ComponentCard from '@/components/common/ComponentCard.vue'
import LabelPrintModal from '@/components/labels/LabelPrintModal.vue'
import api, {
  bulkDeleteProducts,
  fetchCategories,
  fetchPreferences,
  withdrawStock,
  type Brand,
  type Category,
  type Product,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { matchLabelSizeFromMm, type LabelPrintItem, type LabelSizeId } from '@/utils/labelPdf'

const props = defineProps<{ brand: Brand }>()
const emit = defineEmits<{ (e: 'changed'): void }>()

const router = useRouter()
const auth = useAuthStore()

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const selected = ref<string[]>([])
const detail = ref<Product | null>(null)
const showStockModal = ref(false)
const showWithdrawModal = ref(false)
const showDeleteModal = ref(false)
const deleting = ref(false)
const importing = ref(false)
const importInput = ref<HTMLInputElement | null>(null)
const banner = ref<string | null>(null)
const bannerType = ref<'success' | 'error'>('success')
const withdrawError = ref<string | null>(null)
const showLabelModal = ref(false)
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

const detailForm = reactive({ name: '', categoryId: '', price: null as number | null, minStock: 5, description: '' })
const stockForm = reactive({ productId: '', quantity: 1, note: '' })
const withdrawForm = reactive({ productId: '', quantity: 1, notes: '' })

const allSelected = computed(() => products.value.length > 0 && products.value.every((p) => selected.value.includes(p.id)))

function showBanner(message: string, type: 'success' | 'error' = 'success') {
  banner.value = message
  bannerType.value = type
  setTimeout(() => {
    if (banner.value === message) banner.value = null
  }, 5000)
}

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
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

function openEdit(product: Product) {
  detail.value = product
  detailForm.name = product.name
  detailForm.categoryId = product.categoryId || ''
  detailForm.price = product.price ? Number(product.price) : null
  detailForm.minStock = product.stock?.minStock ?? 5
  detailForm.description = product.description || ''
}

async function saveDetail() {
  if (!detail.value) return
  await api.patch(`/products/${detail.value.id}`, {
    name: detailForm.name,
    categoryId: detailForm.categoryId || null,
    price: detailForm.price,
    minStock: detailForm.minStock,
    description: detailForm.description || null,
  })
  detail.value = null
  await load()
}

function openAddStock() {
  stockForm.productId = products.value[0]?.id || ''
  stockForm.quantity = 1
  stockForm.note = ''
  showStockModal.value = true
}

async function saveStockEntry() {
  if (auth.isAdmin) {
    await api.post(`/stock/${stockForm.productId}/entries`, { quantity: stockForm.quantity, note: stockForm.note || null })
    showBanner('Stock agregado correctamente.')
  } else {
    await api.post('/product-requests', {
      type: 'RESTOCK',
      productId: stockForm.productId,
      quantity: stockForm.quantity,
      notes: stockForm.note || null,
    })
    showBanner('Solicitud de restock enviada.')
  }
  showStockModal.value = false
  await load()
}

function openWithdraw() {
  withdrawForm.productId = products.value[0]?.id || ''
  withdrawForm.quantity = 1
  withdrawForm.notes = ''
  withdrawError.value = null
  showWithdrawModal.value = true
}

async function saveWithdraw() {
  withdrawError.value = null
  try {
    if (auth.isAdmin) {
      await withdrawStock(withdrawForm.productId, withdrawForm.quantity, withdrawForm.notes)
      showBanner('Retiro de stock registrado.')
    } else {
      await api.post('/product-requests', {
        type: 'WITHDRAWAL',
        productId: withdrawForm.productId,
        quantity: withdrawForm.quantity,
        notes: withdrawForm.notes || null,
      })
      showBanner('Solicitud de retiro enviada.')
    }
    showWithdrawModal.value = false
    await load()
  } catch (e: unknown) {
    withdrawError.value = apiError(e, 'No se pudo procesar el retiro')
  }
}

async function confirmDelete() {
  deleting.value = true
  try {
    const result = await bulkDeleteProducts(selected.value)
    showBanner(`${result.deleted} producto(s) eliminado(s).`)
    selected.value = []
    showDeleteModal.value = false
    await load()
    emit('changed')
  } catch (e: unknown) {
    showBanner(apiError(e, 'No se pudieron eliminar los productos'), 'error')
  } finally {
    deleting.value = false
  }
}

const labelItems = computed<LabelPrintItem[]>(() =>
  products.value
    .filter((p) => selected.value.includes(p.id))
    .map((p) => ({ sku: p.sku, name: p.name, price: p.price, quantity: 1 })),
)

function printLabels() {
  showLabelModal.value = true
}

function downloadTemplate() {
  const csv = 'Producto,Precio,Stock,sku\nProducto de ejemplo,199.00,10,\n'
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'plantilla-productos.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    header.forEach((key, idx) => {
      row[key] = cells[idx] ?? ''
    })
    return row
  })
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  importing.value = true
  try {
    const text = await file.text()
    const rows = parseCsv(text)
    let created = 0
    let failed = 0
    for (const row of rows) {
      const name = row.producto || row.nombre
      const price = Number(row.precio)
      const quantity = Number(row.stock) || 0
      const sku = row.sku?.trim() || undefined
      if (!name || Number.isNaN(price)) {
        failed += 1
        continue
      }
      try {
        if (auth.isAdmin) {
          await api.post('/products', {
            brandId: props.brand.id,
            name,
            sku,
            price,
            quantity,
            minStock: 5,
          })
        } else {
          await api.post('/product-requests', {
            type: 'CREATE_PRODUCT',
            name,
            sku,
            price,
            quantity,
            minStock: 5,
          })
        }
        created += 1
      } catch {
        failed += 1
      }
    }
    showBanner(`Importación: ${created} creado(s), ${failed} con error.`, failed > 0 ? 'error' : 'success')
    await load()
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  const [, cats] = await Promise.all([load(), fetchCategories()])
  categories.value = cats
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
