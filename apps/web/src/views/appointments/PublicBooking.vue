<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-900">
    <main id="contenido" tabindex="-1" class="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <div v-if="loading" class="mx-auto max-w-lg space-y-4" aria-busy="true" aria-label="Cargando">
        <div class="mx-auto h-16 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-white/10" />
        <div class="mx-auto h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-white/10" />
        <div class="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/10" />
      </div>

      <div v-else-if="loadError" class="ui-card mx-auto max-w-lg p-8 text-center">
        <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/5" aria-hidden="true">
          <SearchX class="h-6 w-6" />
        </span>
        <h1 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">No encontramos este negocio</h1>
        <p class="mt-2 text-[15px] text-gray-600 dark:text-gray-400">{{ loadError }}</p>
      </div>

      <template v-else-if="data">
        <!-- Encabezado del negocio -->
        <header class="mb-6 flex items-center gap-4 sm:mb-8">
          <img v-if="logoSrc" :src="logoSrc" alt="" class="h-14 w-14 shrink-0 rounded-2xl object-cover ring-1 ring-gray-200 sm:h-16 sm:w-16" />
          <span
            v-else
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-xl font-semibold text-white sm:h-16 sm:w-16"
            aria-hidden="true"
          >
            {{ initials }}
          </span>
          <div class="min-w-0">
            <h1 class="text-2xl font-semibold leading-tight text-gray-900 sm:text-[28px] dark:text-white">{{ data.business.name }}</h1>
            <p class="mt-0.5 text-[15px] text-gray-600 dark:text-gray-400">
              Agenda tu cita en línea<template v-if="data.business.address"> · {{ data.business.address }}</template>
            </p>
          </div>
        </header>

        <!-- Cita solicitada -->
        <div v-if="done" class="ui-card mx-auto max-w-lg p-6 text-center sm:p-8" role="status">
          <span class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-50 text-success-700" aria-hidden="true">
            <CalendarCheck class="h-7 w-7" />
          </span>
          <h2 class="mt-4 text-xl font-semibold text-gray-900 dark:text-white">¡Cita solicitada!</h2>
          <div class="mt-4 rounded-xl bg-gray-50 p-4 text-left dark:bg-white/[0.04]">
            <p class="font-semibold text-gray-900 dark:text-white">{{ done.service.name }}</p>
            <p class="mt-0.5 text-[15px] text-gray-700 first-letter:uppercase dark:text-gray-300">{{ formatDateTime(done.startTime) }}</p>
          </div>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            {{ data.business.name }} confirmará tu cita. Guarda esta pantalla como comprobante.
          </p>
          <UiButton variant="secondary" class="mt-6" @click="reset">Agendar otra cita</UiButton>
        </div>

        <div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <form class="min-w-0 space-y-4" @submit.prevent="submit">
            <!-- 1. Servicio -->
            <section class="ui-card p-5 sm:p-6" aria-labelledby="paso-servicio">
              <h2 id="paso-servicio" class="flex items-center gap-2.5 text-[17px] font-semibold text-gray-900 dark:text-white">
                <StepDot :n="1" :done="!!serviceId" />
                Elige el servicio
              </h2>
              <p v-if="data.services.length === 0" class="mt-3 text-sm text-gray-600">Este negocio aún no tiene servicios disponibles.</p>
              <fieldset v-else class="mt-4">
                <legend class="sr-only">Servicio</legend>
                <div class="grid gap-2 sm:grid-cols-2">
                  <label
                    v-for="s in data.services"
                    :key="s.id"
                    :class="[
                      'flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500',
                      serviceId === s.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700',
                    ]"
                  >
                    <input v-model="serviceId" type="radio" name="servicio" :value="s.id" class="sr-only" @change="loadSlots" />
                    <span
                      :class="[
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                        serviceId === s.id ? 'border-brand-500 bg-brand-500' : 'border-gray-300 dark:border-gray-600',
                      ]"
                      aria-hidden="true"
                    >
                      <span v-if="serviceId === s.id" class="h-2 w-2 rounded-full bg-white" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block font-semibold text-gray-900 dark:text-white">{{ s.name }}</span>
                      <span class="block text-sm text-gray-600 dark:text-gray-400">{{ s.durationMinutes }} min</span>
                    </span>
                    <span class="shrink-0 font-semibold tabular-nums text-gray-900 dark:text-white">{{ money(s.price) }}</span>
                  </label>
                </div>
              </fieldset>
            </section>

            <!-- Sucursal -->
            <section v-if="data.sucursales.length > 1" class="ui-card p-5 sm:p-6">
              <label for="sucursal" class="text-[17px] font-semibold text-gray-900 dark:text-white">Sucursal</label>
              <select id="sucursal" v-model="sucursalId" class="ui-input mt-3" @change="loadSlots">
                <option value="" disabled>Elige una sucursal</option>
                <option v-for="s in data.sucursales" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </section>

            <!-- 2. Día -->
            <section class="ui-card p-5 sm:p-6" aria-labelledby="paso-dia">
              <h2 id="paso-dia" class="flex items-center gap-2.5 text-[17px] font-semibold text-gray-900 dark:text-white">
                <StepDot :n="2" :done="!!date" />
                Elige el día
              </h2>
              <div class="-mx-5 mt-4 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6">
                <div class="flex gap-2" role="group" aria-label="Próximos días">
                  <button
                    v-for="d in nextDays"
                    :key="d.iso"
                    type="button"
                    :disabled="d.closed"
                    :aria-pressed="date === d.iso"
                    :aria-label="`${d.long}${d.closed ? ', cerrado' : ''}`"
                    :class="[
                      'flex min-h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border text-center transition-colors',
                      date === d.iso
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : d.closed
                          ? 'cursor-not-allowed border-dashed border-gray-200 text-gray-400 dark:border-gray-700'
                          : 'border-gray-200 text-gray-800 hover:border-brand-300 dark:border-gray-700 dark:text-gray-200',
                    ]"
                    @click="pickDate(d.iso)"
                  >
                    <span class="text-[12px] font-medium capitalize">{{ d.weekday }}</span>
                    <span class="font-display text-xl font-semibold leading-tight tabular-nums">{{ d.day }}</span>
                    <span v-if="d.closed" class="text-[10px]">Cerrado</span>
                  </button>
                </div>
              </div>
              <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <label for="otra-fecha" class="text-gray-600 dark:text-gray-400">¿Otra fecha?</label>
                <input
                  id="otra-fecha"
                  v-model="date"
                  type="date"
                  :min="minDate"
                  :max="maxDate"
                  class="ui-input w-auto"
                  @change="loadSlots"
                />
              </div>
            </section>

            <!-- 3. Hora -->
            <section v-if="serviceId && date" class="ui-card p-5 sm:p-6" aria-labelledby="paso-hora">
              <h2 id="paso-hora" class="flex items-center gap-2.5 text-[17px] font-semibold text-gray-900 dark:text-white">
                <StepDot :n="3" :done="!!time" />
                Elige la hora
              </h2>
              <div v-if="loadingSlots" class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" aria-busy="true" aria-label="Buscando horarios">
                <div v-for="n in 6" :key="n" class="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
              </div>
              <p v-else-if="slots.length === 0" class="mt-3 text-[15px] text-gray-600 dark:text-gray-400">
                No hay horarios disponibles ese día. Prueba con otra fecha.
              </p>
              <div v-else class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5" role="group" aria-label="Horarios disponibles">
                <button
                  v-for="t in slots"
                  :key="t"
                  type="button"
                  :aria-pressed="time === t"
                  :class="[
                    'min-h-11 rounded-xl border text-[15px] font-semibold tabular-nums transition-colors',
                    time === t
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : 'border-gray-200 text-gray-800 hover:border-brand-300 dark:border-gray-700 dark:text-gray-200',
                  ]"
                  @click="time = t"
                >
                  {{ t }}
                </button>
              </div>
            </section>

            <!-- 4. Datos -->
            <section v-if="time" class="ui-card space-y-4 p-5 sm:p-6" aria-labelledby="paso-datos">
              <h2 id="paso-datos" class="flex items-center gap-2.5 text-[17px] font-semibold text-gray-900 dark:text-white">
                <StepDot :n="4" :done="false" />
                Tus datos
              </h2>
              <UiField v-slot="f" label="Tu nombre" required>
                <input :id="f.id" v-model="customerName" required minlength="2" autocomplete="name" placeholder="Ej. Ana López" class="ui-input" />
              </UiField>
              <UiField v-slot="f" label="Tu WhatsApp" required help="10 dígitos. Ahí te llegará el recordatorio de tu cita.">
                <input
                  :id="f.id"
                  v-model="customerPhone"
                  required
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel-national"
                  placeholder="618 123 4567"
                  class="ui-input"
                  :aria-describedby="f.describedBy"
                />
              </UiField>
              <UiField v-slot="f" label="Notas" optional>
                <textarea :id="f.id" v-model="notes" rows="2" maxlength="500" placeholder="Algo que debamos saber" class="ui-input" />
              </UiField>
              <p class="text-[13px] leading-5 text-gray-500">
                Al agendar aceptas que {{ data.business.name }} use tu nombre y teléfono para gestionar tu cita y
                enviarte recordatorios. COSDI procesa estos datos por cuenta del negocio.
              </p>
              <p v-if="error" class="ui-error" role="alert">{{ error }}</p>
              <UiButton type="submit" block class="min-h-12 text-[15px]" :loading="submitting" loading-text="Agendando…">
                Confirmar cita
              </UiButton>
            </section>
            <p v-else-if="error" class="ui-error" role="alert">{{ error }}</p>
          </form>

          <!-- Resumen -->
          <aside class="ui-card p-5 lg:sticky lg:top-6" aria-label="Resumen de tu cita">
            <h2 class="text-[15px] font-semibold text-gray-900 dark:text-white">Tu cita</h2>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-gray-500">Servicio</dt>
                <dd class="text-right font-medium text-gray-900 dark:text-white">{{ selectedService?.name ?? '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-gray-500">Día</dt>
                <dd class="text-right font-medium text-gray-900 first-letter:uppercase dark:text-white">{{ dateLabel || '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-gray-500">Hora</dt>
                <dd class="text-right font-medium tabular-nums text-gray-900 dark:text-white">{{ time || '—' }}</dd>
              </div>
              <div v-if="selectedService" class="flex justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                <dt class="text-gray-500">Precio</dt>
                <dd class="text-right font-semibold tabular-nums text-gray-900 dark:text-white">{{ money(selectedService.price) }}</dd>
              </div>
            </dl>
            <details class="group mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <summary class="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                Horario del negocio
                <ChevronDown class="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <ul class="mt-1 space-y-1.5 text-sm">
                <li v-for="h in orderedHours" :key="h.dayOfWeek" class="flex justify-between gap-3">
                  <span class="text-gray-600 dark:text-gray-400">{{ WEEKDAY_LABELS[h.dayOfWeek] }}</span>
                  <span class="text-right tabular-nums text-gray-900 dark:text-white">{{ describeHours(h) }}</span>
                </li>
              </ul>
            </details>
          </aside>
        </div>

        <p class="mt-10 text-center text-xs text-gray-500">Reservas con COSDI</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarCheck, Check, ChevronDown, SearchX } from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import {
  bookPublic,
  getPublicBusiness,
  getPublicSlots,
  WEEKDAY_LABELS,
  type BusinessHourItem,
  type PublicBusiness,
} from '@/services/citas'
import { extractApiError } from '@/services/api'
import { resolveUploadUrl } from '@/utils/mediaUrl'

/** Número del paso; se vuelve palomita cuando ya está elegido. */
const StepDot = defineComponent({
  props: { n: { type: Number, required: true }, done: Boolean },
  setup(props) {
    return () =>
      h(
        'span',
        {
          class: [
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            props.done ? 'bg-success-600 text-white' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15',
          ],
          'aria-hidden': 'true',
        },
        props.done ? [h(Check, { class: 'h-4 w-4' })] : String(props.n),
      )
  },
})

const route = useRoute()
const slug = String(route.params.slug || '')

const data = ref<PublicBusiness | null>(null)
const loading = ref(true)
const loadError = ref('')
const serviceId = ref('')
const sucursalId = ref('')
const date = ref('')
const time = ref('')
const slots = ref<string[]>([])
const loadingSlots = ref(false)
const customerName = ref('')
const customerPhone = ref('')
const notes = ref('')
const submitting = ref(false)
const error = ref('')
const done = ref<Awaited<ReturnType<typeof bookPublic>> | null>(null)

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const minDate = isoLocal(new Date())
const maxDate = computed(() => isoLocal(new Date(Date.now() + (data.value?.maxDaysAhead ?? 90) * 86_400_000)))

const logoSrc = computed(() => resolveUploadUrl(data.value?.business.logoUrl))
const initials = computed(() => {
  const words = (data.value?.business.name ?? '').split(/\s+/).filter(Boolean)
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase()
})
const money = (v: string | number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

const selectedService = computed(() => data.value?.services.find((s) => s.id === serviceId.value) ?? null)
const dateLabel = computed(() =>
  date.value
    ? new Date(`${date.value}T00:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
    : '',
)

const closedDays = computed(() => new Set((data.value?.hours ?? []).filter((h) => h.isClosed).map((h) => h.dayOfWeek)))
const nextDays = computed(() => {
  const out = []
  const limit = Math.min(14, (data.value?.maxDaysAhead ?? 14) + 1)
  for (let i = 0; i < limit; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    out.push({
      iso: isoLocal(d),
      weekday: i === 0 ? 'Hoy' : d.toLocaleDateString('es-MX', { weekday: 'short' }).replace('.', ''),
      day: d.getDate(),
      long: d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
      closed: closedDays.value.has(d.getDay()),
    })
  }
  return out
})

const orderedHours = computed(() =>
  [...(data.value?.hours ?? [])].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7)),
)
function describeHours(h: BusinessHourItem) {
  if (h.isClosed) return 'Cerrado'
  if (h.breakStart && h.breakEnd) return `${h.openTime}–${h.breakStart}, ${h.breakEnd}–${h.closeTime}`
  return `${h.openTime}–${h.closeTime}`
}

function pickDate(iso: string) {
  date.value = iso
  void loadSlots()
}

async function loadSlots() {
  time.value = ''
  slots.value = []
  error.value = ''
  if (!serviceId.value || !date.value) return
  if (data.value && data.value.sucursales.length > 1 && !sucursalId.value) return
  loadingSlots.value = true
  try {
    slots.value = await getPublicSlots(slug, {
      date: date.value,
      serviceId: serviceId.value,
      ...(sucursalId.value ? { sucursalId: sucursalId.value } : {}),
    })
  } catch (e) {
    error.value = extractApiError(e, 'No pudimos consultar los horarios')
  } finally {
    loadingSlots.value = false
  }
}

async function submit() {
  error.value = ''
  submitting.value = true
  try {
    done.value = await bookPublic(slug, {
      serviceId: serviceId.value,
      ...(sucursalId.value ? { sucursalId: sucursalId.value } : {}),
      date: date.value,
      time: time.value,
      customerName: customerName.value,
      customerPhone: customerPhone.value,
      ...(notes.value ? { notes: notes.value } : {}),
    })
  } catch (e) {
    const message = extractApiError(e, 'No pudimos agendar tu cita')
    await loadSlots()
    error.value = message
  } finally {
    submitting.value = false
  }
}

function reset() {
  done.value = null
  serviceId.value = ''
  date.value = ''
  time.value = ''
  slots.value = []
  notes.value = ''
}

onMounted(async () => {
  try {
    data.value = await getPublicBusiness(slug)
    if (data.value.sucursales.length === 1) sucursalId.value = data.value.sucursales[0].id
  } catch (e) {
    loadError.value = extractApiError(e, 'Revisa que el enlace sea correcto.')
  } finally {
    loading.value = false
  }
})
</script>
