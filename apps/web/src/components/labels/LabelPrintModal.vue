<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4"
    @click.self="close"
  >
    <div class="w-full max-w-lg rounded-2xl bg-white p-6 dark:bg-gray-900">
      <h3 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white">Imprimir etiquetas</h3>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        {{ items.length }} producto{{ items.length === 1 ? '' : 's' }} seleccionado{{ items.length === 1 ? '' : 's' }}
        · {{ totalLabels }} etiqueta{{ totalLabels === 1 ? '' : 's' }} en total
      </p>

      <div class="space-y-3">
        <label
          v-for="size in sizeOptions"
          :key="size.id"
          class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors"
          :class="
            selectedSizeId === size.id
              ? 'border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-500/10'
              : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/5'
          "
        >
          <input v-model="selectedSizeId" type="radio" :value="size.id" class="mt-1" />
          <span class="flex-1">
            <span class="block font-medium text-gray-800 dark:text-white">{{ size.label }}</span>
            <span class="block text-xs text-gray-500 dark:text-gray-400">{{ size.description }}</span>
            <a
              :href="size.rollUrl"
              target="_blank"
              rel="noopener"
              class="mt-1 inline-block text-xs text-brand-500 hover:underline"
              @click.stop
            >
              Ver rollos recomendados
            </a>
          </span>
        </label>
      </div>

      <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
        El PDF se genera con una etiqueta por página, lista para tu impresora de rollo continuo.
        Ajusta la escala al 100% (sin "ajustar a página") en el diálogo de impresión.
      </p>

      <div class="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
          @click="close"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          :disabled="items.length === 0"
          @click="download"
        >
          Descargar PDF
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          :disabled="items.length === 0"
          @click="print"
        >
          Imprimir
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  LABEL_SIZE_OPTIONS,
  downloadPdfBlob,
  generateLabelsPdf,
  printPdfBlob,
  type LabelPrintItem,
  type LabelSizeId,
} from '@/utils/labelPdf'

const props = defineProps<{
  modelValue: boolean
  items: LabelPrintItem[]
  defaultSizeId?: LabelSizeId | null
}>()

const emit = defineEmits<{ (e: 'update:modelValue', value: boolean): void }>()

const sizeOptions = LABEL_SIZE_OPTIONS
const selectedSizeId = ref<LabelSizeId>(props.defaultSizeId || '58x13')

watch(
  () => props.modelValue,
  (open) => {
    if (open) selectedSizeId.value = props.defaultSizeId || '58x13'
  },
)

const totalLabels = computed(() =>
  props.items.reduce((sum, item) => sum + Math.max(1, Math.round(item.quantity ?? 1)), 0),
)

function close() {
  emit('update:modelValue', false)
}

function buildPdf() {
  return generateLabelsPdf(props.items, selectedSizeId.value)
}

function print() {
  printPdfBlob(buildPdf())
  close()
}

function download() {
  downloadPdfBlob(buildPdf(), `etiquetas-${selectedSizeId.value}.pdf`)
}
</script>
