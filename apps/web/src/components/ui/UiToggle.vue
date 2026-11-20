<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="ariaLabel"
    :disabled="disabled"
    class="inline-flex min-h-11 items-center gap-3 rounded-[10px] text-sm font-medium text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-200 md:min-h-9"
    @click="model = !model"
  >
    <span
      :class="[
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
        model ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700',
      ]"
      aria-hidden="true"
    >
      <span
        :class="[
          'inline-block h-5 w-5 rounded-full bg-white shadow-theme-sm transition-transform',
          model ? 'translate-x-6' : 'translate-x-1',
        ]"
      />
    </span>
    <span v-if="onLabel || offLabel">{{ model ? onLabel : offLabel }}</span>
    <slot />
  </button>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ default: false })
defineProps<{
  id?: string
  onLabel?: string
  offLabel?: string
  ariaLabel?: string
  disabled?: boolean
}>()
</script>
