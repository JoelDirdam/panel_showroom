<template>
  <section
    v-if="visible"
    class="ui-card p-5 sm:p-6"
    aria-labelledby="opinion-titulo"
  >
    <div class="flex flex-wrap items-start gap-4">
      <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200" aria-hidden="true">
        <MessageSquareQuote class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <h2 id="opinion-titulo" class="text-base font-semibold text-gray-900 dark:text-white">
          <template v-if="mine?.status === 'APPROVED'">Gracias, tu opinión ya está en cosdi.mx</template>
          <template v-else-if="mine">Recibimos tu opinión</template>
          <template v-else>¿Te está sirviendo COSDI?</template>
        </h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          <template v-if="mine?.status === 'APPROVED'">Otros negocios la leen cuando deciden probar COSDI.</template>
          <template v-else-if="mine">La revisamos antes de publicarla. Puedes editarla o retirarla cuando quieras.</template>
          <template v-else>Cuéntanos en dos líneas cómo te ayuda. Con tu permiso, la publicamos en nuestra página para que otros negocios nos conozcan.</template>
        </p>
      </div>
      <div class="flex w-full flex-wrap gap-2 sm:w-auto">
        <UiButton :variant="mine ? 'secondary' : 'primary'" class="flex-1 sm:flex-none" @click="openForm">
          {{ mine ? 'Editar mi opinión' : 'Dejar mi opinión' }}
        </UiButton>
        <UiButton v-if="!mine" variant="ghost" class="flex-1 sm:flex-none" @click="later">Ahora no</UiButton>
      </div>
    </div>

    <UiModal :open="open" title="Tu opinión sobre COSDI" description="Se publica solo después de que la revisemos." @close="open = false">
      <form id="form-opinion" class="space-y-4" novalidate @submit.prevent="save">
        <fieldset>
          <legend class="ui-label">¿Qué calificación nos das?</legend>
          <div class="mt-1 flex gap-1" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              role="radio"
              :aria-checked="form.rating === n"
              :aria-label="`${n} ${n === 1 ? 'estrella' : 'estrellas'}`"
              class="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              @click="form.rating = n"
            >
              <Star :class="['h-7 w-7', n <= form.rating ? 'fill-warning-400 text-warning-500' : 'text-gray-300 dark:text-gray-600']" aria-hidden="true" />
            </button>
          </div>
        </fieldset>
        <UiField label="Tu opinión" :error="errors.quote" :help="`${form.quote.length}/600. Ej.: Desde que uso los recordatorios casi nadie falta a su cita.`" v-slot="f">
          <textarea :id="f.id" v-model="form.quote" rows="4" maxlength="600" :aria-describedby="f.describedBy" :aria-invalid="f.invalid" class="ui-input min-h-28" />
        </UiField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="Tu nombre como quieres que aparezca" :error="errors.authorName" v-slot="f">
            <input :id="f.id" v-model.trim="form.authorName" maxlength="80" autocomplete="name" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
          <UiField label="Giro y ciudad" optional help="Ej.: Estética en Durango" v-slot="f">
            <input :id="f.id" v-model.trim="form.authorRole" maxlength="80" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
        </div>
        <label class="flex items-start gap-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 dark:bg-white/[0.04] dark:text-gray-300">
          <input v-model="form.consent" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
          <span>
            Autorizo a COSDI a publicar esta opinión con mi nombre y el nombre de mi negocio
            (<strong>{{ businessName }}</strong>) en su sitio y redes sociales. Puedo retirarla cuando quiera.
          </span>
        </label>
        <p v-if="errors.consent" class="ui-error" role="alert">{{ errors.consent }}</p>
        <p v-if="errors.form" class="ui-error" role="alert">{{ errors.form }}</p>
      </form>
      <template #footer>
        <UiButton v-if="mine" variant="ghost" class="mr-auto text-error-700" @click="withdraw">Retirar mi opinión</UiButton>
        <UiButton variant="secondary" @click="open = false">Cancelar</UiButton>
        <UiButton type="submit" form="form-opinion" :loading="saving" loading-text="Enviando…">Enviar opinión</UiButton>
      </template>
    </UiModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { MessageSquareQuote, Star } from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/services/api'
import { deleteMyTestimonial, getMyTestimonial, saveMyTestimonial, type MyTestimonial } from '@/services/testimonials'

/**
 * Pide la opinión del negocio sobre COSDI. Aparece cuando ya lleva un tiempo
 * usándolo (`ready`) y se puede posponer 30 días con "Ahora no".
 */
const props = defineProps<{ ready: boolean }>()
const auth = useAuthStore()
const toast = useToast()

const mine = ref<MyTestimonial | null>(null)
const loaded = ref(false)
const snoozed = ref(false)
const open = ref(false)
const saving = ref(false)
const businessName = computed(() => auth.user?.tenant?.name ?? 'mi negocio')
const snoozeKey = computed(() => `cosdi:opinion-despues:${auth.user?.tenantId ?? ''}`)

const visible = computed(() => loaded.value && (mine.value !== null || (props.ready && !snoozed.value)))

const form = reactive({ rating: 5, quote: '', authorName: '', authorRole: '', consent: false })
const errors = reactive<{ quote: string | null; authorName: string | null; consent: string | null; form: string | null }>({
  quote: null,
  authorName: null,
  consent: null,
  form: null,
})

onMounted(async () => {
  const until = Number(localStorage.getItem(snoozeKey.value) ?? 0)
  snoozed.value = until > Date.now()
  try {
    mine.value = await getMyTestimonial()
  } catch {
    mine.value = null
  } finally {
    loaded.value = true
  }
})

function openForm() {
  Object.assign(form, {
    rating: mine.value?.rating ?? 5,
    quote: mine.value?.quote ?? '',
    authorName: mine.value?.authorName ?? auth.user?.name ?? '',
    authorRole: mine.value?.authorRole ?? '',
    consent: false,
  })
  Object.assign(errors, { quote: null, authorName: null, consent: null, form: null })
  open.value = true
}

function later() {
  localStorage.setItem(snoozeKey.value, String(Date.now() + 30 * 86_400_000))
  snoozed.value = true
}

async function save() {
  errors.quote = form.quote.trim().length < 20 ? 'Escribe al menos 20 caracteres' : null
  errors.authorName = form.authorName.length < 2 ? 'Escribe tu nombre' : null
  errors.consent = form.consent ? null : 'Marca la casilla para autorizar la publicación'
  errors.form = null
  if (errors.quote || errors.authorName || errors.consent) return
  saving.value = true
  try {
    mine.value = await saveMyTestimonial({
      rating: form.rating,
      quote: form.quote.trim(),
      authorName: form.authorName,
      authorRole: form.authorRole || null,
      consent: true,
    })
    open.value = false
    toast.success('¡Gracias por tu opinión!', 'La revisamos y te avisamos aquí cuando esté publicada.')
  } catch (e) {
    errors.form = extractApiError(e, 'No pudimos enviar tu opinión.')
  } finally {
    saving.value = false
  }
}

async function withdraw() {
  const ok = await confirm({
    title: '¿Retirar tu opinión?',
    description: 'Se borra y deja de mostrarse en el sitio de COSDI.',
    confirmText: 'Retirar',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteMyTestimonial()
    mine.value = null
    open.value = false
    later()
    toast.success('Opinión retirada')
  } catch (e) {
    toast.error('No pudimos retirarla', extractApiError(e, 'Intenta de nuevo.'))
  }
}
</script>
