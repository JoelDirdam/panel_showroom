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

      <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div class="shrink-0">
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Imagen (opcional)</label>
          <ProductImageDropzone
            :preview-url="imagePreview"
            :uploading="uploadingImage"
            @file="onImageFile"
            @error="(msg) => (error = msg)"
          />
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Nombre <span class="text-error-500">*</span>
            </label>
            <input v-model="form.name" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Categoría</label>
            <CategoryAutocompleteInput
              ref="categoryInputRef"
              v-model="form.categoryId"
              :categories="categories"
              @category-created="loadCategories"
            />
          </div>
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
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Inventario actual</label>
          <p class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-200">
            En inventario: <strong>{{ currentQuantity }}</strong> uds
          </p>
        </div>
        <div v-if="isEdit">
          <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cantidad a agregar</label>
          <input v-model.number="addQuantity" type="number" min="0" class="field" />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Solo indica las unidades nuevas.
          </p>
        </div>
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
          class="ui-btn ui-btn-primary"
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
import CategoryAutocompleteInput from '@/components/products/CategoryAutocompleteInput.vue'
import ProductImageDropzone from '@/components/products/ProductImageDropzone.vue'
import api, {
  extractApiError,
  fetchCategories,
  uploadProductImage,
  type Brand,
  type Category,
  type Product,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { resolveUploadUrl } from '@/utils/mediaUrl'

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
const categoryInputRef = ref<InstanceType<typeof CategoryAutocompleteInput> | null>(null)
const uploadingImage = ref(false)
const imagePreview = ref<string | null>(null)
const saving = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const currentQuantity = ref(0)
const addQuantity = ref(0)

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
  imagePreview.value = resolveUploadUrl(data.imageUrl)
  currentQuantity.value = data.stock?.quantity ?? 0
}

async function onImageFile(file: File) {
  uploadingImage.value = true
  error.value = null
  const localPreview = URL.createObjectURL(file)
  imagePreview.value = localPreview
  try {
    form.imageUrl = await uploadProductImage(file)
    URL.revokeObjectURL(localPreview)
    imagePreview.value = resolveUploadUrl(form.imageUrl)
  } catch {
    error.value = 'No se pudo subir la imagen'
    URL.revokeObjectURL(localPreview)
    imagePreview.value = resolveUploadUrl(form.imageUrl)
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
    const categoryId = await categoryInputRef.value?.resolveCategoryId() ?? null

    if (isEdit.value && props.productId) {
      await api.patch(`/products/${props.productId}`, {
        name: form.name.trim(),
        categoryId,
        description: form.description.trim() || null,
        price: form.price,
        minStock: form.minStock,
        imageUrl: form.imageUrl,
      })
      if (addQuantity.value > 0) {
        if (auth.isAdmin) {
          await api.post(`/stock/${props.productId}/entries`, {
            quantity: addQuantity.value,
            note: 'Agregado desde edición de producto',
          })
        } else {
          await api.post('/product-requests', {
            type: 'RESTOCK',
            productId: props.productId,
            quantity: addQuantity.value,
            notes: 'Agregado desde edición de producto',
          })
        }
      }
      success.value =
        addQuantity.value > 0
          ? auth.isAdmin
            ? 'Producto actualizado y stock agregado.'
            : 'Producto actualizado. Solicitud de restock enviada.'
          : 'Producto actualizado.'
    } else {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim() || undefined,
        categoryId,
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
@reference "../../assets/main.css";

.field {
  @apply ui-input;
}

</style>
