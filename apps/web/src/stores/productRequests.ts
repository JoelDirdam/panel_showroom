import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/services/api'

export const useProductRequestsStore = defineStore('productRequests', () => {
  const pendingCount = ref(0)
  const loading = ref(false)

  async function fetchPendingCount() {
    loading.value = true
    try {
      const { data } = await api.get<{ count: number }>('/product-requests/pending-count')
      pendingCount.value = data.count ?? 0
    } catch {
      // Silencioso: el menú no debe romper si falla el conteo.
    } finally {
      loading.value = false
    }
  }

  function setPendingCount(count: number) {
    pendingCount.value = Math.max(0, count)
  }

  function clear() {
    pendingCount.value = 0
  }

  return { pendingCount, loading, fetchPendingCount, setPendingCount, clear }
})
