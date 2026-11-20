<template>
  <platform-layout>
    <PageHeader
      title="Testimonios"
      description="Opiniones de negocios que usan COSDI. Solo las que apruebes aparecen en la landing (las 12 más recientes)."
    >
      <template #actions>
        <UiButton @click="openAdd">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Agregar desde redes
        </UiButton>
      </template>
    </PageHeader>

    <section class="mb-6 grid gap-3 md:grid-cols-3" aria-label="Cómo llegan los testimonios">
      <div v-for="s in flow" :key="s.title" class="ui-card p-4">
        <component :is="s.icon" class="h-5 w-5 text-brand-600" aria-hidden="true" />
        <h2 class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{{ s.title }}</h2>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">{{ s.text }}</p>
      </div>
    </section>

    <div class="mb-4 flex gap-1 overflow-x-auto" role="tablist" aria-label="Filtrar por estado">
      <button
        v-for="t in tabs"
        :key="t.value"
        type="button"
        role="tab"
        :aria-selected="tab === t.value"
        :class="[
          'inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-medium',
          tab === t.value
            ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
            : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300 dark:ring-gray-800',
        ]"
        @click="tab = t.value"
      >
        {{ t.label }}
        <span class="rounded-full bg-black/10 px-2 text-xs tabular-nums dark:bg-white/15">{{ count(t.value) }}</span>
      </button>
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2" aria-busy="true">
      <div v-for="n in 4" :key="n" class="h-44 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />
    </div>
    <p v-else-if="error" role="alert" class="rounded-xl bg-error-50 p-4 text-sm text-error-700">
      {{ error }} <button type="button" class="font-semibold underline" @click="load">Reintentar</button>
    </p>
    <UiEmptyState
      v-else-if="!visible.length"
      :title="tab === 'PENDING' ? 'No hay testimonios por revisar' : tab === 'APPROVED' ? 'Aún no publicas testimonios' : 'No hay testimonios ocultos'"
      :description="tab === 'PENDING' ? 'Los negocios que llevan al menos 5 citas atendidas ven una invitación en su Inicio para dejar su opinión.' : 'Aprueba uno de la pestaña Por revisar o agrega uno desde redes sociales.'"
    />
    <ul v-else class="grid gap-4 md:grid-cols-2">
      <li v-for="t in visible" :key="t.id" class="ui-card flex flex-col p-5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex" :aria-label="t.rating ? `${t.rating} de 5 estrellas` : 'Sin calificación'">
            <Star
              v-for="n in 5"
              :key="n"
              :class="['h-4 w-4', t.rating && n <= t.rating ? 'fill-warning-400 text-warning-500' : 'text-gray-300 dark:text-gray-600']"
              aria-hidden="true"
            />
          </div>
          <Badge :color="t.source === 'PANEL' ? 'primary' : 'light'" size="sm">{{ SOURCE_LABEL[t.source] }}</Badge>
        </div>
        <blockquote class="mt-3 flex-1 text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">“{{ t.quote }}”</blockquote>
        <p class="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{{ t.authorName }}</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {{ t.businessName }}<template v-if="t.authorRole"> · {{ t.authorRole }}</template>
        </p>
        <p class="mt-1 text-xs text-gray-500">
          Autorizó publicarlo el {{ date(t.consentAt) }}
          <template v-if="t.sourceUrl">
            ·
            <a :href="t.sourceUrl" target="_blank" rel="noopener noreferrer" class="font-medium text-brand-600 underline">Ver publicación</a>
          </template>
        </p>
        <div class="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
          <UiButton v-if="t.status !== 'APPROVED'" size="sm" :loading="busy === t.id" @click="setStatus(t, 'APPROVED')">
            <template #icon><Check class="h-4 w-4" aria-hidden="true" /></template>
            Publicar
          </UiButton>
          <UiButton v-if="t.status !== 'HIDDEN'" size="sm" variant="secondary" :disabled="busy === t.id" @click="setStatus(t, 'HIDDEN')">
            <template #icon><EyeOff class="h-4 w-4" aria-hidden="true" /></template>
            Ocultar
          </UiButton>
          <UiButton size="sm" variant="ghost" class="ml-auto" :disabled="busy === t.id" @click="remove(t)">
            <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
            Eliminar
          </UiButton>
        </div>
      </li>
    </ul>

    <UiModal
      :open="addOpen"
      size="lg"
      title="Agregar testimonio desde redes"
      description="Copia la reseña tal como la escribió la persona. Se publica de inmediato."
      @close="addOpen = false"
    >
      <form id="form-testimonio" class="space-y-4" novalidate @submit.prevent="add">
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField label="Red social" v-slot="f">
            <select :id="f.id" v-model="form.source" class="ui-input">
              <option v-for="s in manualSources" :key="s" :value="s">{{ SOURCE_LABEL[s] }}</option>
            </select>
          </UiField>
          <UiField label="Enlace a la publicación" optional help="Debe empezar con https://" :error="errors.sourceUrl" v-slot="f">
            <input :id="f.id" v-model.trim="form.sourceUrl" type="url" inputmode="url" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
          <UiField label="Nombre de la persona" :error="errors.authorName" v-slot="f">
            <input :id="f.id" v-model.trim="form.authorName" maxlength="80" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
          <UiField label="Negocio" :error="errors.businessName" v-slot="f">
            <input :id="f.id" v-model.trim="form.businessName" maxlength="120" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
          <UiField label="Giro y ciudad" optional help="Ej.: Barbería en Durango" v-slot="f">
            <input :id="f.id" v-model.trim="form.authorRole" maxlength="80" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>
          <UiField label="Calificación" optional v-slot="f">
            <select :id="f.id" v-model.number="form.rating" class="ui-input">
              <option :value="0">Sin calificación</option>
              <option v-for="n in 5" :key="n" :value="n">{{ n }} {{ n === 1 ? 'estrella' : 'estrellas' }}</option>
            </select>
          </UiField>
        </div>
        <UiField label="Reseña" :error="errors.quote" :help="`${form.quote.length}/600`" v-slot="f">
          <textarea :id="f.id" v-model="form.quote" rows="4" maxlength="600" :aria-describedby="f.describedBy" class="ui-input min-h-28" />
        </UiField>
        <label class="flex items-start gap-3 rounded-xl bg-warning-50 p-3 text-sm text-warning-900 dark:bg-warning-500/10 dark:text-warning-100">
          <input v-model="form.permission" type="checkbox" class="mt-0.5 h-5 w-5 shrink-0 accent-brand-600" />
          <span>
            Confirmo que la persona me dio permiso (por mensaje o por escrito) de publicar su reseña con su nombre y el de su negocio
            en el sitio de COSDI.
          </span>
        </label>
        <p v-if="errors.permission" class="ui-error" role="alert">{{ errors.permission }}</p>
        <p v-if="errors.form" class="ui-error" role="alert">{{ errors.form }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="addOpen = false">Cancelar</UiButton>
        <UiButton type="submit" form="form-testimonio" :loading="saving" loading-text="Publicando…">Publicar testimonio</UiButton>
      </template>
    </UiModal>
  </platform-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Check, EyeOff, Globe, Inbox, Plus, Star, Trash2, UserCheck } from 'lucide-vue-next'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import Badge from '@/components/ui/Badge.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
import { extractApiError } from '@/services/api'
import {
  SOURCE_LABEL,
  addPlatformTestimonial,
  deletePlatformTestimonial,
  listPlatformTestimonials,
  setTestimonialStatus,
  type PlatformTestimonial,
  type TestimonialSource,
  type TestimonialStatus,
} from '@/services/testimonials'

const toast = useToast()
const items = ref<PlatformTestimonial[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref<string | null>(null)
const tab = ref<TestimonialStatus>('PENDING')

const flow = [
  {
    icon: Inbox,
    title: '1. Llegan solos desde el panel',
    text: 'Los negocios con 5 o más citas atendidas ven una invitación en su Inicio. Escriben su opinión y autorizan publicarla.',
  },
  {
    icon: UserCheck,
    title: '2. Tú los revisas',
    text: 'Publica los que sean reales y claros. También puedes agregar reseñas de Facebook, Instagram, TikTok o Google con permiso de quien las escribió.',
  },
  {
    icon: Globe,
    title: '3. Aparecen en cosdi.mx',
    text: 'La landing muestra la sección de testimonios en cuanto hay al menos uno publicado. Si el negocio retira su opinión, desaparece sola.',
  },
]

const tabs: Array<{ value: TestimonialStatus; label: string }> = [
  { value: 'PENDING', label: 'Por revisar' },
  { value: 'APPROVED', label: 'Publicados' },
  { value: 'HIDDEN', label: 'Ocultos' },
]
const count = (s: TestimonialStatus) => items.value.filter((t) => t.status === s).length
const visible = computed(() => items.value.filter((t) => t.status === tab.value))

function date(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

async function load() {
  loading.value = true
  error.value = null
  try {
    items.value = await listPlatformTestimonials()
    if (!count('PENDING') && count('APPROVED')) tab.value = 'APPROVED'
  } catch (e) {
    error.value = extractApiError(e, 'No pudimos cargar los testimonios.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function setStatus(t: PlatformTestimonial, status: TestimonialStatus) {
  busy.value = t.id
  try {
    await setTestimonialStatus(t.id, status)
    t.status = status
    toast.success(status === 'APPROVED' ? 'Testimonio publicado' : 'Testimonio oculto', status === 'APPROVED' ? 'Ya aparece en la landing.' : 'Ya no aparece en la landing.')
  } catch (e) {
    toast.error('No se pudo actualizar', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    busy.value = null
  }
}

async function remove(t: PlatformTestimonial) {
  const ok = await confirm({
    title: `¿Eliminar el testimonio de ${t.authorName}?`,
    description: 'Se borra para siempre. Si solo quieres quitarlo de la landing, mejor ocúltalo.',
    confirmText: 'Eliminar',
    danger: true,
  })
  if (!ok) return
  busy.value = t.id
  try {
    await deletePlatformTestimonial(t.id)
    items.value = items.value.filter((x) => x.id !== t.id)
    toast.success('Testimonio eliminado')
  } catch (e) {
    toast.error('No se pudo eliminar', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    busy.value = null
  }
}

/* ---------- Agregar desde redes ---------- */
const manualSources: TestimonialSource[] = ['FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WHATSAPP']
const addOpen = ref(false)
const saving = ref(false)
const form = reactive({
  source: 'FACEBOOK' as TestimonialSource,
  sourceUrl: '',
  authorName: '',
  businessName: '',
  authorRole: '',
  rating: 5,
  quote: '',
  permission: false,
})
const errors = reactive<Record<string, string | null>>({})

function openAdd() {
  Object.assign(form, { source: 'FACEBOOK', sourceUrl: '', authorName: '', businessName: '', authorRole: '', rating: 5, quote: '', permission: false })
  for (const k of Object.keys(errors)) errors[k] = null
  addOpen.value = true
}

async function add() {
  errors.authorName = form.authorName.length >= 2 ? null : 'Escribe el nombre'
  errors.businessName = form.businessName.length >= 2 ? null : 'Escribe el negocio'
  errors.quote = form.quote.trim().length >= 10 ? null : 'Pega la reseña (mínimo 10 caracteres)'
  errors.sourceUrl = !form.sourceUrl || form.sourceUrl.startsWith('https://') ? null : 'El enlace debe empezar con https://'
  errors.permission = form.permission ? null : 'Necesitas su permiso para publicarla'
  errors.form = null
  if (Object.values(errors).some(Boolean)) return
  saving.value = true
  try {
    const created = await addPlatformTestimonial({
      source: form.source,
      sourceUrl: form.sourceUrl || null,
      authorName: form.authorName,
      businessName: form.businessName,
      authorRole: form.authorRole || null,
      rating: form.rating || null,
      quote: form.quote.trim(),
      permissionConfirmed: true,
    })
    items.value.unshift(created)
    tab.value = 'APPROVED'
    addOpen.value = false
    toast.success('Testimonio publicado', 'Ya aparece en la landing.')
  } catch (e) {
    errors.form = extractApiError(e, 'No se pudo guardar.')
  } finally {
    saving.value = false
  }
}
</script>
