<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Términos y condiciones</h1>
    <p class="mb-6 mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
      Cada versión publicada queda fija: no se puede editar, solo publicar una nueva. Al publicar una versión nueva,
      todos los usuarios tendrán que aceptarla la próxima vez que entren.
    </p>

    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-if="error" role="alert" class="mb-4 text-sm text-error-500">{{ error }}</p>

    <template v-if="data">
      <!-- Vigente -->
      <section :class="cardCls" aria-labelledby="terms-current">
        <h2 id="terms-current" class="text-base font-semibold text-gray-800 dark:text-white">Versión vigente</h2>
        <p v-if="!data.current" class="mt-2 text-sm text-gray-500">No hay términos publicados.</p>
        <template v-else>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            <strong>v{{ data.current.version }}</strong> · publicada el {{ formatDateTime(data.current.publishedAt) }} ·
            aceptada por <strong>{{ data.current.acceptedBy }}</strong> de {{ data.activeUsers }} usuarios
          </p>
          <div class="mt-2 h-2 max-w-md rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
            <div class="h-2 rounded-full bg-brand-500" :style="{ width: acceptancePct }"></div>
          </div>
          <p v-if="data.current.summary" class="mt-3 text-sm text-gray-600 dark:text-gray-300">
            <strong>Cambios:</strong> {{ data.current.summary }}
          </p>
        </template>
      </section>

      <!-- Borrador del código -->
      <section
        v-if="!data.draft.published"
        class="mt-4 rounded-2xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-500/30 dark:bg-brand-500/10"
      >
        <h2 class="text-base font-semibold text-gray-800 dark:text-white">Hay un borrador sin publicar: v{{ data.draft.version }}</h2>
        <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
          Viene con la versión actual del sistema (renovación automática, reembolsos, cancelación, datos y cookies).
          Revísalo antes de publicarlo; si lo vio un abogado, mejor.
        </p>
        <button type="button" :class="[secondaryBtn, 'mt-3']" @click="loadDraft">Cargar el borrador en el editor</button>
      </section>

      <!-- Publicar -->
      <form :class="[cardCls, 'mt-4 space-y-4']" aria-labelledby="terms-new" @submit.prevent="publish">
        <h2 id="terms-new" class="text-base font-semibold text-gray-800 dark:text-white">Publicar una versión nueva</h2>
        <div class="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <div>
            <label for="t-version" :class="labelCls">Versión *</label>
            <input id="t-version" v-model.trim="form.version" type="text" required placeholder="1.3" :class="inputCls" />
          </div>
          <div>
            <label for="t-title" :class="labelCls">Título *</label>
            <input id="t-title" v-model.trim="form.title" type="text" required :class="inputCls" />
          </div>
        </div>
        <div>
          <label for="t-summary" :class="labelCls">Qué cambió *</label>
          <textarea id="t-summary" v-model="form.summary" rows="3" required :class="inputCls" aria-describedby="t-summary-help" />
          <p id="t-summary-help" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Se muestra a cada usuario al pedirle que acepte, y en el correo de aviso.
          </p>
        </div>
        <div>
          <label for="t-content" :class="labelCls">Texto completo *</label>
          <textarea id="t-content" v-model="form.content" rows="18" required :class="[inputCls, 'font-mono text-xs leading-relaxed']" />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ form.content.length.toLocaleString('es-MX') }} caracteres</p>
        </div>

        <div class="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
          <fieldset>
            <legend class="mb-2 text-sm font-medium text-gray-800 dark:text-gray-100">Aviso por correo</legend>
            <div class="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <label class="flex items-start gap-2">
                <input v-model="form.notify" type="radio" value="none" name="t-notify" class="mt-1" />
                <span>No avisar por correo (igual se les pedirá aceptar al entrar).</span>
              </label>
              <label class="flex items-start gap-2">
                <input v-model="form.notify" type="radio" value="real" name="t-notify" class="mt-1" />
                <span>
                  Avisar a los {{ data.recipients.real }} usuarios reales con correo verificado (recomendado si el cambio
                  es importante). Nunca incluye cuentas de prueba.
                </span>
              </label>
              <label class="flex items-start gap-2">
                <input v-model="form.notify" type="radio" value="test" name="t-notify" class="mt-1" />
                <span>Solo a las cuentas de prueba ({{ data.recipients.test }} usuarios), para revisar el correo.</span>
              </label>
            </div>
          </fieldset>
          <FormCheckbox v-model="form.confirm" required>
            Entiendo que al publicar, todos deberán aceptar la versión {{ form.version || 'nueva' }} para seguir usando su
            panel, y que esta versión no se podrá editar después.
          </FormCheckbox>
        </div>

        <p v-if="formError" role="alert" class="text-sm text-error-500">{{ formError }}</p>
        <p v-if="message" role="status" class="text-sm text-success-600 dark:text-success-400">{{ message }}</p>
        <button type="submit" :disabled="publishing || !form.confirm" :class="primaryBtn">
          {{ publishing ? 'Publicando…' : `Publicar versión ${form.version || ''}` }}
        </button>
      </form>

      <!-- Historial -->
      <section :class="[cardCls, 'mt-4']" aria-labelledby="terms-history">
        <h2 id="terms-history" class="text-base font-semibold text-gray-800 dark:text-white">Historial de versiones</h2>
        <div class="mt-3 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <th scope="col" :class="thCls">Versión</th>
                <th scope="col" :class="thCls">Publicada</th>
                <th scope="col" :class="thCls">Aceptaciones</th>
                <th scope="col" :class="thCls">Huella del texto (SHA-256)</th>
                <th scope="col" :class="thCls">Cambios</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in data.versions" :key="v.version" class="border-b border-gray-100 align-top last:border-0 dark:border-gray-800">
                <th scope="row" class="px-3 py-2.5 font-semibold text-gray-800 dark:text-white">{{ v.version }}</th>
                <td :class="tdCls">{{ formatDateTime(v.publishedAt) }}</td>
                <td :class="tdCls">{{ v.acceptedBy }}</td>
                <td :class="[tdCls, 'font-mono text-xs']" :title="v.contentHash">{{ v.contentHash.slice(0, 16) }}…</td>
                <td :class="tdCls">{{ v.summary || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </platform-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { extractApiError } from '@/services/api'
import {
  fetchTermsAdmin,
  formatDateTime,
  publishTerms,
  type TermsAdmin,
  type TermsNotifyAudience,
} from '@/services/compliance'

const cardCls = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]'
const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const inputCls =
  'w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const thCls = 'px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400'
const tdCls = 'px-3 py-2.5 text-gray-600 dark:text-gray-300'
const primaryBtn = 'rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryBtn = 'rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'

const data = ref<TermsAdmin | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const message = ref<string | null>(null)
const publishing = ref(false)
const form = reactive({ version: '', title: '', summary: '', content: '', notify: 'none' as TermsNotifyAudience, confirm: false })

const acceptancePct = computed(() => {
  const d = data.value
  if (!d?.current || !d.activeUsers) return '0%'
  return `${Math.min(100, Math.round((d.current.acceptedBy / d.activeUsers) * 100))}%`
})

function nextVersion(v: string): string {
  const parts = v.split('.').map(Number)
  if (parts.length === 1) return `${parts[0]}.1`
  parts[parts.length - 1] += 1
  return parts.join('.')
}

async function load() {
  try {
    data.value = await fetchTermsAdmin()
    const cur = data.value.current
    // El editor parte del texto vigente: se cambia solo lo necesario.
    if (!form.content) {
      form.version = cur ? nextVersion(cur.version) : '1.0'
      form.title = cur?.title ?? data.value.draft.title
      form.content = cur?.content ?? ''
    }
  } catch (e) {
    error.value = extractApiError(e, 'No se pudieron cargar los términos')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function loadDraft() {
  if (!data.value) return
  const d = data.value.draft
  Object.assign(form, { version: d.version, title: d.title, summary: d.summary, content: d.content, confirm: false })
  document.getElementById('t-version')?.focus()
}

async function publish() {
  formError.value = null
  message.value = null
  if (!form.confirm) return
  publishing.value = true
  try {
    const result = await publishTerms({
      version: form.version,
      title: form.title,
      summary: form.summary.trim(),
      content: form.content.trim(),
      confirm: true,
      notify: form.notify,
    })
    message.value = `Versión ${result.version} publicada.${result.queued ? ` Se están enviando ${result.queued} avisos por correo.` : ''}`
    form.content = ''
    form.summary = ''
    form.confirm = false
    form.notify = 'none'
    await load()
  } catch (e) {
    formError.value = extractApiError(e, 'No se pudo publicar')
  } finally {
    publishing.value = false
  }
}
</script>
