<template>
  <component-card :title="cardTitle">
    <form class="space-y-5" @submit.prevent="save">
      <div v-if="showBrandSelect" class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
            Marca <span class="text-error-500">*</span>
          </label>
          <select v-model="form.brandId" required class="field" :disabled="isEdit">
            <option value="" disabled>Selecciona una marca</option>
            <option v-for="b in brands" :key="b.id" :value="b.id">
              {{ b.isHouseBrand ? `Propio — ${b.name}` : b.name }}
            </option>
          </select>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Categoría</label>
          <div class="flex gap-2">
            <select v-model="form.categoryId" class="field">
              <option value="">Sin categoría</option>
              <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
            <button
              type="button"
              class="whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200"
              @click="showNewCategory = !showNewCategory"
            >
              Nueva
            </button>
          </div>
          <div v-if="showNewCategory" class="mt-2 flex gap-2">
            <input v-model="newCategoryName" class="field" placeholder="Nombre de categoría" />
            <button
              type="button"
              class="whitespace-nowrap rounded-lg bg-brand-500 px-3 py-2 text-sm text-white"
              @click="addCategory"
            >
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
        <div v-if="!isEdit">
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad inicial</label>
          <input v-model.number="form.quantity" type="number" min="0" class="field" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Aviso de stock mínimo</label>
          <input v-model.number="form.minStock" type="number" min="0" class="field" />
        </div>
        <div>
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">SKU</label>
          <input
            v-model="form.sku"
            class="field"
            :disabled="isEdit"
            :placeholder="isEdit ? '' : 'Vacío = automático'"
            :class="isEdit ? 'opacity-60' : ''"
          />
        </div>
        <div v-if="isEdit">
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad actual</label>
          <input :value="currentQuantity" disabled class="field opacity-60" />
        </div>
      </div>

      <div>
        <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Imagen (opcional)</label>
        <input type="file" accept="image/*" class="field" @change="onImageChange" />
        <p v-if="uploadingImage" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Subiendo imagen…</p>
        <img
          v-if="imagePreview"
          :src="imagePreview"
          alt="Vista previa"
          class="mt-2 h-24 w-24 rounded-lg object-cover"
        />
      </div>

      <p v-if="error" class="text-sm text-error-500">{{ error }}</p>
      <p v-if="success" class="text-sm text-success-500">{{ success }}</p>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
          :disabled="saving"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="submit"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="saving"
        >
          {{ saving ? 'Guardando…' : 'Guardar' }}
        </button>
      </div>
    </form>
  </component-card>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, {
  createCategory,
  extractApiError,
  fetchCategories,
  uploadProductImage,
  type Brand,
  type Category,
  type Product,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(
  defineProps<{
    mode: 'create' | 'edit'
    brandId?: string | null
    productId?: string | null
    brandName?: string | null
    showBrandSelect?: boolean
  }>(),
  {
    brandId: null,
    productId: null,
    brandName: null,
    showBrandSelect: false,
  },
)

const emit = defineEmits<{
  cancel: []
  saved: []
}>()

const auth = useAuthStore()
const isEdit = computed(() => props.mode === 'edit')

const categories = ref<Category[]>([])
const brands = ref<Brand[]>([])
const showNewCategory = ref(false)
const newCategoryName = ref('')
const uploadingImage = ref(false)
const imagePreview = ref<string | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const currentQuantity = ref(0)

const form = reactive({
  brandId: props.brandId || '',
  categoryId: '',
  name: '',
  description: '',
  price: null as number | null,
  quantity: 0,
  minStock: 5,
  sku: '',
  imageUrl: null as string | null,
})

const cardTitle = computed(() => {
  if (isEdit.value) {
    return props.brandName ? `Editar producto · ${props.brandName}` : 'Editar producto'
  }
  return props.brandName ? `Nuevo producto · ${props.brandName}` : 'Nuevo producto'
})

async function loadCategories() {
  categories.value = await fetchCategories()
}

async function loadBrands() {
  if (!props.showBrandSelect) return
  const { data } = await api.get<Brand[]>('/brands')
  brands.value = data
  if (!form.brandId && data[0]) form.brandId = data[0].id
}

async function loadProduct() {
  if (!props.productId) return
  const { data } = await api.get<Product>(`/products/${props.productId}`)
  form.brandId = data.brandId
  form.categoryId = data.categoryId || ''
  form.name = data.name
  form.description = data.description || ''
  form.price = data.price != null ? Number(data.price) : null
  form.minStock = data.stock?.minStock ?? 5
  form.sku = data.sku
  form.imageUrl = data.imageUrl || null
  imagePreview.value = data.imageUrl || null
  currentQuantity.value = data.stock?.quantity ?? 0
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

async function save() {
  error.value = null
  success.value = null
  if (!form.name.trim() || form.price == null || Number.isNaN(form.price)) {
    error.value = 'Nombre y precio son obligatorios'
    return
  }
  const resolvedBrandId = props.brandId || form.brandId
  if (!isEdit.value && !resolvedBrandId && auth.isAdmin) {
    error.value = 'Selecciona una marca'
    return
  }

  saving.value = true
  try {
    if (isEdit.value && props.productId) {
      await api.patch(`/products/${props.productId}`, {
        name: form.name.trim(),
        categoryId: form.categoryId || null,
        description: form.description.trim() || null,
        price: form.price,
        minStock: form.minStock,
        imageUrl: form.imageUrl,
      })
      success.value = 'Producto actualizado.'
    } else {
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
        await api.post('/products', { ...payload, brandId: resolvedBrandId })
        success.value = 'Producto creado correctamente.'
      } else {
        await api.post('/product-requests', { type: 'CREATE_PRODUCT', ...payload })
        success.value = 'Solicitud de alta enviada para su aprobación.'
      }
    }
    emit('saved')
  } catch (e: unknown) {
    error.value = extractApiError(e, 'No se pudo guardar el producto')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadCategories(), loadBrands(), loadProduct()])
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
