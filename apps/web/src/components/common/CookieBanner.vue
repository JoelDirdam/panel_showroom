<template>
  <div
    v-if="visible"
    ref="bannerEl"
    role="dialog"
    aria-modal="false"
    aria-labelledby="cookie-banner-title"
    aria-describedby="cookie-banner-text"
    class="fixed inset-x-0 bottom-0 z-[100000] border-t border-gray-200 bg-white/95 shadow-pop backdrop-blur dark:border-gray-800 dark:bg-gray-900/95"
    @keydown.esc="onEscape"
  >
    <div class="mx-auto max-w-6xl px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-6 sm:py-4">
      <div class="flex items-start gap-3 lg:items-center lg:gap-6">
        <div class="min-w-0 flex-1">
          <h2 id="cookie-banner-title" class="text-sm font-semibold text-gray-900 dark:text-white">Cookies</h2>
          <p id="cookie-banner-text" class="mt-0.5 text-[13px] leading-5 text-gray-600 dark:text-gray-300">
            Usamos cookies necesarias para que el sitio funcione. Con tu permiso, también de analítica y publicidad.
            No se activa ninguna opcional hasta que aceptes.
            <router-link to="/cookies" class="font-medium text-brand-600 underline dark:text-brand-300">Política de cookies</router-link>
            <template v-if="!configuring">
              <span class="lg:hidden"> · </span>
              <button type="button" class="font-medium text-gray-900 underline lg:hidden dark:text-white" @click="configuring = true">
                Configurar
              </button>
            </template>
          </p>
        </div>

        <!-- Rechazar es tan visible y tan fácil como aceptar. -->
        <div v-if="!configuring" class="hidden shrink-0 items-center gap-2 lg:flex">
          <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm" @click="configuring = true">Configurar</button>
          <button type="button" class="ui-btn ui-btn-secondary ui-btn-sm" @click="rejectOptionalCookies">Rechazar opcionales</button>
          <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" @click="acceptAllCookies">Aceptar todas</button>
        </div>

        <button
          type="button"
          class="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 lg:mt-0"
          aria-label="Cerrar aviso de cookies sin activar las opcionales"
          title="Cerrar (no se activa ninguna cookie opcional)"
          @click="dismiss"
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <fieldset v-if="configuring" class="mt-3 grid gap-2 sm:grid-cols-3">
        <legend class="sr-only">Categorías de cookies</legend>
        <label class="flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-700 dark:bg-white/[0.04] dark:text-gray-300">
          <input type="checkbox" checked disabled class="mt-0.5 h-4 w-4 rounded border-gray-300" />
          <span><strong class="text-gray-900 dark:text-white">Necesarias</strong> (siempre activas): sesión y preferencias.</span>
        </label>
        <label class="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-700 dark:bg-white/[0.04] dark:text-gray-300">
          <input v-model="draft.analytics" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500" />
          <span>
            <strong class="text-gray-900 dark:text-white">Analítica</strong>: Google Analytics, Hotjar y Contentsquare, para
            mejorar el sitio.
          </span>
        </label>
        <label class="flex cursor-pointer items-start gap-3 rounded-xl bg-gray-50 p-3 text-[13px] text-gray-700 dark:bg-white/[0.04] dark:text-gray-300">
          <input v-model="draft.marketing" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-500" />
          <span><strong class="text-gray-900 dark:text-white">Publicidad</strong>: Pixel de Meta, para medir anuncios.</span>
        </label>
      </fieldset>

      <div :class="['mt-3 grid grid-cols-2 gap-2', configuring ? 'sm:flex sm:justify-end' : 'lg:hidden']">
        <button v-if="configuring" type="button" class="ui-btn ui-btn-secondary col-span-2 sm:col-span-1" @click="saveDraft">
          Guardar mi selección
        </button>
        <button type="button" class="ui-btn ui-btn-secondary" @click="rejectOptionalCookies">Rechazar opcionales</button>
        <button type="button" class="ui-btn ui-btn-primary" @click="acceptAllCookies">Aceptar todas</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { X } from 'lucide-vue-next'
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
 * Cerrar con la X oculta el aviso solo en esta visita: no cuenta como aceptar
 * ni rechazar, así que ningún rastreador se activa y se vuelve a preguntar después.
 */
const dismissed = ref(false)
const bannerEl = ref<HTMLElement | null>(null)

/**
 * El banner aparece en las páginas públicas donde puede haber rastreo
 * (`meta.tracking`) mientras no haya decisión, o cuando el visitante abre
 * "Preferencias de cookies".
 */
const visible = computed(
  () => consent.panelOpen || (!consent.decided && !dismissed.value && route.meta.tracking === true),
)

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

/* Reserva espacio al final de la página para que el aviso no tape contenido. */
let observer: ResizeObserver | null = null
function setReserve(px: number) {
  document.documentElement.style.setProperty('--cookie-banner-h', `${px}px`)
  document.body.style.paddingBottom = px ? `${px}px` : ''
}
watch(
  visible,
  async (now) => {
    if (!now) {
      configuring.value = false
      observer?.disconnect()
      setReserve(0)
      return
    }
    await nextTick()
    if (!bannerEl.value) return
    observer?.disconnect()
    observer = new ResizeObserver(([entry]) => setReserve(Math.ceil(entry.target.getBoundingClientRect().height)))
    observer.observe(bannerEl.value)
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  observer?.disconnect()
  setReserve(0)
})

function saveDraft() {
  saveConsent({ analytics: draft.analytics, marketing: draft.marketing })
}

function dismiss() {
  if (consent.panelOpen) closeCookiePreferences()
  else dismissed.value = true
}

/** Esc cierra el panel solo si ya había una decisión previa (no cuenta como aceptar ni rechazar). */
function onEscape() {
  if (consent.decided) closeCookiePreferences()
}
</script>
