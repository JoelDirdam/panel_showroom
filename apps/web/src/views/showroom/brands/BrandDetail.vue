<template>
  <admin-layout>
    <page-breadcrumb :page-title="brand ? brand.name : 'Marca'" />

    <div v-if="!brand" class="text-gray-500 dark:text-gray-400">Cargando…</div>

    <template v-else>
      <div class="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">{{ brand.name }}</h2>
          <p class="mt-1 text-sm" :class="brand.active ? 'text-success-500' : 'text-gray-400'">
            {{ brand.active ? 'Activa' : 'Inactiva' }}
            <span class="ml-2 text-gray-400 dark:text-gray-500">· {{ brand.assignedSpace || 'Sin espacio asignado' }}</span>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            @click="router.push('/brands')"
          >
            Regresar
          </button>
          <router-link
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            :to="`/brands/${brandId}/edit`"
          >
            Editar
          </router-link>
          <button
            type="button"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
            :disabled="downloading"
            @click="downloadInventory"
          >
            {{ downloading ? 'Generando…' : 'Descargar inventario' }}
          </button>
        </div>
      </div>

      <div class="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-800">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
          :class="
            activeTab === tab.id
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          "
          @click="goToTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <BrandSummaryTab v-if="activeTab === 'resumen'" :brand="brand" />
      <BrandProductsTab v-else-if="activeTab === 'productos'" :brand="brand" @changed="loadBrand" />
      <BrandTicketsTab v-else-if="activeTab === 'tickets'" :brand="brand" />
      <BrandLayawaysTab v-else-if="activeTab === 'apartados'" :brand="brand" />
      <BrandOrdersTab v-else-if="activeTab === 'ordenes'" :brand="brand" />
    </template>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import api, { type Brand, type Product } from '@/services/api'
import BrandSummaryTab from './tabs/BrandSummaryTab.vue'
import BrandProductsTab from './tabs/BrandProductsTab.vue'
import BrandTicketsTab from './tabs/BrandTicketsTab.vue'
import BrandLayawaysTab from './tabs/BrandLayawaysTab.vue'
import BrandOrdersTab from './tabs/BrandOrdersTab.vue'

type TabId = 'resumen' | 'productos' | 'tickets' | 'apartados' | 'ordenes'

const route = useRoute()
const router = useRouter()
const brand = ref<Brand | null>(null)
const downloading = ref(false)

const brandId = computed(() => route.params.id as string)

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'productos', label: 'Productos' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'apartados', label: 'Apartados' },
  { id: 'ordenes', label: 'Órdenes' },
]

const activeTab = computed<TabId>(() => {
  if (route.name === 'BrandProducts') return 'productos'
  const tab = route.query.tab
  if (tab === 'tickets' || tab === 'apartados' || tab === 'ordenes') return tab
  return 'resumen'
})

function goToTab(tab: TabId) {
  if (tab === 'productos') {
    router.push(`/brands/${brandId.value}/products`)
    return
  }
  if (tab === 'resumen') {
    router.push(`/brands/${brandId.value}`)
    return
  }
  router.push({ path: `/brands/${brandId.value}`, query: { tab } })
}

async function loadBrand() {
  const { data } = await api.get<Brand>(`/brands/${brandId.value}`)
  brand.value = data
}

async function downloadInventory() {
  downloading.value = true
  try {
    const { data } = await api.get<Product[]>('/products', { params: { brandId: brandId.value } })
    const header = ['SKU', 'Nombre', 'Categoría', 'Precio', 'Stock actual', 'Stock mínimo']
    const rows = data.map((p) => [
      p.sku,
      p.name,
      p.category?.name || '',
      p.price ?? '',
      String(p.stock?.quantity ?? 0),
      String(p.stock?.minStock ?? 0),
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `inventario-${brand.value?.slug || brandId.value}.csv`
    link.click()
    URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

watch(brandId, loadBrand)
onMounted(loadBrand)
</script>
