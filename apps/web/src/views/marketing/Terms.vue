<template>
  <LegalPage :title="terms?.title ?? 'Términos y condiciones'" :updated="updatedLabel">
    <p v-if="loading">Cargando términos…</p>
    <template v-else-if="terms">
      <p>
        Versión <strong>{{ terms.version }}</strong>. Este es el documento que se acepta al crear una cuenta. Se
        complementa con el <router-link to="/privacidad">aviso de privacidad</router-link>, la
        <router-link to="/reembolsos">política de reembolsos</router-link> y la política de
        <router-link to="/conservacion-de-datos">conservación de datos</router-link>.
      </p>
      <div
        class="whitespace-pre-wrap rounded-2xl border border-gray-200 bg-gray-50 p-5 text-sm leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
      >{{ terms.content }}</div>
    </template>
    <template v-else>
      <p role="alert">
        No pudimos cargar los términos en este momento. Intenta de nuevo en unos minutos o escríbenos a
        <a :href="`mailto:${B.email}`">{{ B.email }}</a> y te los enviamos.
      </p>
    </template>
  </LegalPage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import LegalPage from '@/components/marketing/LegalPage.vue'
import { BUSINESS as B } from '@/lib/business'
import { fetchCurrentTerms, type TermsDocument } from '@/services/api'

/**
 * Términos vigentes: se leen del mismo documento versionado que el usuario
 * acepta en el registro (TermsDocument), para que lo publicado y lo aceptado
 * sean siempre el mismo texto.
 */
const terms = ref<TermsDocument | null>(null)
const loading = ref(true)

const updatedLabel = computed(() =>
  terms.value
    ? new Date(terms.value.publishedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : undefined,
)

onMounted(async () => {
  try {
    terms.value = await fetchCurrentTerms()
  } catch {
    terms.value = null
  } finally {
    loading.value = false
  }
})
</script>
