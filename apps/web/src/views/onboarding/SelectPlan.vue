<template>
  <FullScreenLayout>
    <div class="min-h-screen bg-gray-50 px-6 py-12 dark:bg-gray-900">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">Elige el plan de tu negocio</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            ¿Tienes un código de prueba gratis, de descuento o de recomendación? Escríbelo abajo antes de continuar.
          </p>
        </div>

        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <button
            v-for="plan in orderedPlans"
            :key="plan.type"
            type="button"
            class="relative flex flex-col rounded-2xl border p-5 text-left transition"
            :class="
              selectedPlan === plan.type
                ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03]'
            "
            :disabled="!plan.available"
            @click="plan.available && (selectedPlan = plan.type)"
          >
            <span
              class="absolute -top-2.5 left-4 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
              :class="plan.available ? 'bg-brand-500' : 'bg-gray-400 dark:bg-gray-600'"
            >
              {{ !plan.available ? 'Próximamente' : plan.type === 'CITAS_PANEL' ? 'Recomendado' : 'Disponible' }}
            </span>
            <h3 class="mt-2 text-base font-semibold text-gray-800 dark:text-white">{{ plan.name }}</h3>
            <p v-if="shownPrice(plan, false)" class="mt-1 text-sm font-semibold text-gray-800 dark:text-white">
              ${{ shownPrice(plan, false) }} <span class="text-xs font-normal text-gray-500 dark:text-gray-400">MXN/mes · IVA incluido</span>
            </p>
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
            Código promocional o de recomendación (opcional)
          </label>
          <input
            v-model="promoCode"
            type="text"
            :placeholder="`Ej. ${TRIAL_CODE_EXAMPLE}`"
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm uppercase text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
          <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
            Según el código obtienes días de prueba gratis o un descuento en tus mensualidades. Si te recomendó otro
            negocio, escribe su código. Sin código, pagas tu primer mes al agregar tu tarjeta.
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
import { useRoute, useRouter } from 'vue-router'
import { CheckIcon } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { PLANS, TRIAL_CODE_EXAMPLE, shownPrice } from '@/lib/plans'
import type { PlanType } from '@/lib/entitlements'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const planFromQuery = typeof route.query.plan === 'string' ? route.query.plan : null
let planFromStorage: string | null = null
try {
  planFromStorage = sessionStorage.getItem('pendingPlanType')
} catch {
  planFromStorage = null
}
const preferredPlan = planFromQuery || planFromStorage
/** Citas primero: es el plan de entrada. */
const ORDER: PlanType[] = ['CITAS_PANEL', 'CITAS_IA', 'NEGOCIO', 'CITAS_RECORDATORIOS', 'MARCA']
const orderedPlans = [...PLANS].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type))
const initialPlan =
  orderedPlans.find((p) => p.type === preferredPlan && p.available)?.type ??
  orderedPlans.find((p) => p.available)?.type ??
  'CITAS_PANEL'

const selectedPlan = ref<PlanType>(initialPlan)
let codeFromStorage = ''
try {
  codeFromStorage = sessionStorage.getItem('pendingPromoCode') ?? ''
} catch {
  codeFromStorage = ''
}
const promoCode = ref(codeFromStorage)

async function handleContinue() {
  if (!selectedPlan.value) return
  const plan = PLANS.find((p) => p.type === selectedPlan.value)
  if (!plan?.available) {
    auth.error = 'Ese plan aún no está disponible'
    return
  }
  const ok = await auth.selectPlan(selectedPlan.value, promoCode.value.trim() || undefined)
  if (ok) {
    try {
      sessionStorage.removeItem('pendingPlanType')
      sessionStorage.removeItem('pendingPromoCode')
    } catch {
      /* ignore */
    }
    router.push('/onboarding/confirm-plan')
  }
}
</script>
