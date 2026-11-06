<template>
  <div :class="disabled ? 'opacity-50' : undefined">
    <label :for="inputId" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      {{ label }}
    </label>
    <div class="relative">
      <div class="absolute">
        <select
          v-model="country"
          :disabled="disabled"
          class="appearance-none rounded-l-lg border-0 border-r border-gray-200 bg-transparent bg-none py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400 disabled:cursor-not-allowed"
          @change="onCountryChange"
        >
          <option v-for="opt in PHONE_COUNTRY_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
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
        v-model="displayValue"
        type="tel"
        :placeholder="placeholder"
        :disabled="disabled"
        maxlength="20"
        class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent py-3 pl-[84px] pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50"
        @input="onInput"
      />
    </div>
    <p v-if="hint" class="mt-1 text-xs text-gray-400">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, useId } from 'vue'
import {
  formatPhone,
  parseDisplayInput,
  parsePhone,
  PHONE_COUNTRY_OPTIONS,
  toDisplayValue,
  type PhoneCountry,
} from '@/composables/usePhonePrefix'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label?: string
    id?: string
    placeholder?: string
    hint?: string
    disabled?: boolean
  }>(),
  {
    label: 'Teléfono',
    placeholder: '+52',
    disabled: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const generatedId = useId()
const inputId = computed(() => props.id ?? generatedId)

const country = ref<PhoneCountry>('MX')
const displayValue = ref('+52')
const syncing = ref(false)

function emitStored() {
  if (syncing.value || props.disabled) return
  const parsed = parseDisplayInput(displayValue.value, country.value)
  country.value = parsed.country
  emit('update:modelValue', formatPhone(parsed.country, parsed.local))
}

function onInput() {
  emitStored()
}

function onCountryChange() {
  if (props.disabled) return
  const parsed = parseDisplayInput(displayValue.value, country.value)
  // Keep national digits when switching country; reset prefix in the field
  displayValue.value = toDisplayValue(country.value, parsed.local)
  emit('update:modelValue', formatPhone(country.value, parsed.local))
}

function syncFromModel(value: string) {
  syncing.value = true
  if (!value) {
    country.value = 'MX'
    displayValue.value = toDisplayValue('MX', '')
  } else {
    const parsed = parsePhone(value)
    country.value = parsed.country
    displayValue.value = toDisplayValue(parsed.country, parsed.local)
  }
  syncing.value = false
}

watch(
  () => props.modelValue,
  (value) => {
    const currentStored = formatPhone(
      country.value,
      parseDisplayInput(displayValue.value, country.value).local,
    )
    if (value === currentStored) return
    syncFromModel(value)
  },
  { immediate: true },
)
</script>
