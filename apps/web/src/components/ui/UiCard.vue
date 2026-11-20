<template>
  <section :class="['ui-card', $attrs.class]" :aria-labelledby="title ? headingId : undefined">
    <header
      v-if="title || $slots.actions || $slots.header"
      class="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6"
    >
      <slot name="header">
        <div class="min-w-0">
          <h2 :id="headingId" class="text-[17px] font-semibold text-gray-900 dark:text-white">
            {{ title }}
          </h2>
          <p v-if="description" class="mt-1 max-w-prose text-sm text-gray-500 dark:text-gray-400">
            {{ description }}
          </p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div :class="flush ? 'mt-4' : 'p-5 sm:p-6'">
      <slot />
    </div>
    <footer
      v-if="$slots.footer"
      class="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue'

defineOptions({ inheritAttrs: false })
defineProps<{ title?: string; description?: string; flush?: boolean }>()
const headingId = `card-${useId()}`
</script>
