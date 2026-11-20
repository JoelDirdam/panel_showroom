<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <MarketingHeader />
    <main id="contenido" tabindex="-1" class="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Baja de correos de marketing</h1>

      <template v-if="state === 'done'">
        <p role="status" class="mt-4 text-gray-600 dark:text-gray-300">
          Listo<span v-if="maskedEmail">, <strong>{{ maskedEmail }}</strong></span
          >: ya no recibirás novedades ni promociones de COSDI.
        </p>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Seguirás recibiendo solo los avisos necesarios de tu cuenta (por ejemplo, códigos de verificación y avisos de
          cobro). Si cambias de opinión, puedes volver a activarlos desde <strong>Mi cuenta</strong>.
        </p>
      </template>

      <template v-else-if="state === 'missing'">
        <p class="mt-4 text-gray-600 dark:text-gray-300">
          Este enlace no trae la información necesaria. Abre el enlace “Darme de baja” desde el correo que recibiste, o
          escríbenos a <a class="text-brand-500 underline" :href="`mailto:${B.privacyEmail}`">{{ B.privacyEmail }}</a>
          y te damos de baja.
        </p>
      </template>

      <template v-else>
        <p class="mt-4 text-gray-600 dark:text-gray-300">
          Confirma que quieres dejar de recibir novedades y promociones de COSDI.
        </p>
        <p v-if="error" role="alert" class="mt-4 text-sm text-error-500">{{ error }}</p>
        <button
          type="button"
          class="ui-btn ui-btn-primary mt-6"
          :disabled="state === 'sending'"
          @click="confirm"
        >
          {{ state === 'sending' ? 'Procesando…' : 'Sí, darme de baja' }}
        </button>
      </template>
    </main>
    <MarketingFooter />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketingHeader from '@/components/marketing/MarketingHeader.vue'
import MarketingFooter from '@/components/marketing/MarketingFooter.vue'
import { BUSINESS as B } from '@/lib/business'
import { extractApiError } from '@/services/api'
import { unsubscribeMarketing } from '@/services/compliance'

const route = useRoute()
const token = typeof route.query.token === 'string' ? route.query.token : ''

// Se pide confirmar con un clic: así los filtros de correo que "visitan" los
// enlaces no dan de baja a nadie por accidente.
const state = ref<'idle' | 'sending' | 'done' | 'missing'>(token ? 'idle' : 'missing')
const error = ref<string | null>(null)
const maskedEmail = ref('')

async function confirm() {
  error.value = null
  state.value = 'sending'
  try {
    const result = await unsubscribeMarketing(token)
    maskedEmail.value = result.email ?? ''
    state.value = 'done'
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo procesar la baja. Intenta de nuevo.')
    state.value = 'idle'
  }
}
</script>
