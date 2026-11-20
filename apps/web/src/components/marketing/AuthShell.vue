<template>
  <FullScreenLayout>
    <div class="flex min-h-dvh bg-gray-50 dark:bg-gray-950">
      <!-- Panel de marca (escritorio): la agenda del día es lo que COSDI resuelve. -->
      <aside
        class="relative hidden w-[44%] max-w-[640px] flex-col justify-between overflow-hidden bg-brand-700 p-10 text-white lg:flex xl:p-14"
        aria-hidden="true"
      >
        <router-link to="/" tabindex="-1" class="font-display text-2xl font-semibold tracking-tight">COSDI</router-link>

        <div>
          <p class="max-w-sm font-display text-[34px] font-semibold leading-tight">
            Tu agenda en orden. Tus clientes, avisados por WhatsApp.
          </p>
          <div class="mt-10 max-w-sm rounded-2xl bg-white/10 p-5 ring-1 ring-white/15 backdrop-blur">
            <p class="text-sm text-brand-100">Hoy</p>
            <ul class="mt-3 space-y-2.5">
              <li v-for="row in preview" :key="row.time" class="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
                <span class="w-12 font-display text-lg font-semibold tabular-nums">{{ row.time }}</span>
                <span class="min-w-0 flex-1 truncate text-sm">{{ row.who }}</span>
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                    row.tone === 'ok' ? 'bg-emerald-300/20 text-emerald-100' : 'bg-white/15 text-white',
                  ]"
                >
                  {{ row.status }}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <p class="text-sm text-brand-100">Hecho en Durango, México</p>
      </aside>

      <!-- Formulario -->
      <div class="flex flex-1 flex-col px-5 py-6 sm:px-10">
        <div class="flex items-center justify-between">
          <router-link
            to="/"
            class="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </router-link>
          <span class="font-display text-lg font-semibold text-gray-900 lg:hidden dark:text-white">COSDI</span>
        </div>

        <div class="flex flex-1 items-center justify-center py-8">
          <div class="w-full max-w-[420px]">
            <h1 class="text-[28px] font-semibold leading-tight text-gray-900 dark:text-white">{{ title }}</h1>
            <p v-if="subtitle" class="mt-2 text-[15px] text-gray-600 dark:text-gray-400">{{ subtitle }}</p>
            <div class="mt-8">
              <slot />
            </div>
          </div>
        </div>

        <slot name="footer" />
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'

defineProps<{ title: string; subtitle?: string }>()

const preview = [
  { time: '10:00', who: 'Ana · Corte y peinado', status: 'Confirmada', tone: 'ok' },
  { time: '11:30', who: 'Luis · Barba', status: 'Recordatorio enviado', tone: 'info' },
  { time: '13:00', who: 'María · Uñas acrílicas', status: 'Confirmada', tone: 'ok' },
]
</script>
