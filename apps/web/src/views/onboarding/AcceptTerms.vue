<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-5 text-center">
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Actualizamos los Términos y Condiciones</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Debes aceptar la versión vigente para continuar usando tu panel.
          </p>
        </div>

        <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">Cargando…</div>

        <template v-else-if="terms">
          <div
            class="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
          >{{ terms.content }}</div>

          <form class="mt-5 space-y-4" @submit.prevent="handleAccept">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Firma (nombre completo)<span class="text-error-500">*</span>
              </label>
              <input
                v-model="signedName"
                type="text"
                required
                placeholder="Escribe tu nombre completo"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <p v-if="auth.error" class="text-sm text-error-500">{{ auth.error }}</p>

            <button
              type="submit"
              :disabled="auth.loading"
              class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
            >
              {{ auth.loading ? 'Guardando...' : `Aceptar v${terms.version} y continuar` }}
            </button>

            <button
              type="button"
              class="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              @click="auth.logout(); router.push('/login')"
            >
              Cerrar sesión
            </button>
          </form>
        </template>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { fetchCurrentTerms, extractApiError, type TermsDocument } from '@/services/api'

const router = useRouter()
const auth = useAuthStore()

const terms = ref<TermsDocument | null>(null)
const loading = ref(true)
const signedName = ref('')

onMounted(async () => {
  try {
    terms.value = await fetchCurrentTerms()
    auth.terms = terms.value
  } catch (e) {
    auth.error = extractApiError(e, 'No se pudieron cargar los términos vigentes')
  } finally {
    loading.value = false
  }
})

async function handleAccept() {
  if (!terms.value) return
  const ok = await auth.acceptTerms(signedName.value.trim(), terms.value.version)
  if (ok) {
    router.push('/')
  }
}
</script>
