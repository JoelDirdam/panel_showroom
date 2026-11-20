<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <MarketingHeader />
    <main id="contenido" tabindex="-1" class="mx-auto max-w-3xl px-6 py-14">
      <h1 class="text-3xl font-bold text-gray-800 dark:text-white">{{ title }}</h1>
      <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Última actualización: {{ updated ?? BUSINESS.legalUpdated }}</p>
      <article
        class="mt-8 space-y-4 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300 [&_a]:text-brand-500 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-800 dark:[&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6 [&_strong]:text-gray-800 dark:[&_strong]:text-gray-100"
      >
        <slot />
      </article>
    </main>
    <MarketingFooter />
  </div>
</template>

<script setup lang="ts">
import MarketingHeader from './MarketingHeader.vue'
import MarketingFooter from './MarketingFooter.vue'
import { BUSINESS } from '@/lib/business'

defineProps<{ title: string; updated?: string }>()
</script>
