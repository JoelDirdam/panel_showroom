<template>
  <label
    :for="inputId"
    class="flex cursor-pointer select-none text-sm font-normal text-gray-700 dark:text-gray-400"
    :class="align === 'center' ? 'items-center' : 'items-start'"
  >
    <div class="relative">
      <input
        :id="inputId"
        type="checkbox"
        class="sr-only"
        :checked="modelValue"
        :disabled="disabled"
        :required="required"
        @change="onChange"
      />
      <div
        class="mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px] hover:border-brand-500 dark:hover:border-brand-500"
        :class="
          modelValue
            ? 'border-brand-500 bg-brand-500'
            : disabled
              ? 'border-gray-200 bg-transparent dark:border-gray-800'
              : 'border-gray-300 bg-transparent dark:border-gray-700'
        "
      >
        <CheckIcon v-if="modelValue" class="h-3.5 w-3.5 text-white" />
      </div>
    </div>
    <span class="text-gray-600 dark:text-gray-300"><slot /></span>
  </label>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    id?: string
    disabled?: boolean
    required?: boolean
    align?: 'start' | 'center'
  }>(),
  {
    align: 'start',
    disabled: false,
    required: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

let autoId = 0
const fallbackId = `form-checkbox-${++autoId}`

const inputId = computed(() => props.id ?? fallbackId)

function onChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>
