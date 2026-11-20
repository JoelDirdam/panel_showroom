<template>
  <admin-layout>
    <PageHeader title="Citas" description="Tu agenda del día o de la semana. Confirma, completa o cancela cada cita.">
      <template #actions>
        <UiButton :disabled="activeServices.length === 0" @click="openNew">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Nueva cita
        </UiButton>
      </template>
    </PageHeader>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <!-- Agenda -->
      <UiCard>
        <template #header>
          <div class="min-w-0">
            <h2 class="text-[17px] font-semibold text-gray-900 first-letter:uppercase dark:text-white">{{ periodTitle }}</h2>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
              {{ loading ? 'Cargando citas…' : summaryText }}
            </p>
          </div>
        </template>

        <div class="flex flex-wrap items-center gap-2">
          <div class="flex items-center gap-1">
            <UiButton variant="secondary" class="!px-3" :aria-label="weekView ? 'Semana anterior' : 'Día anterior'" @click="shift(-1)">
              <template #icon><ChevronLeft class="h-4 w-4" aria-hidden="true" /></template>
            </UiButton>
            <label for="agenda-date" class="sr-only">Fecha</label>
            <input id="agenda-date" v-model="day" type="date" class="ui-input w-auto" @change="load" />
            <UiButton variant="secondary" class="!px-3" :aria-label="weekView ? 'Semana siguiente' : 'Día siguiente'" @click="shift(1)">
              <template #icon><ChevronRight class="h-4 w-4" aria-hidden="true" /></template>
            </UiButton>
          </div>
          <UiButton variant="secondary" @click="goToday">Hoy</UiButton>
          <div class="inline-flex rounded-[10px] bg-gray-100 p-1 sm:ml-auto dark:bg-white/5" role="group" aria-label="Periodo">
            <button
              v-for="opt in periodOptions"
              :key="opt.label"
              type="button"
              :aria-pressed="weekView === opt.week"
              :class="[
                'min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors',
                weekView === opt.week
                  ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400',
              ]"
              @click="setWeekView(opt.week)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <p v-if="error" class="mt-4 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
          {{ error }}
          <button type="button" class="ml-2 font-semibold underline" @click="load">Reintentar</button>
        </p>

        <div v-if="loading" class="mt-5 space-y-3" aria-hidden="true">
          <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        </div>

        <UiEmptyState
          v-else-if="appointments.length === 0 && !error"
          class="mt-2"
          :title="weekView ? 'No hay citas en estos 7 días' : 'No hay citas este día'"
          :description="
            activeServices.length
              ? 'Comparte tu link de reservas para que tus clientes agenden solos, o registra una cita tú.'
              : 'Primero agrega tus servicios para empezar a recibir citas.'
          "
        >
          <template #icon><CalendarDays class="h-5 w-5" /></template>
          <UiButton v-if="activeServices.length" variant="secondary" @click="openNew">Registrar una cita</UiButton>
          <UiButton v-else to="/appointments/config">Agregar servicios</UiButton>
        </UiEmptyState>

        <div v-else class="mt-5 space-y-6">
          <section v-for="group in grouped" :key="group.key" :aria-label="group.label">
            <h3 v-if="weekView" class="mb-2 text-sm font-semibold text-gray-600 first-letter:uppercase dark:text-gray-400">
              {{ group.label }}
            </h3>
            <ul class="space-y-3">
              <li
                v-for="a in group.items"
                :key="a.id"
                :class="[
                  'flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center',
                  a.status === 'CANCELLED' || a.status === 'NO_SHOW'
                    ? 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-transparent',
                ]"
              >
                <div class="flex items-center gap-3 sm:w-32 sm:flex-col sm:items-start sm:gap-0">
                  <time :datetime="a.startTime" class="font-display text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {{ hhmm(a.startTime) }}
                  </time>
                  <span class="text-[13px] text-gray-500">hasta {{ hhmm(a.endTime) }}</span>
                  <Badge class="ml-auto sm:hidden" size="sm" :color="statusColor[a.status]">{{ STATUS_LABELS[a.status] }}</Badge>
                </div>
                <div class="min-w-0 flex-1">
                  <p
                    class="font-semibold text-gray-900 dark:text-white"
                    :class="a.status === 'CANCELLED' && 'line-through decoration-gray-400'"
                  >
                    {{ a.customerName }}
                  </p>
                  <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                    {{ a.service?.name ?? 'Sin servicio' }}
                    <span aria-hidden="true"> · </span>
                    <a
                      :href="`https://wa.me/${waNumber(a.customerPhone)}`"
                      target="_blank"
                      rel="noopener"
                      class="font-medium text-wa-700 underline-offset-2 hover:underline dark:text-wa-500"
                      :aria-label="`Escribir por WhatsApp a ${a.customerName}, ${a.customerPhone}`"
                      >{{ a.customerPhone }}</a
                    >
                  </p>
                  <p v-if="a.notes" class="mt-1 text-sm text-gray-500">{{ a.notes }}</p>
                  <p
                    v-if="a.customerReply"
                    class="mt-1.5 inline-flex items-center gap-1 text-[13px] font-medium text-wa-700 dark:text-wa-500"
                  >
                    <MessageCircle class="h-3.5 w-3.5" aria-hidden="true" />
                    {{ CUSTOMER_REPLY_LABELS[a.customerReply] }}
                  </p>
                </div>
                <Badge class="hidden sm:inline-flex" size="sm" :color="statusColor[a.status]">{{ STATUS_LABELS[a.status] }}</Badge>
                <div
                  v-if="a.status === 'PENDING' || a.status === 'CONFIRMED'"
                  class="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end"
                >
                  <UiButton v-if="a.status === 'PENDING'" size="sm" @click="setStatus(a, 'CONFIRMED')">Confirmar</UiButton>
                  <UiButton v-if="a.status === 'CONFIRMED'" size="sm" @click="setStatus(a, 'COMPLETED')">Completar</UiButton>
                  <UiButton
                    v-if="new Date(a.startTime) < new Date()"
                    size="sm"
                    variant="secondary"
                    title="El cliente no llegó"
                    @click="setStatus(a, 'NO_SHOW')"
                  >
                    No asistió
                  </UiButton>
                  <UiButton size="sm" variant="danger" @click="setStatus(a, 'CANCELLED')">Cancelar</UiButton>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </UiCard>

      <BookingLinkCard :link="bookingLink" :has-services="services.length > 0" :show-checklist="activeServices.length === 0" />
    </div>

    <!-- Nueva cita -->
    <UiModal
      :open="showNew"
      title="Nueva cita"
      description="Registra una cita que te pidieron por teléfono o en persona."
      @close="showNew = false"
    >
      <form id="new-appointment" class="space-y-4" novalidate @submit.prevent="saveNew">
        <UiField v-slot="f" label="Servicio" required :error="newErrors.serviceId">
          <select :id="f.id" v-model="form.serviceId" class="ui-input" :aria-invalid="f.invalid" :aria-describedby="f.describedBy">
            <option value="" disabled>Elige un servicio</option>
            <option v-for="s in activeServices" :key="s.id" :value="s.id">{{ s.name }} ({{ s.durationMinutes }} min)</option>
          </select>
        </UiField>
        <UiField v-slot="f" label="Nombre del cliente" required :error="newErrors.customerName">
          <input
            :id="f.id"
            v-model.trim="form.customerName"
            autocomplete="off"
            placeholder="Ej. Ana López"
            class="ui-input"
            :aria-invalid="f.invalid"
            :aria-describedby="f.describedBy"
          />
        </UiField>
        <UiField
          v-slot="f"
          label="WhatsApp del cliente"
          required
          help="10 dígitos. Ahí le llegará su recordatorio."
          :error="newErrors.customerPhone"
        >
          <input
            :id="f.id"
            v-model.trim="form.customerPhone"
            type="tel"
            inputmode="tel"
            autocomplete="off"
            placeholder="618 123 4567"
            class="ui-input"
            :aria-invalid="f.invalid"
            :aria-describedby="f.describedBy"
          />
        </UiField>
        <div class="grid grid-cols-2 gap-3">
          <UiField v-slot="f" label="Día" required :error="newErrors.date">
            <input :id="f.id" v-model="form.date" type="date" class="ui-input" :aria-invalid="f.invalid" :aria-describedby="f.describedBy" />
          </UiField>
          <UiField v-slot="f" label="Hora" required :error="newErrors.time">
            <input
              :id="f.id"
              v-model="form.time"
              type="time"
              step="900"
              class="ui-input"
              :aria-invalid="f.invalid"
              :aria-describedby="f.describedBy"
            />
          </UiField>
        </div>
        <UiField v-slot="f" label="Notas" optional>
          <textarea :id="f.id" v-model="form.notes" rows="2" placeholder="Ej. Trae foto del diseño" class="ui-input" />
        </UiField>
        <p v-if="formError" class="ui-error" role="alert">{{ formError }}</p>
      </form>
      <template #footer>
        <UiButton variant="secondary" @click="showNew = false">Cancelar</UiButton>
        <UiButton type="submit" form="new-appointment" :loading="saving" loading-text="Guardando…">Guardar cita</UiButton>
      </template>
    </UiModal>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import Badge from '@/components/ui/Badge.vue'
import BookingLinkCard from '@/components/agenda/BookingLinkCard.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/services/api'
import {
  bookingUrl,
  createAppointment,
  listAppointments,
  listServices,
  setAppointmentStatus,
  STATUS_LABELS,
  CUSTOMER_REPLY_LABELS,
  type AppointmentItem,
  type AppointmentStatus,
  type ServiceItem,
} from '@/services/citas'

const auth = useAuthStore()
const toast = useToast()

const statusColor: Record<AppointmentStatus, 'warning' | 'success' | 'error' | 'primary' | 'light'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'error',
  COMPLETED: 'primary',
  NO_SHOW: 'light',
}

const periodOptions = [
  { week: false, label: 'Día' },
  { week: true, label: '7 días' },
]

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const day = ref(isoLocal(new Date()))
const weekView = ref(false)
const appointments = ref<AppointmentItem[]>([])
const services = ref<ServiceItem[]>([])
const loading = ref(false)
const error = ref('')

const slug = computed(() => auth.user?.tenant?.slug ?? '')
const bookingLink = computed(() => (slug.value ? bookingUrl(slug.value) : ''))
const activeServices = computed(() => services.value.filter((s) => s.isActive))

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `52${digits}` : digits
}

const periodTitle = computed(() => {
  const from = new Date(`${day.value}T00:00:00`)
  const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString('es-MX', opts)
  if (!weekView.value) {
    const isToday = day.value === isoLocal(new Date())
    return (isToday ? 'Hoy, ' : '') + fmt(from, { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const to = new Date(from.getTime() + 6 * 86_400_000)
  return `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short' })}`
})

const summaryText = computed(() => {
  if (appointments.value.length === 0) return 'Sin citas agendadas.'
  const active = appointments.value.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
  const pending = active.filter((a) => a.status === 'PENDING').length
  const parts = [`${active.length} ${active.length === 1 ? 'cita activa' : 'citas activas'}`]
  if (pending) parts.push(`${pending} por confirmar`)
  return parts.join(', ')
})

const grouped = computed(() => {
  const map = new Map<string, { key: string; label: string; items: AppointmentItem[] }>()
  for (const a of appointments.value) {
    const key = isoLocal(new Date(a.startTime))
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: new Date(a.startTime).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }),
        items: [],
      })
    }
    map.get(key)!.items.push(a)
  }
  return [...map.values()]
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const from = new Date(`${day.value}T00:00:00`)
    const to = new Date(from.getTime() + (weekView.value ? 7 : 1) * 86_400_000)
    appointments.value = (await listAppointments(from, to)).sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    )
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar la agenda')
  } finally {
    loading.value = false
  }
}

function shift(delta: number) {
  const d = new Date(`${day.value}T00:00:00`)
  d.setDate(d.getDate() + delta * (weekView.value ? 7 : 1))
  day.value = isoLocal(d)
  void load()
}
function goToday() {
  day.value = isoLocal(new Date())
  void load()
}
function setWeekView(v: boolean) {
  if (weekView.value === v) return
  weekView.value = v
  void load()
}

const STATUS_DONE: Partial<Record<AppointmentStatus, string>> = {
  CONFIRMED: 'Cita confirmada',
  COMPLETED: 'Cita completada',
  NO_SHOW: 'Marcada como "No asistió"',
  CANCELLED: 'Cita cancelada',
}

async function setStatus(a: AppointmentItem, status: AppointmentStatus) {
  if (status === 'CANCELLED') {
    const ok = await confirm({
      title: `¿Cancelar la cita de ${a.customerName}?`,
      description: `${a.service?.name ?? 'Cita'} a las ${hhmm(a.startTime)}. El horario quedará libre para otra persona.`,
      confirmText: 'Cancelar cita',
      cancelText: 'Volver',
      danger: true,
    })
    if (!ok) return
  }
  try {
    await setAppointmentStatus(a.id, status)
    toast.success(STATUS_DONE[status] ?? 'Cita actualizada', `${a.customerName} · ${hhmm(a.startTime)}`)
    await load()
  } catch (e) {
    toast.error('No se pudo actualizar la cita', extractApiError(e, 'Intenta de nuevo.'))
  }
}

const route = useRoute()
const showNew = ref(false)
const saving = ref(false)
const formError = ref('')
const newErrors = reactive<Record<string, string | undefined>>({})
const form = reactive({ serviceId: '', customerName: '', customerPhone: '', date: '', time: '', notes: '' })

function openNew() {
  Object.assign(form, { serviceId: '', customerName: '', customerPhone: '', date: day.value, time: '', notes: '' })
  formError.value = ''
  for (const k of Object.keys(newErrors)) newErrors[k] = undefined
  showNew.value = true
}

async function saveNew() {
  const service = services.value.find((s) => s.id === form.serviceId)
  newErrors.serviceId = service ? undefined : 'Elige el servicio.'
  newErrors.customerName = form.customerName ? undefined : 'Escribe el nombre del cliente.'
  newErrors.customerPhone = form.customerPhone ? undefined : 'Escribe el WhatsApp del cliente.'
  newErrors.date = form.date ? undefined : 'Elige el día.'
  newErrors.time = form.time ? undefined : 'Elige la hora.'
  if (!service || Object.values(newErrors).some(Boolean)) return
  const start = new Date(`${form.date}T${form.time}:00`)
  const end = new Date(start.getTime() + service.durationMinutes * 60_000)
  saving.value = true
  formError.value = ''
  try {
    await createAppointment({
      serviceId: service.id,
      customerName: form.customerName,
      customerPhone: form.customerPhone,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: form.notes || undefined,
      status: 'CONFIRMED',
    })
    showNew.value = false
    toast.success('Cita guardada', `${form.customerName} · ${service.name}`)
    await load()
  } catch (e) {
    formError.value = extractApiError(e, 'No se pudo crear la cita')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    services.value = await listServices(true)
  } catch (e) {
    error.value = extractApiError(e, 'No se pudieron cargar los servicios')
  }
  await load()
  // Acceso directo desde Inicio: /appointments?nueva=1 abre el registro de cita.
  if (route.query.nueva === '1' && activeServices.value.length) openNew()
})
</script>
