<template>
  <platform-layout>
    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Estado de la plataforma</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Correo, cobros, WhatsApp, tareas automáticas y configuración. No muestra claves, solo si están configuradas.
        </p>
      </div>
      <button type="button" :class="secondaryBtn" :disabled="loading" @click="load">
        {{ loading ? 'Revisando…' : 'Volver a revisar' }}
      </button>
    </div>

    <p v-if="error" role="alert" class="mb-4 text-sm text-error-500">{{ error }}</p>

    <template v-if="health">
      <div role="status" class="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border p-4" :class="summary.cls">
        <span class="text-base font-semibold">{{ summary.label }}</span>
        <span class="text-sm">
          Entorno <strong>{{ health.environment }}</strong> · revisado {{ formatDateTime(health.checkedAt) }} · en línea
          desde hace {{ uptime }}
        </span>
      </div>

      <section v-for="group in groups" :key="group.name" class="mb-4" :aria-labelledby="`hg-${group.name}`">
        <h2 :id="`hg-${group.name}`" class="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {{ group.name }}
        </h2>
        <ul class="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]">
          <li v-for="c in group.checks" :key="c.key" class="flex items-start gap-3 p-4">
            <span class="mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="BADGE[c.status].cls">
              {{ BADGE[c.status].label }}
            </span>
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-800 dark:text-white">{{ c.label }}</p>
              <p class="mt-0.5 break-words text-sm text-gray-600 dark:text-gray-300">{{ c.detail }}</p>
            </div>
          </li>
        </ul>
      </section>
    </template>
    <p v-else-if="loading" class="text-sm text-gray-500">Revisando servicios…</p>
  </platform-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import { extractApiError } from '@/services/api'
import { fetchPlatformHealth, formatDateTime, type PlatformHealth } from '@/services/compliance'

const secondaryBtn =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'

// Cada estado lleva texto, no solo color.
const BADGE = {
  ok: { label: 'Bien', cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' },
  warn: { label: 'Revisar', cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' },
  error: { label: 'Falla', cls: 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400' },
  off: { label: 'Apagado', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' },
} as const

const health = ref<PlatformHealth | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const groups = computed(() => {
  const map = new Map<string, PlatformHealth['checks']>()
  for (const c of health.value?.checks ?? []) {
    map.set(c.group, [...(map.get(c.group) ?? []), c])
  }
  return [...map.entries()].map(([name, checks]) => ({ name, checks }))
})

const summary = computed(() => {
  const s = health.value?.status
  if (s === 'error')
    return { label: 'Hay algo fallando', cls: 'border-error-200 bg-error-50 text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300' }
  if (s === 'warn')
    return { label: 'Funciona, con puntos por revisar', cls: 'border-warning-200 bg-warning-50 text-warning-800 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-300' }
  return { label: 'Todo en orden', cls: 'border-success-200 bg-success-50 text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300' }
})

const uptime = computed(() => {
  const s = health.value?.uptimeSeconds ?? 0
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min`
  if (s < 86400) return `${Math.round(s / 3600)} h`
  return `${Math.round(s / 86400)} días`
})

async function load() {
  loading.value = true
  error.value = null
  try {
    health.value = await fetchPlatformHealth()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo revisar el estado')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
