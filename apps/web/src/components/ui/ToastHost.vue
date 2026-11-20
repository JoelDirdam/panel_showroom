<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-0 z-[100001] flex flex-col items-center gap-2 p-4 pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:items-end lg:pb-6"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup
      enter-from-class="translate-y-2 opacity-0"
      enter-active-class="transition duration-200 ease-out"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-for="t in toastState.items"
        :key="t.id"
        :role="t.tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-pop dark:border-gray-700 dark:bg-gray-900"
      >
        <span
          :class="[
            'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            t.tone === 'success' && 'bg-success-50 text-success-600',
            t.tone === 'error' && 'bg-error-50 text-error-600',
            t.tone === 'info' && 'bg-brand-50 text-brand-500',
          ]"
          aria-hidden="true"
        >
          <svg v-if="t.tone === 'success'" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clip-rule="evenodd" />
          </svg>
          <svg v-else-if="t.tone === 'error'" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 11H9v2h2v-2Zm0-8H9v6h2V5Z" clip-rule="evenodd" />
          </svg>
          <svg v-else class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 7H9v6h2V9Zm0-4H9v2h2V5Z" clip-rule="evenodd" />
          </svg>
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t.title }}</p>
          <p v-if="t.description" class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ t.description }}</p>
        </div>
        <button
          type="button"
          class="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          aria-label="Cerrar aviso"
          @click="dismissToast(t.id)"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { dismissToast, toastState } from '@/composables/useToast'
</script>
