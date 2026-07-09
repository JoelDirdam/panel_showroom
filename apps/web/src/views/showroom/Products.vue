<template>
  <admin-layout>
    <page-breadcrumb page-title="Productos" />

    <component-card title="Catálogo de productos">
      <div class="mb-4 flex justify-end">
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          Nuevo producto
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">SKU</th>
              <th v-if="auth.isAdmin" class="py-3 pr-4">Marca</th>
              <th class="py-3 pr-4">Precio</th>
              <th class="py-3 pr-4">Stock</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="product in products"
              :key="product.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ product.name }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ product.sku }}</td>
              <td v-if="auth.isAdmin" class="py-3 pr-4">{{ product.brand.name }}</td>
              <td class="py-3 pr-4">{{ product.price ? `$${product.price}` : '—' }}</td>
              <td class="py-3 pr-4">{{ product.stock?.quantity ?? 0 }}</td>
              <td class="py-3">
                <button class="text-brand-500 hover:underline" @click="openEdit(product)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <div v-if="showModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {{ editing ? 'Editar producto' : 'Nuevo producto' }}
        </h3>
        <form class="space-y-4" @submit.prevent="save">
          <div v-if="auth.isAdmin && !editing">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">ID Marca</label>
            <input v-model="form.brandId" required class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input v-model="form.name" required class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
            <input v-model="form.sku" required :disabled="!!editing" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 disabled:opacity-60" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
            <textarea v-model="form.description" rows="2" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Precio</label>
              <input v-model.number="form.price" type="number" step="0.01" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Stock</label>
              <input v-model.number="form.quantity" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Mínimo</label>
              <input v-model.number="form.minStock" type="number" min="0" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" @click="showModal = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Guardar</button>
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
import api, { type Product } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const products = ref<Product[]>([])
const showModal = ref(false)
const editing = ref<Product | null>(null)
const form = reactive({
  brandId: '',
  name: '',
  sku: '',
  description: '',
  price: null as number | null,
  quantity: 0,
  minStock: 5,
})

async function load() {
  const { data } = await api.get<Product[]>('/products')
  products.value = data
}

function openCreate() {
  editing.value = null
  form.brandId = auth.user?.brandId || ''
  form.name = ''
  form.sku = ''
  form.description = ''
  form.price = null
  form.quantity = 0
  form.minStock = 5
  showModal.value = true
}

function openEdit(product: Product) {
  editing.value = product
  form.brandId = product.brandId
  form.name = product.name
  form.sku = product.sku
  form.description = product.description || ''
  form.price = product.price ? Number(product.price) : null
  form.quantity = product.stock?.quantity ?? 0
  form.minStock = product.stock?.minStock ?? 5
  showModal.value = true
}

async function save() {
  const payload = {
    brandId: form.brandId || undefined,
    name: form.name,
    sku: form.sku,
    description: form.description || null,
    price: form.price,
    quantity: form.quantity,
    minStock: form.minStock,
  }
  if (editing.value) {
    await api.patch(`/products/${editing.value.id}`, payload)
  } else {
    await api.post('/products', payload)
  }
  showModal.value = false
  await load()
}

onMounted(load)
</script>
