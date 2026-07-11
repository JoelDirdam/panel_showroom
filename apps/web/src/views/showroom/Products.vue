<template>
  <admin-layout>
    <page-breadcrumb page-title="Productos" />

    <component-card title="Filtrar Productos" class-name="mb-6">
      <form class="space-y-4" @submit.prevent="applyFilters">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input
              v-model="filters.name"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Buscar por nombre"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU / Cod. Barras</label>
            <input
              v-model="filters.barcode"
              type="text"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="SKU o código de barras"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio (Min - Máx)</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="filters.priceMin"
                type="number"
                step="0.01"
                min="0"
                placeholder="Min"
                class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <span class="text-gray-400">-</span>
              <input
                v-model.number="filters.priceMax"
                type="number"
                step="0.01"
                min="0"
                placeholder="Máx"
                class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock (Min - Máx)</label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="filters.stockMin"
                type="number"
                min="0"
                placeholder="Min"
                :disabled="filters.sinStock"
                class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60"
              />
              <span class="text-gray-400">-</span>
              <input
                v-model.number="filters.stockMax"
                type="number"
                min="0"
                placeholder="Máx"
                :disabled="filters.sinStock"
                class="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white disabled:opacity-60"
              />
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input v-model="filters.sinStock" type="checkbox" class="rounded border-gray-300" />
            Sin Stock
          </label>
          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
              @click="clearFilters"
            >
              Limpiar filtros
            </button>
            <button
              type="submit"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </form>
    </component-card>

    <component-card title="Catálogo de productos">
      <div class="mb-4 flex flex-wrap justify-end gap-2">
        <button
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
          @click="openAddStock"
        >
          Agregar Stock
        </button>
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          Agregar productos
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3 pr-4">SKU</th>
              <th class="py-3 pr-4">Nombre</th>
              <th v-if="auth.isAdmin" class="py-3 pr-4">Marca</th>
              <th class="py-3 pr-4">Stock</th>
              <th class="py-3 pr-4">Cantidad actual</th>
              <th class="py-3 pr-4">Precio</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in products"
              :key="product.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ product.sku }}</td>
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ product.name }}</td>
              <td v-if="auth.isAdmin" class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ product.brand.name }}
              </td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">
                {{ product.stock?.minStock ?? 0 }}
              </td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">
                {{ product.stock?.quantity ?? 0 }}
              </td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">
                {{ product.price ? `$${product.price}` : '—' }}
              </td>
              <td class="py-3">
                <button class="text-brand-500 hover:underline" @click="openViewEdit(product)">
                  Ver/Editar
                </button>
              </td>
            </tr>
            <tr v-if="products.length === 0">
              <td
                :colspan="auth.isAdmin ? 7 : 6"
                class="py-6 text-center text-gray-500 dark:text-gray-400"
              >
                No hay productos con estos filtros
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <component-card v-if="detail" title="Ver/Editar producto" class-name="mt-6">
      <form class="space-y-4" @submit.prevent="saveDetail">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input
              v-model="detailForm.name"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
            <input
              v-model="detailForm.sku"
              disabled
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cod. Barras</label>
            <input
              v-model="detailForm.barcode"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio</label>
            <input
              v-model.number="detailForm.price"
              type="number"
              step="0.01"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock (mínimo)</label>
            <input
              v-model.number="detailForm.minStock"
              type="number"
              min="0"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad actual</label>
            <input
              :value="detail.stock?.quantity ?? 0"
              disabled
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
          <textarea
            v-model="detailForm.description"
            rows="2"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
            @click="closeDetail"
          >
            Cerrar
          </button>
          <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
            Guardar cambios
          </button>
        </div>
      </form>

      <div class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-800">
        <h4 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white">Entradas de stock</h4>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
                <th class="py-2 pr-4">Fecha</th>
                <th class="py-2 pr-4">Cantidad</th>
                <th class="py-2 pr-4">Nota</th>
                <th class="py-2">Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="entry in detail.stockEntries || []"
                :key="entry.id"
                class="border-b border-gray-100 dark:border-gray-800"
              >
                <td class="py-2 pr-4 text-gray-600 dark:text-gray-300">
                  {{ formatDate(entry.createdAt) }}
                </td>
                <td class="py-2 pr-4 text-gray-800 dark:text-white">+{{ entry.quantity }}</td>
                <td class="py-2 pr-4 text-gray-600 dark:text-gray-300">{{ entry.note || '—' }}</td>
                <td class="py-2 text-gray-600 dark:text-gray-300">
                  {{ entry.createdBy?.name || '—' }}
                </td>
              </tr>
              <tr v-if="!(detail.stockEntries && detail.stockEntries.length)">
                <td colspan="4" class="py-4 text-center text-gray-500 dark:text-gray-400">
                  Sin entradas de stock registradas
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </component-card>

    <!-- Modal: Agregar productos -->
    <div
      v-if="showCreateModal"
      class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Agregar productos</h3>
        <form class="space-y-4" @submit.prevent="saveCreate">
          <div v-if="auth.isAdmin">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Marca</label>
            <select
              v-model="createForm.brandId"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="" disabled>Selecciona una marca</option>
              <option v-for="brand in brands" :key="brand.id" :value="brand.id">
                {{ brand.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input
              v-model="createForm.name"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
            <input
              v-model="createForm.sku"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cod. Barras</label>
            <input
              v-model="createForm.barcode"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
            <textarea
              v-model="createForm.description"
              rows="2"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio</label>
              <input
                v-model.number="createForm.price"
                type="number"
                step="0.01"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
              <input
                v-model.number="createForm.quantity"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock mín.</label>
              <input
                v-model.number="createForm.minStock"
                type="number"
                min="0"
                class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-gray-600"
              @click="showCreateModal = false"
            >
              Cancelar
            </button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal: Agregar Stock -->
    <div
      v-if="showStockModal"
      class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4"
    >
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">Agregar Stock</h3>
        <form class="space-y-4" @submit.prevent="saveStockEntry">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
            <select
              v-model="stockForm.productId"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="" disabled>Selecciona un producto</option>
              <option v-for="p in allProducts" :key="p.id" :value="p.id">
                {{ p.sku }} — {{ p.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad</label>
            <input
              v-model.number="stockForm.quantity"
              type="number"
              min="1"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nota (opcional)</label>
            <input
              v-model="stockForm.note"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div class="flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-gray-600"
              @click="showStockModal = false"
            >
              Cancelar
            </button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">
              Agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Product, type Brand } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const products = ref<Product[]>([])
const allProducts = ref<Product[]>([])
const brands = ref<Brand[]>([])
const detail = ref<Product | null>(null)
const showCreateModal = ref(false)
const showStockModal = ref(false)

const filters = reactive({
  name: '',
  barcode: '',
  priceMin: null as number | null,
  priceMax: null as number | null,
  stockMin: null as number | null,
  stockMax: null as number | null,
  sinStock: false,
})

const createForm = reactive({
  brandId: '',
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: null as number | null,
  quantity: 0,
  minStock: 5,
})

const detailForm = reactive({
  name: '',
  sku: '',
  barcode: '',
  description: '',
  price: null as number | null,
  minStock: 5,
})

const stockForm = reactive({
  productId: '',
  quantity: 1,
  note: '',
})

function buildFilterParams() {
  const params: Record<string, string | number | boolean> = {}
  if (filters.name.trim()) params.name = filters.name.trim()
  if (filters.barcode.trim()) params.barcode = filters.barcode.trim()
  if (typeof filters.priceMin === 'number' && !Number.isNaN(filters.priceMin)) {
    params.priceMin = filters.priceMin
  }
  if (typeof filters.priceMax === 'number' && !Number.isNaN(filters.priceMax)) {
    params.priceMax = filters.priceMax
  }
  if (filters.sinStock) {
    params.sinStock = true
  } else {
    if (typeof filters.stockMin === 'number' && !Number.isNaN(filters.stockMin)) {
      params.stockMin = filters.stockMin
    }
    if (typeof filters.stockMax === 'number' && !Number.isNaN(filters.stockMax)) {
      params.stockMax = filters.stockMax
    }
  }
  return params
}

async function load(withFilters = true) {
  const { data } = await api.get<Product[]>('/products', {
    params: withFilters ? buildFilterParams() : undefined,
  })
  products.value = data
}

async function loadAllProducts() {
  const { data } = await api.get<Product[]>('/products')
  allProducts.value = data
}

function applyFilters() {
  return load(true)
}

function clearFilters() {
  filters.name = ''
  filters.barcode = ''
  filters.priceMin = null
  filters.priceMax = null
  filters.stockMin = null
  filters.stockMax = null
  filters.sinStock = false
  return load(true)
}

async function loadBrands() {
  if (!auth.isAdmin) return
  const { data } = await api.get<Brand[]>('/brands')
  brands.value = data
}

async function openCreate() {
  if (auth.isAdmin) {
    await loadBrands()
    createForm.brandId = brands.value[0]?.id || ''
  } else {
    createForm.brandId = auth.user?.brandId || ''
  }
  createForm.name = ''
  createForm.sku = ''
  createForm.barcode = ''
  createForm.description = ''
  createForm.price = null
  createForm.quantity = 0
  createForm.minStock = 5
  showCreateModal.value = true
}

async function openAddStock() {
  await loadAllProducts()
  stockForm.productId = allProducts.value[0]?.id || ''
  stockForm.quantity = 1
  stockForm.note = ''
  showStockModal.value = true
}

async function openViewEdit(product: Product) {
  const { data } = await api.get<Product>(`/products/${product.id}`)
  detail.value = data
  detailForm.name = data.name
  detailForm.sku = data.sku
  detailForm.barcode = data.barcode || ''
  detailForm.description = data.description || ''
  detailForm.price = data.price ? Number(data.price) : null
  detailForm.minStock = data.stock?.minStock ?? 5
}

function closeDetail() {
  detail.value = null
}

async function saveCreate() {
  await api.post('/products', {
    brandId: createForm.brandId || undefined,
    name: createForm.name,
    sku: createForm.sku,
    barcode: createForm.barcode || null,
    description: createForm.description || null,
    price: createForm.price,
    quantity: createForm.quantity,
    minStock: createForm.minStock,
  })
  showCreateModal.value = false
  await load(true)
}

async function saveDetail() {
  if (!detail.value) return
  const { data } = await api.patch<Product>(`/products/${detail.value.id}`, {
    name: detailForm.name,
    barcode: detailForm.barcode || null,
    description: detailForm.description || null,
    price: detailForm.price,
    minStock: detailForm.minStock,
  })
  detail.value = data
  await load(true)
}

async function saveStockEntry() {
  await api.post(`/stock/${stockForm.productId}/entries`, {
    quantity: stockForm.quantity,
    note: stockForm.note || null,
  })
  showStockModal.value = false
  await load(true)
  if (detail.value?.id === stockForm.productId) {
    await openViewEdit(detail.value)
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

onMounted(() => load(true))
</script>
