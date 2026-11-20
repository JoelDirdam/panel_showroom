<template>
  <UiCard title="Tu link de reservas" description="Compártelo en Instagram, WhatsApp o Facebook. Tus clientes eligen servicio, día y hora sin escribirte.">
    <div v-if="link" class="space-y-3">
      <div class="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-1.5 pl-3.5 pr-1.5 dark:border-gray-800 dark:bg-white/[0.03]">
        <Link2 class="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-sm text-gray-800 dark:text-gray-200" :title="link">{{ displayLink }}</span>
        <UiButton size="sm" :aria-label="copied ? 'Link copiado' : 'Copiar link de reservas'" @click="copyLink">
          <template #icon>
            <Check v-if="copied" class="h-4 w-4" aria-hidden="true" />
            <Copy v-else class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ copied ? 'Copiado' : 'Copiar' }}
        </UiButton>
      </div>
      <div class="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <UiButton variant="wa" :href="whatsappShare" target="_blank" @click="markLinkShared">
          <template #icon><MessageCircle class="h-4 w-4" aria-hidden="true" /></template>
          Compartir por WhatsApp
        </UiButton>
        <UiButton variant="secondary" :href="link" target="_blank">
          <template #icon><ExternalLink class="h-4 w-4" aria-hidden="true" /></template>
          Ver como cliente
        </UiButton>
      </div>
    </div>
    <p v-else class="text-sm text-gray-500">Tu link aparecerá aquí cuando termines de crear tu negocio.</p>

    <ul v-if="showChecklist" class="mt-5 space-y-2 border-t border-gray-100 pt-4 text-sm dark:border-gray-800">
      <li class="flex items-center gap-2">
        <span
          :class="[
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            hasServices ? 'bg-success-600 text-white' : 'border border-gray-300 dark:border-gray-600',
          ]"
          aria-hidden="true"
        >
          <Check v-if="hasServices" class="h-3 w-3" />
        </span>
        <span :class="hasServices ? 'text-gray-500 line-through' : 'text-gray-800 dark:text-gray-200'">
          Agrega al menos un servicio
          <span class="sr-only">{{ hasServices ? '(listo)' : '(pendiente)' }}</span>
        </span>
        <router-link v-if="!hasServices" to="/appointments/config" class="ml-auto font-semibold text-brand-600 hover:underline">
          Agregar
        </router-link>
      </li>
      <li class="flex items-center gap-2">
        <span class="h-5 w-5 shrink-0 rounded-full border border-gray-300 dark:border-gray-600" aria-hidden="true" />
        <span class="text-gray-800 dark:text-gray-200">Revisa tus horarios de atención</span>
        <router-link to="/appointments/config" class="ml-auto font-semibold text-brand-600 hover:underline">Revisar</router-link>
      </li>
    </ul>
  </UiCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy, ExternalLink, Link2, MessageCircle } from 'lucide-vue-next'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useToast } from '@/composables/useToast'
import { markLinkShared } from '@/lib/linkShared'

const props = defineProps<{ link: string; hasServices: boolean; showChecklist?: boolean }>()
const toast = useToast()
const copied = ref(false)

const displayLink = computed(() => props.link.replace(/^https?:\/\//, ''))
const whatsappShare = computed(
  () => `https://wa.me/?text=${encodeURIComponent(`Agenda tu cita aquí: ${props.link}`)}`,
)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.link)
    markLinkShared()
    copied.value = true
    toast.success('Link copiado', 'Pégalo en tu bio, estados o mensajes.')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('No se pudo copiar', 'Mantén presionado el link para copiarlo a mano.')
  }
}
</script>
