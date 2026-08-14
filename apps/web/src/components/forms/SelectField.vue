<template>
  <div>
    <label :for="inputId" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {{ label }}
    </label>
    <div class="relative z-20 bg-transparent">
      <select
        :id="inputId"
        :value="modelValue"
        :required="required"
        class="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        :class="{ 'text-gray-800 dark:text-white/90': modelValue }"
        @change="onChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="opt in options"
          :key="opt.value"
          :value="opt.value"
          class="text-gray-700 dark:bg-gray-900 dark:text-gray-400"
        >
          {{ opt.label }}
        </option>
      </select>
      <span
        class="pointer-events-none absolute right-4 top-1/2 z-30 -translate-y-1/2 text-gray-700 dark:text-gray-400"
      >
        <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
            stroke=""
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export type SelectOption = { value: string; label: string }

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    options: SelectOption[]
    id?: string
    placeholder?: string
    required?: boolean
  }>(),
  {
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let autoId = 0
const fallbackId = `select-field-${++autoId}`

const inputId = computed(() => props.id ?? fallbackId)

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>
