<template>
  <admin-layout>
    <page-breadcrumb page-title="Solicitar retiro" :items="breadcrumbItems" />

    <component-card :title="cardTitle">
      <form class="mx-auto max-w-lg space-y-4" @submit.prevent="save">
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Producto</label>
          <select v-model="form.productId" required class="field">
            <option value="" disabled>Selecciona un producto</option>
            <option v-for="p in products" :key="p.id" :value="p.id">
              {{ p.sku }} — {{ p.name }} (stock: {{ p.stock?.quantity ?? 0 }})
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad a retirar</label>
          <input v-model.number="form.quantity" type="number" min="1" required class="field" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Motivo / notas</label>
          <textarea v-model="form.notes" rows="3" class="field" />
        </div>
        <p class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-300">
          <template v-if="auth.isAdmin">
            El retiro se aplicará de inmediato al inventario.
          </template>
          <template v-else>
            Se creará una solicitud de retiro. El negocio la verá en
            <strong>Órdenes</strong> para aceptarla o rechazarla.
          </template>
        </p>
        <p v-if="error" class="text-sm text-error-500">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" :disabled="saving" @click="goBack">
            Cancelar
          </button>
          <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="saving">
            {{ saving ? 'Enviando…' : auth.isAdmin ? 'Retirar' : 'Enviar solicitud' }}
          </button>
        </div>
      </form>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { extractApiError, withdrawStock, type Brand, type Product } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const brandId = computed(() =>
  typeof route.params.id === 'string' && route.path.includes('/brands/') ? route.params.id : null,
)
const brand = ref<Brand | null>(null)
const products = ref<Product[]>([])
const saving = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  productId: typeof route.query.productId === 'string' ? route.query.productId : '',
  quantity: 1,
  notes: '',
})

const breadcrumbItems = computed(() => {
  if (brandId.value && brand.value) {
    return [
      { label: 'Marcas', to: '/brands' },
      { label: brand.value.name, to: `/brands/${brandId.value}/products` },
    ]
  }
  return [{ label: 'Productos', to: '/products' }]
})

const cardTitle = computed(() =>
  brand.value ? `Solicitar retiro · ${brand.value.name}` : 'Solicitar retiro',
)

function goBack() {
  if (brandId.value) router.push(`/brands/${brandId.value}/products`)
  else router.push('/products')
}

async function load() {
  const params = brandId.value ? { brandId: brandId.value } : undefined
  const { data } = await api.get<Product[]>('/products', { params })
  products.value = data
  if (!form.productId && data[0]) form.productId = data[0].id
  if (brandId.value) {
    const res = await api.get<Brand>(`/brands/${brandId.value}`)
    brand.value = res.data
  }
}

async function save() {
  error.value = null
  saving.value = true
  try {
    if (auth.isAdmin) {
      await withdrawStock(form.productId, form.quantity, form.notes)
    } else {
      await api.post('/product-requests', {
        type: 'WITHDRAWAL',
        productId: form.productId,
        quantity: form.quantity,
        notes: form.notes || null,
      })
    }
    goBack()
  } catch (e: unknown) {
    error.value = extractApiError(e, 'No se pudo procesar el retiro')
  } finally {
    saving.value = false
  }
}

onMounted(load)
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
