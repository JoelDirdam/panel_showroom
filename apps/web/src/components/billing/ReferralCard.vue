<template>
  <component-card title="Recomienda COSDI y gana meses gratis">
    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-else-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
    <template v-else-if="summary">
      <p class="text-sm text-gray-600 dark:text-gray-300">
        Comparte tu código con otros negocios. Ellos obtienen
        <strong>{{ summary.referredPercentOff }}% de descuento en su primera mensualidad</strong> y tú
        <strong>un mes gratis</strong> por cada uno que pague su primer mes (hasta {{ summary.maxRewards }} meses).
      </p>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 px-4 py-2.5 dark:border-brand-500/40 dark:bg-brand-500/5">
          <p class="text-xs text-gray-500 dark:text-gray-400">Tu código</p>
          <p class="font-mono text-lg font-bold tracking-wide text-brand-600 dark:text-brand-400">{{ summary.code }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            :href="whatsappShare"
            target="_blank"
            rel="noopener"
            class="rounded-lg bg-success-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-success-600"
          >
            Compartir por WhatsApp
          </a>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
            @click="copyLink"
          >
            {{ copied ? '¡Link copiado!' : 'Copiar link' }}
          </button>
        </div>
      </div>

      <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt class="text-gray-500 dark:text-gray-400">Negocios registrados con tu código</dt>
          <dd class="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white">{{ summary.registered }}</dd>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt class="text-gray-500 dark:text-gray-400">Por pagar su primer mes</dt>
          <dd class="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white">{{ summary.pending }}</dd>
        </div>
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03]">
          <dt class="text-gray-500 dark:text-gray-400">Meses gratis ganados</dt>
          <dd class="mt-0.5 text-lg font-semibold text-gray-800 dark:text-white">
            {{ summary.earned }} <span class="text-sm font-normal text-gray-500">/ {{ summary.maxRewards }}</span>
          </dd>
        </div>
      </dl>
      <p v-if="summary.earned > summary.rewarded" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Tus meses ganados se abonan como saldo a favor cuando registres tu tarjeta.
      </p>
      <p v-else class="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Cada mes ganado se abona como saldo a favor y se descuenta solo de tu siguiente cobro.
      </p>
    </template>
  </component-card>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { extractApiError } from '@/services/api'
import { fetchReferralSummary, type ReferralSummary } from '@/services/billing'

const loading = ref(true)
const error = ref<string | null>(null)
const summary = ref<ReferralSummary | null>(null)
const copied = ref(false)

const shareLink = computed(() =>
  summary.value ? `${window.location.origin}/register?plan=CITAS_PANEL&ref=${encodeURIComponent(summary.value.code)}` : '',
)

const whatsappShare = computed(() => {
  if (!summary.value) return '#'
  const text =
    `Uso COSDI para mi agenda de citas y los recordatorios por WhatsApp. ` +
    `Regístrate con mi código ${summary.value.code} y obtén ${summary.value.referredPercentOff}% en tu primer mes: ${shareLink.value}`
  return `https://wa.me/?text=${encodeURIComponent(text)}`
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2500)
  } catch {
    error.value = 'No se pudo copiar el link'
  }
}

onMounted(async () => {
  try {
    summary.value = await fetchReferralSummary()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar tu código de recomendación')
  } finally {
    loading.value = false
  }
})
</script>
