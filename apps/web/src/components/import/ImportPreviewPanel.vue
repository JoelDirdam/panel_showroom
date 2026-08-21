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
            <tr v-for="(row, idx) in localRows" :key="idx" class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-2 pr-2 text-gray-400">{{ idx + 1 }}</td>
              <td v-for="col in columns" :key="col.key" class="py-2 pr-2">
                <CutoffDaySlotsPicker
                  v-if="col.type === 'day-slots'"
                  compact
                  :model-value="parseSlots(row[col.key])"
                  :max-selectable="col.maxSelectable ?? 2"
                  :disabled="!!col.disabled"
                  :invalid="rowError(idx, col.key)"
                  @update:model-value="(slots) => (row[col.key] = serializeSlots(slots))"
                />
                <select
                  v-else-if="col.type === 'select'"
                  v-model="row[col.key]"
                  class="field"
                  :class="rowError(idx, col.key) ? 'border-error-500' : ''"
                >
                  <option value="" disabled>Selecciona…</option>
                  <option v-for="opt in col.options || []" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <input
                  v-else
                  v-model="row[col.key]"
                  class="field"
                  :class="rowError(idx, col.key) ? 'border-error-500' : ''"
                />
              </td>
              <td class="py-2">
                <button type="button" class="text-xs text-error-500 hover:underline" @click="removeRow(idx)">
                  Quitar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

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
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="saving || localRows.length === 0"
          @click="confirm"
        >
          {{ saving ? 'Guardando…' : 'Guardar e importar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ImportColumn } from '@/composables/useXlsxImport'
import CutoffDaySlotsPicker from '@/components/brands/CutoffDaySlotsPicker.vue'
import { parseCutoffSlotsCsv, serializeCutoffSlots } from '@/utils/cutoffDays'

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
const validationError = ref<string | null>(null)
const invalidCells = ref<Set<string>>(new Set())

watch(
  () => props.rows,
  (rows) => {
    localRows.value = rows.map((r) => ({ ...r }))
    validationError.value = null
    invalidCells.value = new Set()
  },
  { immediate: true, deep: true },
)

function parseSlots(value: string | undefined) {
  return parseCutoffSlotsCsv(value || '')
}

function serializeSlots(slots: number[]) {
  return serializeCutoffSlots(slots)
}

function rowError(idx: number, key: string) {
  return invalidCells.value.has(`${idx}:${key}`)
}

function removeRow(idx: number) {
  localRows.value.splice(idx, 1)
}

function isEmptyRequired(col: ImportColumn, value: string | undefined) {
  if (col.type === 'day-slots') {
    return parseCutoffSlotsCsv(value || '').length === 0
  }
  return !String(value ?? '').trim()
}

function confirm() {
  validationError.value = null
  const next = new Set<string>()
  for (let i = 0; i < localRows.value.length; i++) {
    for (const col of props.columns) {
      if (col.required && isEmptyRequired(col, localRows.value[i][col.key])) {
        next.add(`${i}:${col.key}`)
      }
    }
  }
  invalidCells.value = next
  if (next.size > 0) {
    validationError.value = 'Completa los campos obligatorios marcados.'
    return
  }
  emit(
    'confirm',
    localRows.value.map((r) => ({ ...r })),
  )
}
</script>

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
