<template>
  <div>
    <label :for="inputId" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {{ label }}
    </label>
    <div class="relative">
      <div class="absolute">
        <select
          v-model="country"
          class="appearance-none rounded-l-lg border-0 border-r border-gray-200 bg-transparent bg-none py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400"
          @change="emitCombined"
        >
          <option v-for="opt in PHONE_COUNTRY_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }} ({{ opt.prefix }})
          </option>
        </select>
        <div
          class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-700 dark:text-gray-400"
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
        </div>
      </div>
      <input
        :id="inputId"
        v-model="localNumber"
        type="tel"
        :placeholder="placeholder"
        maxlength="15"
        class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-3 pl-[108px] pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        @input="emitCombined"
      />
    </div>
    <p v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  formatPhone,
  parsePhone,
  PHONE_COUNTRY_OPTIONS,
  type PhoneCountry,
} from '@/composables/usePhonePrefix'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    id?: string
    placeholder?: string
    hint?: string
  }>(),
  {
    label: 'Teléfono',
    placeholder: '5512345678',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

let autoId = 0
const fallbackId = `phone-field-${++autoId}`

const inputId = computed(() => props.id ?? fallbackId)

const country = ref<PhoneCountry>('MX')
const localNumber = ref('')
const syncing = ref(false)

function emitCombined() {
  if (syncing.value) return
  emit('update:modelValue', formatPhone(country.value, localNumber.value))
}

function syncFromModel(value: string) {
  syncing.value = true
  const parsed = parsePhone(value)
  country.value = parsed.country
  localNumber.value = parsed.local
  syncing.value = false
}

watch(
  () => props.modelValue,
  (value) => syncFromModel(value),
  { immediate: true },
)
</script>
