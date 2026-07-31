<template>
  <div>
    <PageBreadcrumb :page-title="title" />
    <ComponentCard :title="title" :desc="description">
      <div
        class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-14 text-center dark:border-gray-700 dark:bg-white/[0.02]"
      >
        <span
          class="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
        >
          Próximamente
        </span>
        <p class="max-w-md text-sm text-gray-500 dark:text-gray-400">
          {{ helperText }}
        </p>
        <p v-if="plan" class="text-xs text-gray-400 dark:text-gray-500">
          Módulo del plan {{ plan }}
        </p>
      </div>
    </ComponentCard>
  </div>
</template>

<script setup lang="ts">
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'

interface Props {
  title: string
  description?: string
  helperText: string
  plan?: string
}

defineProps<Props>()
</script>
