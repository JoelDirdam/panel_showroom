<template>
  <admin-layout>
    <page-breadcrumb
      page-title="Importar marcas"
      :items="[{ label: 'Marcas', to: '/brands' }]"
    />

    <component-card title="Importar marcas">
      <div class="space-y-6">
        <div class="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-white/[0.02]">
          <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Cómo importar</h3>
          <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-400">
            <li>Descarga la plantilla Excel.</li>
            <li>
              Llénala con: nombre, renta mensual, espacio, teléfono, % comisión, email y WhatsApp.
            </li>
            <li>
              Arrastra el archivo .xlsx aquí. Después podrás completar los días de corte y quién paga
              la comisión de tarjeta o transferencia.
            </li>
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

        <p
          v-if="globalCutoffHint"
          class="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ globalCutoffHint }}
        </p>

        <XlsxDropzone v-if="!importPreview" @file="onXlsxFile" @error="onDropError" />

        <div v-else>
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Archivo cargado. Completa los campos extras si aplica y guarda.
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
            title="Previsualizar marcas"
            :columns="brandImportColumns"
            :rows="importPreview"
            :saving="importSaving"
            @cancel="router.push('/brands')"
            @confirm="confirmImport"
          />
        </div>
      </div>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ImportPreviewPanel from '@/components/import/ImportPreviewPanel.vue'
import XlsxDropzone from '@/components/import/XlsxDropzone.vue'
import {
  downloadBrandsTemplate,
  fetchPreferences,
  importBrandsRows,
} from '@/services/api'
import { parseSpreadsheetFile, type ImportColumn } from '@/composables/useXlsxImport'
import { serializeCutoffSlots } from '@/utils/cutoffDays'

const router = useRouter()

const importPreview = ref<Record<string, string>[] | null>(null)
const importSaving = ref(false)
const errorBanner = ref<string | null>(null)
const globalCutoffSlots = ref<number[] | null>(null)

const feePayerOptions = [
  { value: 'BRAND', label: 'Marca' },
  { value: 'CLIENT', label: 'Cliente' },
  { value: 'BUSINESS', label: 'Negocio' },
]

const cutoffLocked = computed(() => (globalCutoffSlots.value?.length ?? 0) > 0)

const globalCutoffHint = computed(() => {
  if (!cutoffLocked.value || !globalCutoffSlots.value) return null
  return `El corte mensual del negocio ya está definido en Preferencias (día(s) ${globalCutoffSlots.value.join(', ')}). Se aplicará a todas las marcas importadas.`
})

const brandImportColumns = computed<ImportColumn[]>(() => [
  { key: 'name', label: 'Nombre', required: true },
  { key: 'monthlyRent', label: 'Renta mensual', required: true },
  { key: 'assignedSpace', label: 'Espacio' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'commissionPercent', label: '% Comisión', required: true },
  { key: 'contactEmail', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  {
    key: 'cutoffDaySlots',
    label: 'Días de corte',
    required: !cutoffLocked.value,
    type: 'day-slots',
    maxSelectable: 2,
    disabled: cutoffLocked.value,
  },
  {
    key: 'cardFeePayer',
    label: 'Comisión tarjeta',
    required: true,
    type: 'select',
    options: feePayerOptions,
  },
  {
    key: 'transferFeePayer',
    label: 'Comisión transferencia',
    required: true,
    type: 'select',
    options: feePayerOptions,
  },
])

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

async function loadPrefs() {
  try {
    const prefs = await fetchPreferences()
    if (prefs.cutoffType === 'MONTHLY_FIXED' && prefs.cutoffDaySlots.length > 0) {
      globalCutoffSlots.value = [...prefs.cutoffDaySlots].sort((a, b) => a - b)
    } else {
      globalCutoffSlots.value = null
    }
  } catch {
    globalCutoffSlots.value = null
  }
}

async function onDownloadTemplate() {
  errorBanner.value = null
  try {
    const blob = await downloadBrandsTemplate()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'plantilla-marcas.xlsx'
    link.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    errorBanner.value = apiError(e, 'No se pudo descargar la plantilla')
  }
}

function onDropError(message: string) {
  errorBanner.value = message
}

async function onXlsxFile(file: File) {
  errorBanner.value = null
  try {
    const { rows } = await parseSpreadsheetFile(file)
    const lockedSlots = cutoffLocked.value ? serializeCutoffSlots(globalCutoffSlots.value || []) : ''
    const mapped = rows.map((row) => ({
      name: row.name || '',
      monthlyRent: row.monthlyrent || '',
      assignedSpace: row.assignedspace || '',
      phone: row.phone || '',
      commissionPercent: row.commissionpercent || '',
      contactEmail: row.contactemail || '',
      whatsapp: row.whatsapp || '',
      cutoffDaySlots: lockedSlots || row.cutoffdayslots || row.cutoffday || '',
      cardFeePayer: row.cardfeepayer || 'BRAND',
      transferFeePayer: row.transferfeepayer || 'BRAND',
    }))
    if (!mapped.length) {
      errorBanner.value = 'El archivo no tiene filas de datos'
      return
    }
    importPreview.value = mapped
  } catch (e: unknown) {
    errorBanner.value = apiError(e, 'No se pudo leer el archivo')
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
    const payload = rows.map((row) => ({
      ...row,
      cutoffDaySlots: cutoffLocked.value
        ? globalCutoffSlots.value
        : row.cutoffDaySlots
            ?.split(/[,;\s]+/)
            .map((p) => parseInt(p, 10))
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31) ?? [],
    }))
    const result = await importBrandsRows(payload)
    await router.push({
      path: '/brands',
      state: { importResult: result },
    })
  } catch (e: unknown) {
    errorBanner.value = apiError(e, 'No se pudo importar el archivo')
  } finally {
    importSaving.value = false
  }
}

onMounted(loadPrefs)
</script>
