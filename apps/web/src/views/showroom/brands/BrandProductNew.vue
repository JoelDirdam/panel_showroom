<template>
  <admin-layout>
    <page-breadcrumb page-title="Nuevo producto" />

    <component-card :title="brand ? `Nuevo producto · ${brand.name}` : 'Nuevo producto'">
      <form class="space-y-5" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Categoría</label>
            <div class="flex gap-2">
              <select v-model="form.categoryId" class="field">
                <option value="">Sin categoría</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <button type="button" class="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200" @click="showNewCategory = !showNewCategory">
                Nueva
              </button>
            </div>
            <div v-if="showNewCategory" class="mt-2 flex gap-2">
              <input v-model="newCategoryName" class="field" placeholder="Nombre de categoría" />
              <button type="button" class="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm text-white" @click="addCategory">
                Crear
              </button>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Nombre <span class="text-error-500">*</span>
            </label>
            <input v-model="form.name" required class="field" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Descripción</label>
          <textarea v-model="form.description" rows="3" class="field" />
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Precio <span class="text-error-500">*</span>
            </label>
            <input v-model.number="form.price" required type="number" step="0.01" min="0" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad inicial</label>
            <input v-model.number="form.quantity" type="number" min="0" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Aviso de stock mínimo</label>
            <input v-model.number="form.minStock" type="number" min="0" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
            <input v-model="form.sku" placeholder="Vacío = automático" class="field" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Imagen (opcional)</label>
          <input type="file" accept="image/*" class="field" @change="onImageChange" />
          <p v-if="uploadingImage" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Subiendo imagen…</p>
          <img v-if="imagePreview" :src="imagePreview" alt="Vista previa" class="mt-2 h-24 w-24 rounded-lg object-cover" />
        </div>

        <p v-if="error" class="text-sm text-error-500">{{ error }}</p>
        <p v-if="success" class="text-sm text-success-500">{{ success }}</p>

        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300" :disabled="saving" @click="router.push(`/brands/${brandId}/products`)">
            Cancelar
          </button>
          <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Guardar' }}
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
import api, {
  createCategory,
  fetchCategories,
  uploadProductImage,
  type Brand,
  type Category,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const brandId = computed(() => route.params.id as string)
const brand = ref<Brand | null>(null)
const categories = ref<Category[]>([])
const showNewCategory = ref(false)
const newCategoryName = ref('')
const uploadingImage = ref(false)
const imagePreview = ref<string | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const form = reactive({
  categoryId: '',
  name: '',
  description: '',
  price: null as number | null,
  quantity: 0,
  minStock: 5,
  sku: '',
  imageUrl: null as string | null,
})

async function loadCategories() {
  categories.value = await fetchCategories()
}

async function addCategory() {
  if (!newCategoryName.value.trim()) return
  const category = await createCategory(newCategoryName.value.trim())
  await loadCategories()
  form.categoryId = category.id
  newCategoryName.value = ''
  showNewCategory.value = false
}

async function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadingImage.value = true
  try {
    form.imageUrl = await uploadProductImage(file)
    imagePreview.value = form.imageUrl
  } catch {
    error.value = 'No se pudo subir la imagen'
  } finally {
    uploadingImage.value = false
  }
}

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

async function save() {
  error.value = null
  success.value = null
  if (!form.name.trim() || form.price == null || Number.isNaN(form.price)) {
    error.value = 'Nombre y precio son obligatorios'
    return
  }

  saving.value = true
  try {
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      categoryId: form.categoryId || null,
      description: form.description.trim() || null,
      price: form.price,
      imageUrl: form.imageUrl,
      quantity: form.quantity,
      minStock: form.minStock,
    }

    if (auth.isAdmin) {
      await api.post('/products', { ...payload, brandId: brandId.value })
      success.value = 'Producto creado correctamente.'
    } else {
      await api.post('/product-requests', { type: 'CREATE_PRODUCT', ...payload })
      success.value = 'Solicitud de alta enviada para su aprobación.'
    }
    router.push(`/brands/${brandId.value}/products`)
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo guardar el producto')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  const [, brandRes] = await Promise.all([loadCategories(), api.get<Brand>(`/brands/${brandId.value}`)])
  brand.value = brandRes.data
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
