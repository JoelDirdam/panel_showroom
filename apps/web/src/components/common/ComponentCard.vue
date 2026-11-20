<template>
  <div
    :class="[
      'ui-card',
      className,
    ]"
  >
    <!-- Card Header -->
    <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6 sm:py-5">
      <div>
        <slot name="title">
          <h3 class="text-[17px] font-semibold text-gray-900 dark:text-white/90">
            {{ title }}
          </h3>
        </slot>
        <p v-if="desc" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ desc }}
        </p>
      </div>
      <slot name="header-action"></slot>
    </div>

    <!-- Card Body -->
    <div v-if="!hideBody" class="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
      <div class="space-y-5">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface Props {
  title?: string
  className?: string
  desc?: string
  hideBody?: boolean
}

defineProps<Props>()
</script>
