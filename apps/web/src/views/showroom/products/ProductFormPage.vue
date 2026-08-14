<template>
  <admin-layout>
    <page-breadcrumb :page-title="pageTitle" :items="breadcrumbItems" />
    <product-form
      :mode="mode"
      :brand-id="brandId"
      :product-id="productId"
      :brand-name="brand?.name"
      :show-brand-select="showBrandSelect"
      @cancel="goBack"
      @saved="goBack"
    />
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ProductForm from '@/components/products/ProductForm.vue'
import api, { type Brand } from '@/services/api'

const route = useRoute()
const router = useRouter()

const brandId = computed(() =>
  typeof route.params.id === 'string' && route.path.includes('/brands/')
    ? route.params.id
    : null,
)
const productId = computed(() =>
  typeof route.params.productId === 'string' ? route.params.productId : null,
)
const mode = computed<'create' | 'edit'>(() => (productId.value ? 'edit' : 'create'))
const showBrandSelect = computed(() => !brandId.value && mode.value === 'create')

const brand = ref<Brand | null>(null)

const pageTitle = computed(() => (mode.value === 'edit' ? 'Editar producto' : 'Agregar producto'))

const breadcrumbItems = computed(() => {
  if (brandId.value && brand.value) {
    return [
      { label: 'Marcas', to: '/brands' },
      { label: brand.value.name, to: `/brands/${brandId.value}/products` },
    ]
  }
  return [{ label: 'Productos', to: '/products' }]
})

function goBack() {
  if (brandId.value) {
    router.push(`/brands/${brandId.value}/products`)
  } else {
    router.push('/products')
  }
}

onMounted(async () => {
  if (brandId.value) {
    const { data } = await api.get<Brand>(`/brands/${brandId.value}`)
    brand.value = data
  }
})
</script>
