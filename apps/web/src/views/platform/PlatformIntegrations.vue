<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Integraciones de analítica y publicidad</h1>
    <p class="mb-6 mt-1 max-w-3xl text-sm text-gray-500 dark:text-gray-400">
      Estas herramientas solo se cargan en las páginas públicas de COSDI (inicio, registro y páginas legales), y solo
      después de que el visitante acepta la categoría correspondiente en el aviso de cookies. Nunca se cargan dentro
      del panel de los negocios ni en sus páginas de reservas.
    </p>

    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>

    <form v-else-if="settings" class="space-y-4" @submit.prevent="save">
      <fieldset
        v-for="t in trackers"
        :key="t.key"
        class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <legend class="sr-only">{{ t.name }}</legend>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-gray-800 dark:text-white">{{ t.name }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ t.description }}</p>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Categoría de cookies: <strong>{{ t.category }}</strong></p>
          </div>
          <span
            class="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
            :class="
              settings[t.key].enabled && settings[t.key].id
                ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
                : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
            "
          >
            {{ settings[t.key].enabled && settings[t.key].id ? 'Activo' : 'Apagado' }}
          </span>
        </div>
        <div class="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label :for="`trk-${t.key}`" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ t.idLabel }}</label>
            <input
              :id="`trk-${t.key}`"
              v-model.trim="settings[t.key].id"
              type="text"
              :placeholder="t.placeholder"
              autocomplete="off"
              class="w-full max-w-sm rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 font-mono text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>
          <FormCheckbox v-model="settings[t.key].enabled" align="center">Activar en el sitio</FormCheckbox>
        </div>
        <p class="mt-3 text-sm">
          <a :href="t.dashboard" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-600 underline dark:text-brand-400">
            Abrir el panel de {{ t.name }} para ver los datos
          </a>
        </p>
      </fieldset>

      <p v-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
      <p v-if="message" role="status" class="text-sm text-success-600 dark:text-success-400">{{ message }}</p>
      <button type="submit" :disabled="saving" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
        {{ saving ? 'Guardando…' : 'Guardar integraciones' }}
      </button>
      <p class="max-w-3xl text-xs text-gray-500 dark:text-gray-400">
        Los cambios llegan al sitio público en un máximo de 5 minutos. Si agregas una herramienta distinta a estas, primero actualiza la lista de proveedores y la política de cookies.
      </p>
    </form>
    <p v-else-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
  </platform-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { extractApiError } from '@/services/api'
import { fetchTrackerSettings, saveTrackerSettings, type TrackerSettings } from '@/services/compliance'

const trackers: {
  key: keyof TrackerSettings
  name: string
  description: string
  category: string
  idLabel: string
  placeholder: string
  dashboard: string
}[] = [
  {
    key: 'ga4',
    name: 'Google Analytics 4',
    description: 'Visitas, páginas vistas, origen del tráfico y registros completados.',
    category: 'Analítica',
    idLabel: 'ID de medición',
    placeholder: 'G-XXXXXXXXXX',
    dashboard: 'https://analytics.google.com/',
  },
  {
    key: 'metaPixel',
    name: 'Pixel de Meta',
    description: 'Mide las visitas y registros que generan tus anuncios de Facebook e Instagram.',
    category: 'Publicidad',
    idLabel: 'ID del pixel',
    placeholder: '123456789012345',
    dashboard: 'https://business.facebook.com/events_manager2',
  },
  {
    key: 'hotjar',
    name: 'Hotjar',
    description: 'Mapas de calor y recorridos de navegación en las páginas públicas.',
    category: 'Analítica',
    idLabel: 'Site ID',
    placeholder: '1234567',
    dashboard: 'https://insights.hotjar.com/',
  },
  {
    key: 'contentsquare',
    name: 'Contentsquare',
    description:
      'Grabaciones de sesión, mapas de calor y embudos en las páginas públicas. Es donde quedan las cuentas nuevas de Hotjar.',
    category: 'Analítica',
    idLabel: 'ID del tag',
    placeholder: '62f9234aae787',
    dashboard: 'https://app.contentsquare.com/',
  },
]

const settings = ref<TrackerSettings | null>(null)
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const message = ref<string | null>(null)

onMounted(async () => {
  try {
    settings.value = await fetchTrackerSettings()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar la configuración')
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!settings.value) return
  error.value = null
  message.value = null
  saving.value = true
  try {
    settings.value = await saveTrackerSettings(settings.value)
    message.value = 'Integraciones guardadas.'
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}
</script>
