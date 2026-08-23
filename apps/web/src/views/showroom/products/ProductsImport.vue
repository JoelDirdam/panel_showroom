<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ImportPreviewPanel from '@/components/import/ImportPreviewPanel.vue'
import XlsxDropzone from '@/components/import/XlsxDropzone.vue'
import api, {
  downloadProductsTemplate,
  extractApiError,
  importProductsRows,
  type Brand,
} from '@/services/api'
import { parseSpreadsheetFile, type ImportColumn } from '@/composables/useXlsxImport'
import {
  brandDisplayName,
  resolveBrandRef,
  sortBrandsForImport,
} from '@/utils/brandImportRef'

const router = useRouter()
const route = useRoute()

const scopedBrandId = computed(() =>
  typeof route.params.id === 'string' && route.path.includes('/brands/') ? route.params.id : '',
)

const brands = ref<Brand[]>([])
const scopedBrand = ref<Brand | null>(null)
const importPreview = ref<Record<string, string>[] | null>(null)
const importSaving = ref(false)
const errorBanner = ref<string | null>(null)

const importBrands = computed(() => sortBrandsForImport(brands.value))

const listPath = computed(() =>
  scopedBrandId.value ? `/brands/${scopedBrandId.value}/products` : '/products',
)

const breadcrumbItems = computed(() => {
  if (scopedBrandId.value && scopedBrand.value) {
    return [
      { label: 'Marcas', to: '/brands' },
      { label: scopedBrand.value.name, to: `/brands/${scopedBrandId.value}/products` },
    ]
  }
  return [{ label: 'Productos', to: '/products' }]
})

const productImportColumns = computed<ImportColumn[]>(() => {
  const columns: ImportColumn[] = [
    { key: 'name', label: 'Nombre', required: true },
    { key: 'price', label: 'Precio', required: true },
    { key: 'quantity', label: 'Stock' },
    { key: 'sku', label: 'SKU' },
    { key: 'minStock', label: 'Stock mín.' },
    { key: 'description', label: 'Descripción' },
  ]
  if (!scopedBrandId.value) {
    columns.push({
      key: 'brandId',
      label: 'Marca',
      required: true,
      type: 'select',
      options: importBrands.value.map((brand) => ({
        value: brand.id,
        label: brandDisplayName(brand),
      })),
    })
  }
  return columns
})

function rowValue(row: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value?.trim()) return value.trim()
  }
  return ''
}

async function loadBrands() {
  errorBanner.value = null
  try {
    if (scopedBrandId.value) {
      const { data } = await api.get<Brand>(`/brands/${scopedBrandId.value}`)
      scopedBrand.value = data
      brands.value = [data]
      return
    }
    const { data } = await api.get<Brand[]>('/brands')
    brands.value = data
  } catch (e: unknown) {
    errorBanner.value = extractApiError(e, 'No se pudieron cargar las marcas')
  }
}

async function onDownloadTemplate() {
  errorBanner.value = null
  try {
    const blob = await downloadProductsTemplate(scopedBrandId.value || undefined)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-productos.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    errorBanner.value = extractApiError(e, 'No se pudo descargar la plantilla')
  }
}

function onDropError(message: string) {
  errorBanner.value = message
}

async function onXlsxFile(file: File) {
  errorBanner.value = null
  try {
    if (!scopedBrandId.value && !brands.value.length) {
      await loadBrands()
    }
    const { rows } = await parseSpreadsheetFile(file)
    const sorted = importBrands.value
    const mapped = rows.map((row) => {
      const rawBrand = rowValue(row, 'marca', 'brand', 'brandid')
      return {
        name: rowValue(row, 'nombre', 'name', 'producto'),
        price: rowValue(row, 'precio', 'price'),
        quantity: rowValue(row, 'stock', 'quantity') || '0',
        sku: rowValue(row, 'sku'),
        minStock: rowValue(row, 'stock_min', 'minstock', 'min_stock') || '5',
        description: rowValue(row, 'descripcion', 'description'),
        brandId: scopedBrandId.value || resolveBrandRef(rawBrand, sorted) || '',
      }
    })
    if (!mapped.length) {
      errorBanner.value = 'El archivo no tiene filas de datos'
      return
    }
    importPreview.value = mapped
  } catch (e: unknown) {
    errorBanner.value = extractApiError(e, 'No se pudo leer el archivo')
  }
}

function clearPreview() {
  importPreview.value = null
  errorBanner.value = null
}

async function confirmImport(rows: Record<string, string>[]) {
  importSaving.value = true
  errorBanner.value = null
  try {
    const result = await importProductsRows(
      rows.map((row) => ({
        name: row.name,
        price: Number(row.price),
        quantity: Number(row.quantity) || 0,
        sku: row.sku || undefined,
        minStock: Number(row.minStock) || 5,
        description: row.description || undefined,
        brandId: scopedBrandId.value || row.brandId,
      })),
      scopedBrandId.value || undefined,
    )
    sessionStorage.setItem('productsImportResult', JSON.stringify(result))
    await router.push(listPath.value)
  } catch (e: unknown) {
    errorBanner.value = extractApiError(e, 'No se pudo importar el archivo')
  } finally {
    importSaving.value = false
  }
}

onMounted(loadBrands)
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb page-title="Importar productos" :items="breadcrumbItems" />

    <ComponentCard title="Importar productos">
      <div class="space-y-6">
        <div class="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Cómo importar</h3>
          <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
            <li>Descarga la plantilla Excel.</li>
            <li v-if="scopedBrandId">
              Llénala con: nombre, precio, stock, SKU, stock mínimo y descripción. Todos los
              productos se asignarán a esta marca.
            </li>
            <li v-else>
              Llénala con: nombre, precio, stock, SKU, stock mínimo, descripción y marca (nombre o
              número # de la hoja Marcas).
            </li>
            <li>Arrastra el archivo .xlsx aquí. Después podrás revisar y editar las filas.</li>
          </ol>
          <button
            type="button"
            class="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            @click="onDownloadTemplate"
          >
            Descargar plantilla
          </button>
        </div>

        <p
          v-if="errorBanner"
          class="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600 dark:border-error-500/30 dark:bg-error-500/10"
        >
          {{ errorBanner }}
        </p>

        <XlsxDropzone v-if="!importPreview" @file="onXlsxFile" @error="onDropError" />

        <div v-else>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Archivo cargado. Revisa los datos y guarda.
            </p>
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              :disabled="importSaving"
              @click="clearPreview"
            >
              Cambiar archivo
            </button>
          </div>

          <ImportPreviewPanel
            variant="inline"
            title="Previsualizar productos"
            :columns="productImportColumns"
            :rows="importPreview"
            :saving="importSaving"
            @cancel="router.push(listPath)"
            @confirm="confirmImport"
          />
        </div>
      </div>
    </ComponentCard>
  </AdminLayout>
</template>
