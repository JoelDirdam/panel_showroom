<template>
  <UiCard
    title="Vacaciones y pausa de reservas"
    description="Bloquea días en los que no atiendes o pausa las reservas en línea. Tus citas ya agendadas no se cancelan."
  >
    <div v-if="loading" class="space-y-3" aria-busy="true">
      <div class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
      <div class="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
    </div>

    <p v-else-if="loadError" role="alert" class="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-300">
      {{ loadError }}
      <button type="button" class="ml-2 font-semibold underline" @click="load">Reintentar</button>
    </p>

    <div v-else-if="state" class="space-y-8">
      <!-- Pausa -->
      <section aria-labelledby="pausa-titulo">
        <div
          :class="[
            'rounded-xl border p-4',
            state.pause.paused
              ? 'border-warning-300 bg-warning-50 dark:border-warning-500/40 dark:bg-warning-500/10'
              : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03]',
          ]"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h3 id="pausa-titulo" class="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <PauseCircle v-if="state.pause.paused" class="h-5 w-5 text-warning-600" aria-hidden="true" />
                <CalendarCheck v-else class="h-5 w-5 text-success-600" aria-hidden="true" />
                {{ state.pause.paused ? 'Reservas en línea en pausa' : 'Recibiendo reservas en línea' }}
              </h3>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
                <template v-if="state.pause.paused">
                  {{ state.pause.until ? `Se reanudan solas el ${longDate(state.pause.until)}.` : 'Hasta que las vuelvas a activar.' }}
                  Tus clientes ven tu mensaje en el link de reservas y el asistente de WhatsApp no agenda.
                </template>
                <template v-else>Tus clientes pueden agendar en tu link y por WhatsApp.</template>
              </p>
              <p v-if="state.pause.paused && state.pause.message" class="mt-2 text-sm italic text-gray-700 dark:text-gray-300">
                “{{ state.pause.message }}”
              </p>
            </div>
            <UiButton
              v-if="state.pause.paused"
              variant="primary"
              :loading="savingPause"
              loading-text="Activando…"
              @click="resume"
            >
              <template #icon><Play class="h-4 w-4" aria-hidden="true" /></template>
              Reanudar reservas
            </UiButton>
            <UiButton v-else-if="!pauseFormOpen" variant="secondary" @click="openPauseForm">
              <template #icon><Pause class="h-4 w-4" aria-hidden="true" /></template>
              Pausar reservas
            </UiButton>
          </div>

          <form v-if="pauseFormOpen && !state.pause.paused" class="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800" @submit.prevent="pause">
            <fieldset>
              <legend class="ui-label">¿Hasta cuándo?</legend>
              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                  <input v-model="pauseMode" type="radio" value="manual" class="h-4 w-4 accent-brand-600" />
                  Hasta que yo las reactive
                </label>
                <label class="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm dark:border-gray-800 dark:bg-gray-900">
                  <input v-model="pauseMode" type="radio" value="date" class="h-4 w-4 accent-brand-600" />
                  Hasta una fecha
                </label>
              </div>
            </fieldset>
            <UiField v-if="pauseMode === 'date'" label="Se reanudan el día" :error="pauseError" help="Ese día tus clientes ya pueden volver a agendar." v-slot="f">
              <input :id="f.id" v-model="pauseUntil" type="date" :min="tomorrow" required :aria-describedby="f.describedBy" class="ui-input sm:max-w-xs" />
            </UiField>
            <UiField label="Mensaje para tus clientes" optional help="Lo verán en tu link de reservas. Máximo 280 caracteres." v-slot="f">
              <textarea
                :id="f.id"
                v-model="pauseMessage"
                rows="2"
                maxlength="280"
                :aria-describedby="f.describedBy"
                class="ui-input min-h-20"
              />
            </UiField>
            <div class="flex flex-wrap gap-2">
              <UiButton type="submit" :loading="savingPause" loading-text="Pausando…">Pausar reservas</UiButton>
              <UiButton variant="ghost" @click="pauseFormOpen = false">Cancelar</UiButton>
            </div>
          </form>
        </div>
      </section>

      <!-- Días sin servicio -->
      <section aria-labelledby="cierres-titulo" class="space-y-4">
        <div>
          <h3 id="cierres-titulo" class="text-base font-semibold text-gray-900 dark:text-white">Días sin servicio</h3>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vacaciones, días festivos o cursos. Esos días no aparecen en tu link y el asistente no los ofrece.
          </p>
        </div>

        <ul v-if="state.closures.length" class="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
          <li v-for="c in state.closures" :key="c.id" class="flex flex-wrap items-center gap-3 p-3 sm:p-4">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              <Palmtree class="h-5 w-5" aria-hidden="true" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-gray-900 dark:text-white">{{ c.label }}</p>
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ rangeText(c.startDate, c.endDate) }}
                <span v-if="isActiveNow(c)" class="ml-1 rounded-full bg-warning-100 px-2 py-0.5 text-xs font-semibold text-warning-800 dark:bg-warning-500/20 dark:text-warning-200">En curso</span>
              </p>
              <p v-if="c.publicMessage" class="mt-0.5 truncate text-xs text-gray-500">“{{ c.publicMessage }}”</p>
            </div>
            <UiButton size="sm" variant="ghost" :aria-label="`Quitar ${c.label} (${rangeText(c.startDate, c.endDate)})`" @click="remove(c)">
              <template #icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
              Quitar
            </UiButton>
          </li>
        </ul>
        <p v-else class="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          No tienes días bloqueados. Agrégalos con anticipación para que tus clientes no agenden esos días.
        </p>

        <div v-if="holidays.length" class="space-y-2">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Próximos días festivos oficiales</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="h in holidays"
              :key="h.date"
              type="button"
              :disabled="isBlocked(h.date) || saving"
              class="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200"
              @click="addHoliday(h)"
            >
              <Check v-if="isBlocked(h.date)" class="h-4 w-4 text-success-600" aria-hidden="true" />
              <Plus v-else class="h-4 w-4" aria-hidden="true" />
              {{ h.name }} · {{ shortDate(h.date) }}
            </button>
          </div>
        </div>

        <form class="space-y-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]" novalidate @submit.prevent="save">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Bloquear días</p>
          <fieldset>
            <legend class="ui-label">Motivo</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="r in reasons"
                :key="r"
                type="button"
                :aria-pressed="reason === r"
                :class="[
                  'min-h-11 rounded-xl border px-3 text-sm font-medium',
                  reason === r
                    ? 'border-brand-500 bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-100'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
                ]"
                @click="reason = r"
              >
                {{ r }}
              </button>
            </div>
          </fieldset>
          <UiField v-if="reason === 'Otro'" label="Escribe el motivo" :error="errors.label" v-slot="f">
            <input :id="f.id" v-model.trim="customReason" maxlength="60" :aria-describedby="f.describedBy" class="ui-input sm:max-w-sm" />
          </UiField>
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField label="Desde" :error="errors.start" v-slot="f">
              <input :id="f.id" v-model="startDate" type="date" :min="state.today" :aria-describedby="f.describedBy" class="ui-input" />
            </UiField>
            <UiField label="Hasta (inclusive)" :error="errors.end" v-slot="f">
              <input :id="f.id" v-model="endDate" type="date" :min="startDate || state.today" :aria-describedby="f.describedBy" class="ui-input" />
            </UiField>
          </div>
          <UiField label="Mensaje para tus clientes" optional help="Por ejemplo: Regresamos el lunes 6 de enero. ¡Gracias por tu paciencia!" v-slot="f">
            <input :id="f.id" v-model="publicMessage" maxlength="280" :aria-describedby="f.describedBy" class="ui-input" />
          </UiField>

          <div
            v-if="affected.length"
            role="status"
            class="rounded-xl border border-warning-300 bg-warning-50 p-3 text-sm text-warning-900 dark:border-warning-500/40 dark:bg-warning-500/10 dark:text-warning-100"
          >
            <p class="flex items-center gap-2 font-semibold">
              <AlertTriangle class="h-4 w-4" aria-hidden="true" />
              Tienes {{ affected.length }} {{ affected.length === 1 ? 'cita' : 'citas' }} en esas fechas
            </p>
            <p class="mt-1">No se cancelan solas. Avísales para reagendar:</p>
            <ul class="mt-2 space-y-1.5">
              <li v-for="a in affected.slice(0, 6)" :key="a.id" class="flex flex-wrap items-center justify-between gap-2">
                <span>{{ a.customerName }} · {{ apptWhen(a.startTime) }}</span>
                <a
                  :href="waLink(a)"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex min-h-11 items-center gap-1.5 font-semibold text-wa-700 underline dark:text-wa-300"
                >
                  <MessageCircle class="h-4 w-4" aria-hidden="true" />Avisar por WhatsApp
                </a>
              </li>
            </ul>
            <router-link v-if="affected.length > 6" to="/appointments" class="mt-2 inline-block font-semibold underline">
              Ver las {{ affected.length }} en Citas
            </router-link>
          </div>

          <UiButton type="submit" :loading="saving" loading-text="Guardando…">
            <template #icon><CalendarX class="h-4 w-4" aria-hidden="true" /></template>
            Bloquear estos días
          </UiButton>
        </form>
      </section>
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  AlertTriangle,
  CalendarCheck,
  CalendarX,
  Check,
  MessageCircle,
  Palmtree,
  Pause,
  PauseCircle,
  Play,
  Plus,
  Trash2,
} from 'lucide-vue-next'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
import { extractApiError } from '@/services/api'
import {
  addClosure,
  deleteClosure,
  getBookingSettings,
  previewClosure,
  setBookingPause,
  type AffectedAppointment,
  type BookingSettingsState,
  type BusinessClosure,
} from '@/services/bookingSettings'
import { upcomingHolidays, type Holiday } from '@/lib/holidaysMx'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{ changed: [BookingSettingsState] }>()
const toast = useToast()
const auth = useAuthStore()

const state = ref<BookingSettingsState | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)

async function load() {
  loading.value = true
  loadError.value = null
  try {
    state.value = await getBookingSettings()
  } catch (e) {
    loadError.value = extractApiError(e, 'No pudimos cargar tus vacaciones y pausas.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function apply(next: BookingSettingsState) {
  state.value = next
  emit('changed', next)
}

/* ---------- Fechas ---------- */
function toDate(iso: string) {
  return new Date(`${iso}T12:00:00`)
}
function longDate(iso: string) {
  return toDate(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}
function shortDate(iso: string) {
  return toDate(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}
function rangeText(a: string, b: string) {
  if (a === b) return longDate(a)
  return `Del ${shortDate(a)} al ${toDate(b).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}`
}
function addDays(iso: string, n: number) {
  const d = toDate(iso)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const tomorrow = computed(() => (state.value ? addDays(state.value.today, 1) : ''))
function isActiveNow(c: BusinessClosure) {
  const t = state.value?.today ?? ''
  return c.startDate <= t && t <= c.endDate
}
function isBlocked(date: string) {
  return state.value?.closures.some((c) => c.startDate <= date && date <= c.endDate) ?? false
}
function apptWhen(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/* ---------- Pausa ---------- */
const pauseFormOpen = ref(false)
const pauseMode = ref<'manual' | 'date'>('manual')
const pauseUntil = ref('')
const pauseMessage = ref('')
const pauseError = ref<string | null>(null)
const savingPause = ref(false)

function openPauseForm() {
  pauseFormOpen.value = true
  pauseMode.value = 'manual'
  pauseUntil.value = ''
  pauseMessage.value = 'Por ahora no estamos tomando citas en línea. Escríbenos por WhatsApp y con gusto te atendemos.'
}

async function pause() {
  pauseError.value = null
  if (pauseMode.value === 'date' && !pauseUntil.value) {
    pauseError.value = 'Elige el día en que se reanudan'
    return
  }
  savingPause.value = true
  try {
    apply(
      await setBookingPause({
        paused: true,
        message: pauseMessage.value.trim() || null,
        until: pauseMode.value === 'date' ? pauseUntil.value : null,
      }),
    )
    pauseFormOpen.value = false
    toast.success('Reservas en pausa', 'Tus clientes verán tu mensaje en el link de reservas.')
  } catch (e) {
    pauseError.value = extractApiError(e, 'No pudimos pausar las reservas.')
  } finally {
    savingPause.value = false
  }
}

async function resume() {
  savingPause.value = true
  try {
    apply(await setBookingPause({ paused: false }))
    toast.success('Reservas reanudadas', 'Tus clientes ya pueden volver a agendar.')
  } catch (e) {
    toast.error('No pudimos reanudar las reservas', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    savingPause.value = false
  }
}

/* ---------- Cierres ---------- */
const reasons = ['Vacaciones', 'Día festivo', 'Curso o capacitación', 'Asunto personal', 'Otro']
const reason = ref('Vacaciones')
const customReason = ref('')
const startDate = ref('')
const endDate = ref('')
const publicMessage = ref('')
const saving = ref(false)
const errors = reactive<{ label: string | null; start: string | null; end: string | null }>({
  label: null,
  start: null,
  end: null,
})
const affected = ref<AffectedAppointment[]>([])

const holidays = computed<Holiday[]>(() => (state.value ? upcomingHolidays(state.value.today) : []))

let previewTimer: ReturnType<typeof setTimeout> | null = null
watch([startDate, endDate], ([s, e]) => {
  if (s && (!e || e < s)) endDate.value = s
  affected.value = []
  if (previewTimer) clearTimeout(previewTimer)
  if (!s || !endDate.value || !state.value || endDate.value < state.value.today) return
  previewTimer = setTimeout(async () => {
    try {
      affected.value = await previewClosure(s, endDate.value)
    } catch {
      affected.value = []
    }
  }, 350)
})

function validate(): boolean {
  errors.label = reason.value === 'Otro' && !customReason.value ? 'Escribe el motivo' : null
  errors.start = startDate.value ? null : 'Elige el primer día'
  errors.end = endDate.value ? (endDate.value < startDate.value ? 'Debe ser igual o después del primer día' : null) : 'Elige el último día'
  return !errors.label && !errors.start && !errors.end
}

async function save() {
  if (!validate()) return
  saving.value = true
  try {
    const res = await addClosure({
      startDate: startDate.value,
      endDate: endDate.value,
      label: reason.value === 'Otro' ? customReason.value : reason.value,
      publicMessage: publicMessage.value.trim() || null,
    })
    apply(res)
    const n = res.appointments.length
    toast.success(
      'Días bloqueados',
      n ? `Recuerda avisar a ${n} ${n === 1 ? 'cliente' : 'clientes'} con cita en esas fechas.` : 'Tus clientes ya no podrán agendar esos días.',
    )
    if (!n) {
      startDate.value = ''
      endDate.value = ''
      publicMessage.value = ''
    }
  } catch (e) {
    toast.error('No pudimos bloquear esos días', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    saving.value = false
  }
}

async function addHoliday(h: Holiday) {
  saving.value = true
  try {
    apply(await addClosure({ startDate: h.date, endDate: h.date, label: h.name }))
    toast.success(`${h.name} bloqueado`, longDate(h.date))
  } catch (e) {
    toast.error('No pudimos bloquear ese día', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    saving.value = false
  }
}

async function remove(c: BusinessClosure) {
  const ok = await confirm({
    title: `¿Quitar “${c.label}”?`,
    description: `${rangeText(c.startDate, c.endDate)} volverá a estar disponible para reservar.`,
    confirmText: 'Quitar',
    danger: true,
  })
  if (!ok) return
  try {
    apply(await deleteClosure(c.id))
    toast.success('Días liberados', 'Tus clientes ya pueden agendar en esas fechas.')
  } catch (e) {
    toast.error('No pudimos quitarlo', extractApiError(e, 'Intenta de nuevo.'))
  }
}

function waLink(a: AffectedAppointment) {
  const digits = a.customerPhone.replace(/\D/g, '')
  const phone = digits.length === 10 ? `52${digits}` : digits
  const business = auth.user?.tenant?.name ?? 'nuestro negocio'
  const text = `Hola ${a.customerName}, te escribimos de ${business}. Ese día no vamos a abrir (${
    reason.value === 'Otro' ? customReason.value || 'cierre' : reason.value.toLowerCase()
  }). ¿Te parece si reagendamos tu cita del ${apptWhen(a.startTime)}?`
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
}
</script>
