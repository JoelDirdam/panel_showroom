<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white sm:text-[28px] sm:leading-9">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 max-w-2xl text-[15px] text-gray-500 dark:text-gray-400">
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none"
    >
      <slot name="actions" />
    </div>
  </header>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>
