<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <header class="border-b border-gray-200 dark:border-gray-800">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <router-link to="/planes" class="text-lg font-semibold text-gray-800 dark:text-white">
          PuntoManeki
        </router-link>
        <router-link
          to="/register"
          class="text-sm font-medium text-brand-500 hover:text-brand-600"
        >
          Volver al registro
        </router-link>
      </div>
    </header>

    <main class="mx-auto max-w-4xl px-6 py-12">
      <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Cargando términos…</div>
      <div v-else-if="loadError" class="rounded-lg bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
        {{ loadError }}
      </div>
      <template v-else-if="terms">
        <h1 class="text-2xl font-bold text-gray-800 dark:text-white">{{ terms.title }}</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Versión {{ terms.version }} · Publicado el {{ formatDate(terms.publishedAt) }}
        </p>
        <div
          class="mt-6 whitespace-pre-wrap rounded-2xl border border-gray-200 bg-gray-50 p-6 text-sm leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
        >{{ terms.content }}</div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchCurrentTerms, extractApiError, type TermsDocument } from '@/services/api'

const terms = ref<TermsDocument | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  try {
    terms.value = await fetchCurrentTerms()
  } catch (e) {
    loadError.value = extractApiError(e, 'No hay términos y condiciones publicados')
  } finally {
    loading.value = false
  }
})
</script>
