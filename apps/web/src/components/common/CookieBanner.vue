<template>
  <div
    v-if="visible"
    role="dialog"
    aria-modal="false"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-text"
    class="fixed inset-x-0 bottom-0 z-[100000] p-3 sm:p-5"
    @keydown.esc="onEscape"
  >
    <div
      class="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xl dark:border-gray-700 dark:bg-gray-900 sm:p-6"
    >
      <h2 id="cookie-banner-title" class="text-base font-semibold text-gray-800 dark:text-white">
        Tu privacidad: cookies
      </h2>
      <p id="cookie-banner-text" class="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
        Usamos cookies necesarias para que el sitio funcione. Con tu permiso, también usamos cookies de
        analítica y de publicidad para entender cómo se usa el sitio y medir nuestras campañas. No se activa
        ninguna hasta que lo aceptes y puedes cambiar tu decisión cuando quieras.
        <router-link to="/cookies" class="font-medium text-brand-600 underline dark:text-brand-400">
          Política de cookies
        </router-link>
      </p>

      <fieldset v-if="configuring" class="mt-4 space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
        <legend class="sr-only">Categorías de cookies</legend>
        <label class="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked disabled class="mt-0.5 h-4 w-4 rounded border-gray-300" />
          <span>
            <strong class="text-gray-800 dark:text-white">Necesarias</strong> (siempre activas): mantienen tu
            sesión y recuerdan tus preferencias.
          </span>
        </label>
        <label class="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="draft.analytics" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500" />
          <span>
            <strong class="text-gray-800 dark:text-white">Analítica</strong>: Google Analytics, Hotjar y Contentsquare, para
            saber qué páginas se visitan y mejorar el sitio.
          </span>
        </label>
        <label class="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="draft.marketing" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500" />
          <span>
            <strong class="text-gray-800 dark:text-white">Publicidad</strong>: Pixel de Meta, para medir
            nuestros anuncios en Facebook e Instagram.
          </span>
        </label>
      </fieldset>

      <!-- Rechazar es tan visible y tan fácil como aceptar. -->
      <div class="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
        <button
          v-if="!configuring"
          type="button"
          class="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 underline hover:text-gray-900 dark:text-gray-300 dark:hover:text-white sm:mr-auto"
          @click="configuring = true"
        >
          Configurar
        </button>
        <button
          v-else
          type="button"
          class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-white/5 sm:mr-auto"
          @click="saveDraft"
        >
          Guardar mi selección
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-800 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:border-white dark:bg-gray-900 dark:text-white dark:hover:bg-white/10"
          @click="rejectOptionalCookies"
        >
          Rechazar opcionales
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-800 bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 dark:border-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          @click="acceptAllCookies"
        >
          Aceptar todas
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  acceptAllCookies,
  closeCookiePreferences,
  consent,
  rejectOptionalCookies,
  saveConsent,
} from '@/lib/consent'

const route = useRoute()
const configuring = ref(false)
const draft = reactive({ analytics: false, marketing: false })

/**
 * El banner aparece en las páginas públicas donde puede haber rastreo
 * (`meta.tracking`) mientras no haya decisión, o cuando el visitante abre
 * "Preferencias de cookies".
 */
const visible = computed(() => consent.panelOpen || (!consent.decided && route.meta.tracking === true))

watch(
  () => consent.panelOpen,
  (open) => {
    if (open) {
      draft.analytics = consent.analytics
      draft.marketing = consent.marketing
      configuring.value = true
    }
  },
)

watch(visible, (now) => {
  if (!now) configuring.value = false
})

function saveDraft() {
  saveConsent({ analytics: draft.analytics, marketing: draft.marketing })
}

/** Esc cierra el panel solo si ya había una decisión previa (no cuenta como aceptar ni rechazar). */
function onEscape() {
  if (consent.decided) closeCookiePreferences()
}
</script>
