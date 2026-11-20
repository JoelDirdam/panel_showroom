<script setup lang="ts">
import { nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue'
import type { ImportColumn } from '@/composables/useXlsxImport'
import { useClientPagination } from '@/composables/useClientPagination'
import ImportPreviewTable from '@/components/import/ImportPreviewTable.vue'
import ImportPagination from '@/components/import/ImportPagination.vue'
import {
  validateImportRows,
  type ImportCellErrors,
} from '@/utils/validateImportRows'

const ROW_ID_KEY = '__rowId'

const props = withDefaults(
  defineProps<{
    title: string
    columns: ImportColumn[]
    rows: Record<string, string>[]
    saving?: boolean
    variant?: 'modal' | 'inline'
  }>(),
  {
    saving: false,
    variant: 'modal',
  },
)

const emit = defineEmits<{
  cancel: []
  confirm: [rows: Record<string, string>[]]
}>()

const localRows = ref<Record<string, string>[]>([])
const cellErrors = ref<ImportCellErrors>({})
const validationError = shallowRef<string | null>(null)
const focusedRowIndex = shallowRef<number | null>(null)
const tableWrap = useTemplateRef<HTMLElement>('tableWrap')

const {
  currentPage,
  pageSize,
  total,
  totalPages,
  pagedItems,
  rangeStart,
  rangeEnd,
  goToPage,
  goToIndex,
} = useClientPagination(() => localRows.value)

watch(
  () => props.rows,
  (rows) => {
    localRows.value = rows.map((row) => ({
      ...row,
      [ROW_ID_KEY]: crypto.randomUUID(),
    }))
    cellErrors.value = {}
    validationError.value = null
    focusedRowIndex.value = null
    goToPage(1)
  },
  { immediate: true, deep: true },
)

function stripRowId(row: Record<string, string>): Record<string, string> {
  const { [ROW_ID_KEY]: _id, ...rest } = row
  return rest
}

function clearCellError(globalIndex: number, key: string) {
  const id = `${globalIndex}:${key}`
  if (!(id in cellErrors.value)) return
  const next = { ...cellErrors.value }
  delete next[id]
  cellErrors.value = next
  if (Object.keys(next).length === 0) {
    validationError.value = null
    focusedRowIndex.value = null
  }
}

function removeRow(globalIndex: number) {
  localRows.value.splice(globalIndex, 1)
  cellErrors.value = {}
  validationError.value = null
  focusedRowIndex.value = null
}

function focusCell(rowIndex: number, key: string) {
  const root = tableWrap.value
  if (!root) return
  const rowEl = root.querySelector(`[data-import-row="${rowIndex}"]`)
  if (!(rowEl instanceof HTMLElement)) return
  rowEl.scrollIntoView({ block: 'nearest' })
  const wrap = rowEl.querySelector(`[data-import-field="${key}"]`)
  const focusable =
    wrap instanceof HTMLElement && wrap.matches('input, select, button, [tabindex]')
      ? wrap
      : wrap?.querySelector('input, select, button, [tabindex]')
  if (focusable instanceof HTMLElement) focusable.focus()
}

async function confirm() {
  const result = validateImportRows(localRows.value, props.columns)
  cellErrors.value = result.cellErrors
  if (result.firstError) {
    const { rowIndex, label, message } = result.firstError
    const n = result.errorRowCount
    validationError.value = `Hay ${n} fila(s) con error. Fila ${rowIndex + 1}: ${label} — ${message}`
    focusedRowIndex.value = rowIndex
    goToIndex(rowIndex)
    await nextTick()
    await nextTick()
    focusCell(rowIndex, result.firstError.key)
    return
  }
  validationError.value = null
  focusedRowIndex.value = null
  emit(
    'confirm',
    localRows.value.map((row) => stripRowId(row)),
  )
}
</script>

<template>
  <div
    :class="
      variant === 'modal'
        ? 'fixed inset-0 z-99999 flex items-start justify-center overflow-y-auto bg-black/50 p-4'
        : 'w-full'
    "
    @click.self="variant === 'modal' ? emit('cancel') : undefined"
  >
    <div
      :class="
        variant === 'modal'
          ? 'mt-8 w-full max-w-5xl rounded-2xl bg-white p-6 dark:bg-gray-900'
          : 'w-full'
      "
    >
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white">{{ title }}</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Revisa y edita los datos antes de guardar. {{ localRows.length }} fila(s).
      </p>

      <div ref="tableWrap">
        <ImportPreviewTable
          :columns="columns"
          :rows="pagedItems"
          :start-index="(currentPage - 1) * pageSize"
          :cell-errors="cellErrors"
          :focused-row-index="focusedRowIndex"
          @field-edit="clearCellError"
          @remove="removeRow"
        />
      </div>

      <ImportPagination
        v-if="total > pageSize"
        :current-page="currentPage"
        :total-pages="totalPages"
        :range-start="rangeStart"
        :range-end="rangeEnd"
        :total="total"
        @go-to-page="goToPage"
      />

      <p v-if="validationError" class="mt-3 text-sm text-error-500">{{ validationError }}</p>

      <div class="mt-5 flex justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-gray-600"
          :disabled="saving"
          @click="emit('cancel')"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="ui-btn ui-btn-primary"
          :disabled="saving || localRows.length === 0"
          @click="confirm"
        >
          {{ saving ? 'Guardando…' : 'Guardar e importar' }}
        </button>
      </div>
    </div>
  </div>
</template>
