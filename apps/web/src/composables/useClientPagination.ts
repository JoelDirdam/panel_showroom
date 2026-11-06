import { computed, readonly, shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

export const IMPORT_PAGE_SIZE = 10

export function useClientPagination<T>(
  items: MaybeRefOrGetter<T[]>,
  options: { pageSize?: number } = {},
) {
  const pageSize = options.pageSize ?? IMPORT_PAGE_SIZE
  const currentPage = shallowRef(1)

  const total = computed(() => toValue(items).length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  watch(totalPages, (pages) => {
    if (currentPage.value > pages) currentPage.value = pages
  })

  const pagedItems = computed(() => {
    const all = toValue(items)
    const start = (currentPage.value - 1) * pageSize
    return all.slice(start, start + pageSize)
  })

  const rangeStart = computed(() => (total.value === 0 ? 0 : (currentPage.value - 1) * pageSize + 1))
  const rangeEnd = computed(() => Math.min(currentPage.value * pageSize, total.value))

  function goToPage(page: number) {
    currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  }

  function goToIndex(index: number) {
    goToPage(Math.floor(index / pageSize) + 1)
  }

  return {
    currentPage: readonly(currentPage),
    pageSize,
    total,
    totalPages,
    pagedItems,
    rangeStart,
    rangeEnd,
    goToPage,
    goToIndex,
  }
}
