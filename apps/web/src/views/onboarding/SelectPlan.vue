<template>
  <FullScreenLayout>
    <div class="min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-900">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Elige el plan de tu negocio</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Comienza con {{ TRIAL_BASE_DAYS }} días de prueba gratis. ¿Tienes un código promocional? Extiéndelo.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            v-for="plan in PLANS"
            :key="plan.type"
            type="button"
            class="relative flex flex-col rounded-2xl border p-5 text-left transition"
            :class="
              selectedPlan === plan.type
                ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03]'
            "
            @click="selectedPlan = plan.type"
          >
            <span
              class="absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              :class="plan.available ? 'bg-brand-500' : 'bg-gray-400 dark:bg-gray-600'"
            >
              {{ plan.available ? 'Recomendado' : 'Próximamente' }}
            </span>
            <h3 class="mt-2 text-base font-semibold text-gray-800 dark:text-white">{{ plan.name }}</h3>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ plan.description }}</p>
            <ul class="mt-3 space-y-1.5">
              <li
                v-for="feature in plan.features.slice(0, 3)"
                :key="feature"
                class="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-300"
              >
                <CheckIcon class="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                {{ feature }}
              </li>
            </ul>
          </button>
        </div>

        <div class="mx-auto mt-8 max-w-md">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Código promocional (opcional)
          </label>
          <input
            v-model="promoCode"
            type="text"
            placeholder="Ej. MANEKI30"
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm uppercase text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Con un código válido extiendes tu prueba gratuita más allá de los {{ TRIAL_BASE_DAYS }} días base.
          </p>

          <p v-if="auth.error" class="mt-3 text-sm text-error-500">{{ auth.error }}</p>

          <button
            type="button"
            :disabled="!selectedPlan || auth.loading"
            class="mt-5 flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
            @click="handleContinue"
          >
            {{ auth.loading ? 'Guardando...' : 'Continuar' }}
          </button>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { CheckIcon } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { PLANS, TRIAL_BASE_DAYS } from '@/lib/plans'
import type { PlanType } from '@/lib/entitlements'

const router = useRouter()
const auth = useAuthStore()

const selectedPlan = ref<PlanType>('NEGOCIO')
const promoCode = ref('')

async function handleContinue() {
  if (!selectedPlan.value) return
  const ok = await auth.selectPlan(selectedPlan.value, promoCode.value.trim() || undefined)
  if (ok) {
    router.push('/onboarding/confirm-plan')
  }
}
</script>
