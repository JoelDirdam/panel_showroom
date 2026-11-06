<script setup lang="ts">
import type { ImportColumn } from '@/composables/useXlsxImport'
import CutoffDaySlotsPicker from '@/components/brands/CutoffDaySlotsPicker.vue'
import { parseCutoffSlotsCsv, serializeCutoffSlots } from '@/utils/cutoffDays'
import { cellErrorKey, type ImportCellErrors } from '@/utils/validateImportRows'

const props = defineProps<{
  columns: ImportColumn[]
  rows: Record<string, string>[]
  startIndex: number
  cellErrors: ImportCellErrors
  focusedRowIndex: number | null
}>()

const emit = defineEmits<{
  fieldEdit: [globalIndex: number, key: string]
  remove: [globalIndex: number]
}>()

function globalIndex(localIdx: number) {
  return props.startIndex + localIdx
}

function errorFor(rowIndex: number, key: string) {
  return props.cellErrors[cellErrorKey(rowIndex, key)] ?? ''
}

function parseSlots(value: string | undefined) {
  return parseCutoffSlotsCsv(value || '')
}

function onSlots(row: Record<string, string>, globalIdx: number, key: string, slots: number[]) {
  row[key] = serializeCutoffSlots(slots)
  emit('fieldEdit', globalIdx, key)
}

function onInput(row: Record<string, string>, globalIdx: number, key: string, value: string) {
  row[key] = value
  emit('fieldEdit', globalIdx, key)
}

function inputMode(col: ImportColumn): 'numeric' | 'decimal' | 'email' | undefined {
  if (col.kind === 'integer') return 'numeric'
  if (col.kind === 'number' || col.kind === 'percent') return 'decimal'
  if (col.kind === 'email') return 'email'
  return undefined
}
</script>

<template>
  <div class="mt-4 max-h-[60vh] overflow-auto">
    <table class="min-w-full text-sm">
      <thead>
        <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
          <th class="py-2 pr-2">#</th>
          <th v-for="col in columns" :key="col.key" class="py-2 pr-2">
            {{ col.label }}
            <span v-if="col.required" class="text-error-500">*</span>
          </th>
          <th class="py-2"> </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(row, localIdx) in rows"
          :key="row.__rowId || globalIndex(localIdx)"
          class="border-b border-gray-100 dark:border-gray-800"
          :class="focusedRowIndex === globalIndex(localIdx) ? 'bg-error-50 dark:bg-error-500/10' : ''"
          :data-import-row="globalIndex(localIdx)"
        >
          <td class="py-2 pr-2 align-top text-gray-400">{{ globalIndex(localIdx) + 1 }}</td>
          <td v-for="col in columns" :key="col.key" class="py-2 pr-2 align-top">
            <div v-if="col.type === 'day-slots'" :data-import-field="col.key">
              <CutoffDaySlotsPicker
                compact
                :model-value="parseSlots(row[col.key])"
                :max-selectable="col.maxSelectable ?? 2"
                :disabled="!!col.disabled"
                :invalid="!!errorFor(globalIndex(localIdx), col.key)"
                @update:model-value="(slots) => onSlots(row, globalIndex(localIdx), col.key, slots)"
              />
            </div>
            <select
              v-else-if="col.type === 'select'"
              class="field"
              :class="errorFor(globalIndex(localIdx), col.key) ? 'border-error-500' : ''"
              :data-import-field="col.key"
              :value="row[col.key]"
              @change="onInput(row, globalIndex(localIdx), col.key, ($event.target as HTMLSelectElement).value)"
            >
              <option value="" disabled>Selecciona…</option>
              <option v-for="opt in col.options || []" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <input
              v-else
              class="field"
              :class="errorFor(globalIndex(localIdx), col.key) ? 'border-error-500' : ''"
              :data-import-field="col.key"
              :inputmode="inputMode(col)"
              :value="row[col.key]"
              @input="onInput(row, globalIndex(localIdx), col.key, ($event.target as HTMLInputElement).value)"
            />
            <p
              v-if="errorFor(globalIndex(localIdx), col.key)"
              class="mt-1 text-xs text-error-500"
            >
              {{ errorFor(globalIndex(localIdx), col.key) }}
            </p>
          </td>
          <td class="py-2 align-top">
            <button
              type="button"
              class="text-xs text-error-500 hover:underline"
              @click="emit('remove', globalIndex(localIdx))"
            >
              Quitar
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.field {
  width: 100%;
  min-width: 6rem;
  border: 1px solid #d0d5dd;
  border-radius: 0.375rem;
  padding: 0.35rem 0.5rem;
}
:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}
</style>
