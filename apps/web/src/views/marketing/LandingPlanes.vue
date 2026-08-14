<template>
  <div class="min-h-screen bg-white dark:bg-gray-900">
    <header class="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <router-link to="/" class="text-lg font-semibold text-gray-800 dark:text-white">
          PuntoManeki
        </router-link>
        <div class="flex items-center gap-3">
          <router-link
            to="/login"
            class="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          >
            Ingresar
          </router-link>
          <router-link
            to="/register?plan=NEGOCIO"
            class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
          >
            Registrarse
          </router-link>
        </div>
      </div>
    </header>

    <section class="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
      <span
        class="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
      >
        Elige el plan de tu negocio
      </span>
      <h1 class="mt-4 text-3xl font-bold text-gray-800 dark:text-white sm:text-4xl lg:text-5xl">
        Un panel para administrar tu negocio de principio a fin
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-base text-gray-500 dark:text-gray-400">
        Marcas, productos, stock, ventas, caja y agenda en un solo lugar. Comienza con una
        prueba gratuita de 15 días — hasta 30 con un código promocional.
      </p>
      <div class="mt-8 flex items-center justify-center gap-3">
        <router-link
          to="/register?plan=NEGOCIO"
          class="rounded-lg bg-brand-500 px-6 py-3.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600"
        >
          Empezar con Plan Negocio
        </router-link>
        <router-link
          to="/terms"
          class="rounded-lg px-6 py-3.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5"
        >
          Ver términos y condiciones
        </router-link>
      </div>
    </section>

    <section class="mx-auto max-w-7xl px-6 pb-20">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="plan in displayPlans"
          :key="plan.type"
          class="relative flex flex-col rounded-2xl border p-6"
          :class="
            plan.available
              ? 'border-brand-300 bg-brand-50/40 shadow-theme-xs dark:border-brand-500/40 dark:bg-brand-500/5'
              : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
          "
        >
          <span
            v-if="plan.available"
            class="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white"
          >
            Disponible
          </span>
          <span
            v-else
            class="absolute -top-3 left-6 rounded-full bg-gray-400 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-600"
          >
            Próximamente
          </span>

          <h3 class="mt-2 text-lg font-semibold text-gray-800 dark:text-white">Plan {{ plan.name }}</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ plan.description }}</p>

          <ul class="mt-5 flex-1 space-y-2.5">
            <li
              v-for="feature in plan.features"
              :key="feature"
              class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
            >
              <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              {{ feature }}
            </li>
          </ul>

          <router-link
            v-if="plan.available"
            :to="`/register?plan=${plan.type}`"
            class="mt-6 flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Registrarme
          </router-link>
          <button
            v-else
            type="button"
            disabled
            class="mt-6 flex cursor-not-allowed items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-400 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
          >
            Próximamente
          </button>
        </div>
      </div>

      <p class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tienes cuenta?
        <router-link to="/login" class="font-medium text-brand-500 hover:text-brand-600">
          Ingresar
        </router-link>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon } from 'lucide-vue-next'
import { PLANS } from '@/lib/plans'

/** Landing comercial: Negocio / Clínica / Restaurante (sin plan Marca). */
const displayPlans = computed(() => PLANS.filter((p) => p.type !== 'MARCA'))
</script>
