<template>
  <div class="flex flex-col items-center px-4 py-10 text-center">
    <div
      v-if="$slots.icon"
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-500 dark:bg-brand-500/15"
      aria-hidden="true"
    >
      <slot name="icon" />
    </div>
    <p class="text-base font-semibold text-gray-900 dark:text-white">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-5 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
