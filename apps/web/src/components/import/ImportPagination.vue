<script setup lang="ts">
import { computed } from 'vue'

export type PaginationItem = number | 'ellipsis'

const props = defineProps<{
  currentPage: number
  totalPages: number
  rangeStart: number
  rangeEnd: number
  total: number
}>()

const emit = defineEmits<{
  goToPage: [page: number]
}>()

const pageItems = computed<PaginationItem[]>(() => {
  const total = props.totalPages
  const current = props.currentPage
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const marked = new Set([1, total, current, current - 1, current + 1])
  if (current <= 3) {
    marked.add(2)
    marked.add(3)
    marked.add(4)
  }
  if (current >= total - 2) {
    marked.add(total - 1)
    marked.add(total - 2)
    marked.add(total - 3)
  }

  const sorted = [...marked].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const items: PaginationItem[] = []
  for (const page of sorted) {
    const prev = items[items.length - 1]
    if (typeof prev === 'number' && page - prev > 1) items.push('ellipsis')
    items.push(page)
  }
  return items
})

function go(page: number) {
  if (page < 1 || page > props.totalPages || page === props.currentPage) return
  emit('goToPage', page)
}
</script>

<template>
  <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
    <p class="text-sm text-gray-500 dark:text-gray-400">
      Mostrando {{ rangeStart }}–{{ rangeEnd }} de {{ total }}
    </p>
    <nav class="flex items-center gap-1" aria-label="Paginación">
      <button
        type="button"
        class="page-btn"
        :disabled="currentPage <= 1"
        @click="go(currentPage - 1)"
      >
        Anterior
      </button>
      <template v-for="(item, idx) in pageItems" :key="idx">
        <span v-if="item === 'ellipsis'" class="px-1.5 text-sm text-gray-400">…</span>
        <button
          v-else
          type="button"
          class="page-btn"
          :class="item === currentPage ? 'page-btn-active' : ''"
          :aria-current="item === currentPage ? 'page' : undefined"
          @click="go(item)"
        >
          {{ item }}
        </button>
      </template>
      <button
        type="button"
        class="page-btn"
        :disabled="currentPage >= totalPages"
        @click="go(currentPage + 1)"
      >
        Siguiente
      </button>
    </nav>
  </div>
</template>

<style scoped>
.page-btn {
  min-width: 2.25rem;
  border-radius: 0.5rem;
  border: 1px solid #d0d5dd;
  padding: 0.35rem 0.65rem;
  font-size: 0.875rem;
  color: #344054;
  background: white;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.page-btn-active {
  border-color: transparent;
  background: var(--color-brand-500, #465fff);
  color: white;
}
:global(.dark) .page-btn {
  border-color: #344054;
  background: #1d2939;
  color: #e4e7ec;
}
:global(.dark) .page-btn-active {
  background: var(--color-brand-500, #465fff);
  color: white;
}
</style>
