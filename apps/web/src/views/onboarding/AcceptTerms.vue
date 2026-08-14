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
            <FormCheckbox v-model="agreeToTerms" required align="start">
              Acepto los Términos y Condiciones (v{{ terms.version }}).
              Mi nombre registrado
              <strong class="font-medium text-gray-800 dark:text-white">{{ signerName }}</strong>
              queda como firma de aceptación.
            </FormCheckbox>

            <p v-if="formError" class="text-sm text-error-500">{{ formError }}</p>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { useAuthStore } from '@/stores/auth'
import { fetchCurrentTerms, extractApiError, type TermsDocument } from '@/services/api'

const router = useRouter()
const auth = useAuthStore()

const terms = ref<TermsDocument | null>(null)
const loading = ref(true)
const agreeToTerms = ref(false)
const formError = ref<string | null>(null)

const signerName = computed(() => auth.user?.name?.trim() || '')

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
  formError.value = null
  if (!terms.value) return
  if (!agreeToTerms.value) {
    formError.value = 'Debes aceptar los Términos y Condiciones'
    return
  }
  if (!signerName.value) {
    formError.value = 'No se encontró tu nombre registrado para firmar la aceptación'
    return
  }
  const ok = await auth.acceptTerms(signerName.value, terms.value.version)
  if (ok) {
    router.push('/home')
  }
}
</script>
