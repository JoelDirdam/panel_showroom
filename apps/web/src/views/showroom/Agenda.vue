<template>
  <admin-layout>
    <page-breadcrumb page-title="Agenda" />

    <template v-if="auth.isAdmin">
      <component-card data-tour="agenda-stock-rule" :hide-body="!settings.stockDeliveryEnabled">
        <template #title>
          <label class="header-toggle">
            <input
              v-model="settings.stockDeliveryEnabled"
              type="checkbox"
              class="header-checkbox"
              @change="saveSettings"
            />
            <span class="text-base font-medium text-gray-800 dark:text-white/90">
              Disponibilidad: Llevar stock
            </span>
          </label>
        </template>
        <weekly-rule-form
          v-model="stockForm"
          :saving="savingType === 'STOCK_DELIVERY'"
          @save="saveRule('STOCK_DELIVERY')"
          @clear="clearRule('STOCK_DELIVERY')"
        />
      </component-card>

      <component-card class-name="mt-6" data-tour="agenda-cut-rule" :hide-body="!settings.cutPickupEnabled">
        <template #title>
          <label class="header-toggle">
            <input
              v-model="settings.cutPickupEnabled"
              type="checkbox"
              class="header-checkbox"
              @change="saveSettings"
            />
            <span class="text-base font-medium text-gray-800 dark:text-white/90">
              Disponibilidad: Recoger corte
            </span>
          </label>
        </template>
        <weekly-rule-form
          v-model="cutForm"
          :saving="savingType === 'CUT_PICKUP'"
          @save="saveRule('CUT_PICKUP')"
          @clear="clearRule('CUT_PICKUP')"
        />
      </component-card>
    </template>

    <p
      v-if="!auth.isAdmin && !settings.stockDeliveryEnabled && !settings.cutPickupEnabled"
      class="mt-6 text-sm text-gray-500"
    >
      El showroom no requiere agendar estas acciones actualmente.
    </p>

    <component-card
      v-else
      title="Calendario"
      data-tour="agenda-calendar"
      :class-name="auth.isAdmin ? 'mt-6' : ''"
    >
      <p v-if="auth.isAdmin" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Vista de disponibilidad y reservas. Para cambiar horarios usa la configuración semanal arriba.
      </p>
      <div class="mb-4 flex items-center justify-between">
        <button class="nav-button" aria-label="Mes anterior" @click="prevMonth">‹</button>
        <p class="text-base font-semibold capitalize text-gray-800 dark:text-white">
          {{ monthTitle }}
        </p>
        <button class="nav-button" aria-label="Mes siguiente" @click="nextMonth">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        <span v-for="dayName in dayNames" :key="dayName" class="py-2">{{ dayName }}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <button
          v-for="cell in calendarCells"
          :key="cell.key"
          type="button"
          class="flex min-h-20 flex-col items-start gap-1 rounded-lg border p-2 text-left transition"
          :class="cellClasses(cell)"
          :disabled="!cellClickable(cell)"
          @click="openDay(cell)"
        >
          <span
            class="text-sm"
            :class="cell.isToday ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white' : ''"
          >
            {{ cell.date.getDate() }}
          </span>
          <template v-if="cell.inMonth">
            <span
              v-if="cell.available > 0"
              class="rounded-md bg-success-50 px-1.5 py-0.5 text-[11px] font-medium text-success-600 dark:bg-success-500/15 dark:text-success-400"
            >
              {{ cell.available }} disp.
            </span>
            <span
              v-if="auth.isAdmin && cell.booked > 0"
              class="rounded-md bg-warning-50 px-1.5 py-0.5 text-[11px] font-medium text-warning-600 dark:bg-warning-500/15 dark:text-warning-400"
            >
              {{ cell.booked }} reserv.
            </span>
          </template>
        </button>
      </div>
    </component-card>

    <component-card v-if="!auth.isAdmin" title="Mis citas" data-tour="agenda-appointments" class-name="mt-6">
      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
              <th class="py-3 pr-4">Acción</th>
              <th class="py-3 pr-4">Fecha y hora</th>
              <th class="py-3 pr-4">Notas</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appointment in appointments" :key="appointment.id" class="border-b border-gray-100 dark:border-gray-800">
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ typeLabel(appointment.slot.type) }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ slotRange(appointment.slot) }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ appointment.notes || '—' }}</td>
              <td class="py-3">
                <button class="text-error-500 hover:underline" @click="cancelAppointment(appointment)">
                  Cancelar
                </button>
              </td>
            </tr>
            <tr v-if="appointments.length === 0">
              <td colspan="4" class="py-8 text-center text-gray-500">No tienes citas agendadas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <p v-if="error" class="mt-4 text-sm text-error-500">{{ error }}</p>
    <p v-if="success" class="mt-4 text-sm text-success-500">{{ success }}</p>

    <Modal v-if="selectedDay" full-screen-backdrop @close="closeDay">
      <template #body>
        <div
          class="no-scrollbar relative max-h-[85vh] w-full max-w-[520px] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-900 lg:p-8"
        >
          <button
            class="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Cerrar"
            @click="closeDay"
          >
            ✕
          </button>
          <h5 class="mb-1 text-lg font-semibold capitalize text-gray-800 dark:text-white/90">
            {{ selectedDayTitle }}
          </h5>

          <template v-if="auth.isAdmin">
            <p class="text-sm text-gray-500 dark:text-gray-400">Horarios de este día</p>
            <div v-if="selectedDaySlots.length > 0" class="mt-4 space-y-2">
              <div
                v-for="slot in selectedDaySlots"
                :key="slot.id"
                class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
              >
                <div>
                  <p class="text-sm font-medium text-gray-800 dark:text-white">{{ timeRange(slot) }}</p>
                  <p class="text-xs" :class="slot.appointment ? 'text-warning-500' : 'text-success-500'">
                    {{ typeLabel(slot.type) }} ·
                    {{ slot.appointment ? `Reservado por ${slot.appointment.brand.name}` : 'Disponible' }}
                  </p>
                </div>
                <button
                  v-if="!slot.appointment"
                  class="text-sm text-error-500 hover:underline"
                  @click="deleteSlot(slot)"
                >
                  Eliminar
                </button>
                <a
                  v-else-if="slot.appointment.brand.whatsapp"
                  :href="whatsappUrl(slot.appointment)"
                  target="_blank"
                  rel="noopener"
                  class="text-sm text-success-500 hover:underline"
                >
                  WhatsApp
                </a>
              </div>
            </div>
            <p v-else class="mt-4 text-sm text-gray-500">No hay horarios este día.</p>
          </template>

          <template v-else>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Elige una hora disponible para reservar.
            </p>
            <div v-for="group in selectedDayGroups" :key="group.type" class="mt-5">
              <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ typeLabel(group.type) }}
              </p>
              <div class="space-y-2">
                <button
                  v-for="slot in group.slots"
                  :key="slot.id"
                  type="button"
                  class="w-full rounded-lg border border-brand-300 bg-brand-50 px-4 py-3 text-left text-sm font-medium text-brand-600 transition hover:bg-brand-500 hover:text-white dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500 dark:hover:text-white"
                  :disabled="saving"
                  @click="book(slot)"
                >
                  {{ timeRange(slot) }}
                </button>
              </div>
            </div>
            <p v-if="selectedDayGroups.length === 0" class="mt-5 text-sm text-gray-500">
              No hay horarios disponibles este día.
            </p>
          </template>
        </div>
      </template>
    </Modal>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Modal from '@/components/ui/Modal.vue'
import WeeklyRuleForm, { type WeeklyRuleFormModel } from '@/components/agenda/WeeklyRuleForm.vue'
import api, {
  type AgendaSettings,
  type Appointment,
  type ScheduleSlot,
  type ScheduleType,
  type WeeklyScheduleRule,
  type Weekday,
} from '@/services/api'
import { useAuthStore } from '@/stores/auth'

interface CalendarCell {
  key: string
  date: Date
  inMonth: boolean
  isToday: boolean
  isPast: boolean
  available: number
  booked: number
}

const auth = useAuthStore()
const settings = reactive<AgendaSettings>({
  stockDeliveryEnabled: true,
  cutPickupEnabled: true,
  timezone: 'America/Mexico_City',
})
const slots = ref<ScheduleSlot[]>([])
const appointments = ref<Appointment[]>([])
const rules = ref<WeeklyScheduleRule[]>([])
const saving = ref(false)
const savingType = ref<ScheduleType | null>(null)
const error = ref<string | null>(null)
const success = ref<string | null>(null)

const today = new Date()
const viewYear = ref(today.getFullYear())
const viewMonth = ref(today.getMonth())
const selectedDay = ref<string | null>(null)

const stockForm = reactive<WeeklyRuleFormModel>(emptyForm())
const cutForm = reactive<WeeklyRuleFormModel>(emptyForm())

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function emptyForm(): WeeklyRuleFormModel {
  return {
    weekdays: [],
    startTime: '12:00',
    endTime: '19:00',
    customizePerDay: false,
    dayHours: {},
    intervalMinutes: 60,
  }
}

function formForType(type: ScheduleType) {
  return type === 'STOCK_DELIVERY' ? stockForm : cutForm
}

function applyRulesToForms(list: WeeklyScheduleRule[]) {
  for (const type of ['STOCK_DELIVERY', 'CUT_PICKUP'] as ScheduleType[]) {
    const typed = list.filter((r) => r.type === type)
    const form = formForType(type)
    Object.assign(form, emptyForm())
    if (typed.length === 0) continue
    form.weekdays = typed.map((r) => r.weekday as Weekday)
    form.intervalMinutes = typed[0].intervalMinutes as 15 | 30 | 60
    const uniqueRanges = new Set(typed.map((r) => `${r.startTime}|${r.endTime}`))
    form.customizePerDay = uniqueRanges.size > 1
    form.startTime = typed[0].startTime
    form.endTime = typed[0].endTime
    form.dayHours = {}
    for (const r of typed) {
      form.dayHours[r.weekday as Weekday] = { startTime: r.startTime, endTime: r.endTime }
    }
  }
}

const monthTitle = computed(() =>
  new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(
    new Date(viewYear.value, viewMonth.value, 1),
  ),
)

function dayKey(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function monthRangeIso() {
  const from = new Date(viewYear.value, viewMonth.value, 1)
  const to = new Date(viewYear.value, viewMonth.value + 1, 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

const slotsByDay = computed(() => {
  const map = new Map<string, ScheduleSlot[]>()
  for (const slot of slots.value) {
    const key = dayKey(new Date(slot.startAt))
    const list = map.get(key) ?? []
    list.push(slot)
    map.set(key, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  }
  return map
})

function isSlotAvailable(slot: ScheduleSlot) {
  const free = auth.isAdmin ? !slot.appointment : !slot.booked
  return free && new Date(slot.startAt) > new Date()
}

const calendarCells = computed<CalendarCell[]>(() => {
  const firstOfMonth = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (firstOfMonth.getDay() + 6) % 7
  const start = new Date(viewYear.value, viewMonth.value, 1 - offset)
  const todayKey = dayKey(new Date())

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const key = dayKey(date)
    const daySlots = slotsByDay.value.get(key) ?? []
    cells.push({
      key,
      date,
      inMonth: date.getMonth() === viewMonth.value,
      isToday: key === todayKey,
      isPast: key < todayKey,
      available: daySlots.filter(isSlotAvailable).length,
      booked: daySlots.filter((slot) => Boolean(slot.appointment) || Boolean(slot.booked)).length,
    })
  }
  return cells
})

const selectedDaySlots = computed(() =>
  selectedDay.value ? (slotsByDay.value.get(selectedDay.value) ?? []) : [],
)

const selectedDayGroups = computed(() => {
  const available = selectedDaySlots.value.filter(isSlotAvailable)
  const types: ScheduleType[] = ['STOCK_DELIVERY', 'CUT_PICKUP']
  return types
    .map((type) => ({ type, slots: available.filter((slot) => slot.type === type) }))
    .filter((group) => group.slots.length > 0)
})

const selectedDayTitle = computed(() => {
  if (!selectedDay.value) return ''
  const [year, month, day] = selectedDay.value.split('-').map(Number)
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(
    new Date(year, month - 1, day),
  )
})

function cellClickable(cell: CalendarCell) {
  if (!cell.inMonth || cell.isPast) return false
  if (auth.isAdmin) return cell.available > 0 || cell.booked > 0
  return cell.available > 0
}

function cellClasses(cell: CalendarCell) {
  if (!cell.inMonth) return 'border-transparent text-gray-300 dark:text-gray-700'
  if (cell.isPast)
    return 'border-gray-100 text-gray-400 dark:border-gray-800/50 dark:text-gray-600'
  const base = 'border-gray-200 text-gray-700 dark:border-gray-800 dark:text-gray-300'
  if (cellClickable(cell))
    return `${base} cursor-pointer hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10`
  return base
}

function openDay(cell: CalendarCell) {
  error.value = null
  success.value = null
  selectedDay.value = cell.key
}

function closeDay() {
  selectedDay.value = null
}

async function loadSlots() {
  const { from, to } = monthRangeIso()
  const slotsResponse = await api.get<ScheduleSlot[]>('/agenda/slots', { params: { from, to } })
  slots.value = slotsResponse.data
}

async function load() {
  const [settingsResponse, rulesResponse, appointmentsResponse] = await Promise.all([
    api.get<AgendaSettings>('/agenda/settings'),
    auth.isAdmin ? api.get<WeeklyScheduleRule[]>('/agenda/weekly-rules') : Promise.resolve({ data: [] as WeeklyScheduleRule[] }),
    api.get<Appointment[]>('/agenda/appointments'),
  ])
  Object.assign(settings, settingsResponse.data)
  rules.value = rulesResponse.data
  if (auth.isAdmin) applyRulesToForms(rules.value)
  appointments.value = appointmentsResponse.data
  await loadSlots()
}

watch([viewYear, viewMonth], () => {
  loadSlots().catch((e: unknown) => {
    error.value = apiError(e, 'No se pudieron cargar los horarios')
  })
})

async function saveSettings() {
  error.value = null
  try {
    await api.patch('/agenda/settings', {
      stockDeliveryEnabled: settings.stockDeliveryEnabled,
      cutPickupEnabled: settings.cutPickupEnabled,
    })
    success.value = 'Opciones de agenda actualizadas.'
    await loadSlots()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudieron guardar las opciones')
  }
}

function daysPayload(form: WeeklyRuleFormModel) {
  return form.weekdays.map((weekday) => {
    const hours = form.customizePerDay
      ? form.dayHours[weekday] ?? { startTime: form.startTime, endTime: form.endTime }
      : { startTime: form.startTime, endTime: form.endTime }
    return {
      weekday,
      startTime: hours.startTime,
      endTime: hours.endTime,
    }
  })
}

async function saveRule(type: ScheduleType) {
  const form = formForType(type)
  if (form.weekdays.length === 0) {
    error.value = 'Selecciona al menos un día'
    return
  }
  savingType.value = type
  error.value = null
  success.value = null
  try {
    await api.put('/agenda/weekly-rules', {
      type,
      intervalMinutes: form.intervalMinutes,
      days: daysPayload(form),
    })
    success.value = 'Horario semanal guardado. Se aplicará todas las semanas.'
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo guardar el horario semanal')
  } finally {
    savingType.value = null
  }
}

async function clearRule(type: ScheduleType) {
  if (!confirm('¿Quitar la configuración semanal de esta acción? Se eliminarán horarios libres futuros.')) {
    return
  }
  savingType.value = type
  error.value = null
  success.value = null
  try {
    await api.delete(`/agenda/weekly-rules/${type}`)
    Object.assign(formForType(type), emptyForm())
    success.value = 'Configuración semanal eliminada.'
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo eliminar la configuración')
  } finally {
    savingType.value = null
  }
}

async function deleteSlot(slot: ScheduleSlot) {
  if (!confirm('¿Eliminar este horario?')) return
  error.value = null
  try {
    await api.delete(`/agenda/slots/${slot.id}`)
    await loadSlots()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo eliminar el horario')
  }
}

async function book(slot: ScheduleSlot) {
  const notes = prompt('Notas para el showroom (opcional):') || null
  saving.value = true
  error.value = null
  success.value = null
  try {
    await api.post('/agenda/appointments', { slotId: slot.id, notes })
    success.value = 'Cita reservada.'
    closeDay()
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo reservar el horario')
  } finally {
    saving.value = false
  }
}

async function cancelAppointment(appointment: Appointment) {
  if (!confirm('¿Cancelar esta cita?')) return
  error.value = null
  try {
    await api.delete(`/agenda/appointments/${appointment.id}`)
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo cancelar la cita')
  }
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function typeLabel(type: ScheduleType) {
  return type === 'STOCK_DELIVERY' ? 'Llevar stock' : 'Recoger corte'
}

const timeFormatter = new Intl.DateTimeFormat('es-MX', { timeStyle: 'short' })

function timeRange(slot: ScheduleSlot) {
  return `${timeFormatter.format(new Date(slot.startAt))} – ${timeFormatter.format(new Date(slot.endAt))}`
}

function slotRange(slot: ScheduleSlot) {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `${formatter.format(new Date(slot.startAt))} – ${formatter.format(new Date(slot.endAt))}`
}

function whatsappUrl(appointment: Appointment) {
  const phone = appointment.brand.whatsapp?.replace(/\D/g, '') || ''
  return `https://wa.me/${phone}?text=${encodeURIComponent('Hola, te contactamos sobre tu cita en el showroom.')}`
}

function apiError(value: unknown, fallback: string) {
  return (value as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

onMounted(load)
</script>

<style scoped>
.header-toggle {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  cursor: pointer;
}

.header-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  border: 2px solid #98a2b3;
  border-radius: 0.375rem;
  accent-color: #465fff;
  cursor: pointer;
}

:global(.dark) .header-checkbox {
  border-color: #475467;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  border: 1px solid #d0d5dd;
  color: #667085;
  font-size: 1.125rem;
}

.nav-button:hover {
  background: #f2f4f7;
}

:global(.dark) .nav-button {
  border-color: #344054;
  color: #98a2b3;
}

:global(.dark) .nav-button:hover {
  background: #1d2939;
}
</style>
