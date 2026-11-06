<template>
  <div class="cutoff-picker">
    <!-- Solo lectura / preferencias: únicamente los días ya elegidos -->
    <div v-if="disabled" class="flex flex-wrap items-center gap-1.5">
      <span
        v-if="selected.length === 0"
        class="text-sm text-gray-400"
        :class="invalid ? 'text-error-500' : ''"
      >
        Sin días
      </span>
      <span
        v-for="day in selected"
        :key="day"
        class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand-500 px-2 text-sm font-medium text-white"
      >
        {{ day }}
      </span>
    </div>

    <!-- Editable: resumen + abrir calendario -->
    <button
      v-else
      type="button"
      class="inline-flex min-h-9 w-full max-w-xs items-center justify-between gap-2 rounded-lg border px-3 py-1.5 text-left text-sm transition hover:border-brand-500 dark:bg-gray-800"
      :class="
        invalid
          ? 'border-error-500 text-error-600'
          : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'
      "
      @click="openDialog"
    >
      <span class="flex flex-wrap items-center gap-1.5">
        <template v-if="selected.length">
          <span
            v-for="day in selected"
            :key="day"
            class="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-500 px-1.5 text-xs font-medium text-white"
          >
            {{ day }}
          </span>
        </template>
        <span v-else class="text-gray-400">Elegir día(s)…</span>
      </span>
      <svg class="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fill-rule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <p v-if="hint && !open" class="mt-2 text-xs text-gray-400">{{ hint }}</p>

    <!-- Popup calendario -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4"
        @click.self="cancelDialog"
      >
        <div
          class="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cutoff-calendar-title"
        >
          <h3 id="cutoff-calendar-title" class="text-base font-semibold text-gray-800 dark:text-white">
            Días de corte
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Elige hasta {{ maxSelectable }} día{{ maxSelectable === 1 ? '' : 's' }} del mes.
            <template v-if="draft.length"> Seleccionados: {{ draftLabel }}.</template>
          </p>

          <div class="mt-4 grid grid-cols-7 gap-1.5">
            <button
              v-for="day in days"
              :key="day"
              type="button"
              class="flex h-9 items-center justify-center rounded-lg text-sm font-medium transition"
              :class="
                draft.includes(day)
                  ? 'bg-brand-500 text-white'
                  : 'border border-gray-200 text-gray-700 hover:border-brand-500 dark:border-gray-700 dark:text-gray-200'
              "
              @click="toggleDraft(day)"
            >
              {{ day }}
            </button>
          </div>

          <p class="mt-3 text-xs text-gray-400">
            Si eliges 29, 30 o 31 en un mes más corto, el corte se recorre al último día real.
          </p>

          <div class="mt-5 flex justify-end gap-2">
            <button
              type="button"
              class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
              @click="cancelDialog"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="draft.length === 0"
              @click="confirmDialog"
            >
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: number[]
    maxSelectable?: number
    disabled?: boolean
    /** @deprecated Grid inline replaced by popup; kept for call-site compat. */
    compact?: boolean
    invalid?: boolean
    hint?: string
  }>(),
  {
    maxSelectable: 2,
    disabled: false,
    compact: false,
    invalid: false,
    hint: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: number[]]
}>()

const days = Array.from({ length: 31 }, (_, i) => i + 1)
const open = ref(false)
const draft = ref<number[]>([])

const selected = computed(() => [...props.modelValue].sort((a, b) => a - b))
const draftLabel = computed(() => [...draft.value].sort((a, b) => a - b).join(', '))

watch(
  () => props.modelValue,
  (value) => {
    if (!open.value) draft.value = [...value].sort((a, b) => a - b)
  },
)

function openDialog() {
  if (props.disabled) return
  draft.value = [...props.modelValue].sort((a, b) => a - b)
  open.value = true
}

function cancelDialog() {
  open.value = false
  draft.value = [...props.modelValue].sort((a, b) => a - b)
}

function confirmDialog() {
  if (draft.value.length === 0) return
  emit(
    'update:modelValue',
    [...draft.value].sort((a, b) => a - b),
  )
  open.value = false
}

function toggleDraft(day: number) {
  const next = new Set(draft.value)
  if (next.has(day)) {
    next.delete(day)
  } else {
    if (props.maxSelectable > 0 && next.size >= props.maxSelectable) {
      const sorted = [...next].sort((a, b) => a - b)
      next.delete(sorted[0])
    }
    next.add(day)
  }
  draft.value = [...next].sort((a, b) => a - b)
}
</script>
