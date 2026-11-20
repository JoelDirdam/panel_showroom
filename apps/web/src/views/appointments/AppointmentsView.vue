<template>
  <admin-layout>
    <page-breadcrumb page-title="Citas" />

    <!-- Link público -->
    <component-card title="Tu link de citas" class-name="mb-6">
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
        Compártelo en Instagram, WhatsApp o Facebook. Tus clientes eligen servicio, día y hora sin escribirte.
      </p>
      <div v-if="bookingLink" class="flex flex-col gap-2 sm:flex-row">
        <input
          :value="bookingLink"
          readonly
          class="flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" @click="copyLink">
          {{ copied ? '¡Copiado!' : 'Copiar' }}
        </button>
        <a
          :href="whatsappShare"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm dark:border-gray-700 dark:text-white"
        >
          Compartir por WhatsApp
        </a>
        <a
          :href="bookingLink"
          target="_blank"
          rel="noopener"
          class="rounded-lg border border-gray-300 px-4 py-2 text-center text-sm dark:border-gray-700 dark:text-white"
        >
          Ver como cliente
        </a>
      </div>
      <ul class="mt-4 space-y-1 text-sm">
        <li :class="services.length ? 'text-success-600' : 'text-gray-500'">
          {{ services.length ? '✔' : '○' }} Agrega al menos un servicio
          <router-link to="/appointments/config" class="ml-1 underline">Configurar</router-link>
        </li>
        <li class="text-gray-500">
          ○ Revisa tus horarios de atención
          <router-link to="/appointments/config" class="ml-1 underline">Configurar</router-link>
        </li>
      </ul>
    </component-card>

    <!-- Agenda -->
    <component-card title="Agenda">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <button class="nav-btn" @click="shift(-1)">←</button>
        <input v-model="day" type="date" class="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" @change="load" />
        <button class="nav-btn" @click="shift(1)">→</button>
        <button class="nav-btn" @click="goToday">Hoy</button>
        <label class="ml-2 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="weekView" type="checkbox" class="accent-brand-500" @change="load" /> Ver 7 días
        </label>
        <button
          class="ml-auto rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openNew"
        >
          + Nueva cita
        </button>
      </div>

      <p v-if="error" class="mb-3 text-sm text-error-500">{{ error }}</p>
      <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
      <p v-else-if="appointments.length === 0" class="text-sm text-gray-500">No hay citas en este periodo.</p>

      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="a in appointments" :key="a.id" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
          <div class="sm:w-44">
            <div class="text-sm font-semibold text-gray-800 dark:text-white">{{ hhmm(a.startTime) }} – {{ hhmm(a.endTime) }}</div>
            <div v-if="weekView" class="text-xs text-gray-500">{{ dayLabel(a.startTime) }}</div>
          </div>
          <div class="flex-1">
            <div class="text-sm text-gray-800 dark:text-white">{{ a.customerName }}</div>
            <div class="text-xs text-gray-500">
              {{ a.service?.name ?? 'Sin servicio' }} ·
              <a :href="`https://wa.me/${waNumber(a.customerPhone)}`" target="_blank" rel="noopener" class="underline">{{ a.customerPhone }}</a>
              <span v-if="a.notes"> · {{ a.notes }}</span>
            </div>
            <div v-if="a.customerReply" class="mt-0.5 text-xs font-medium text-brand-600 dark:text-brand-400">
              {{ CUSTOMER_REPLY_LABELS[a.customerReply] }}
            </div>
          </div>
          <span :class="['w-fit rounded-full px-2.5 py-1 text-xs font-medium', badge[a.status]]">{{ STATUS_LABELS[a.status] }}</span>
          <div class="flex gap-1">
            <button v-if="a.status === 'PENDING'" class="act" @click="setStatus(a, 'CONFIRMED')">Confirmar</button>
            <button v-if="a.status === 'CONFIRMED'" class="act" @click="setStatus(a, 'COMPLETED')">Completar</button>
            <button
              v-if="(a.status === 'PENDING' || a.status === 'CONFIRMED') && new Date(a.startTime) < new Date()"
              class="act"
              title="El cliente no llegó"
              @click="setStatus(a, 'NO_SHOW')"
            >
              No asistió
            </button>
            <button v-if="a.status === 'PENDING' || a.status === 'CONFIRMED'" class="act text-error-600" @click="setStatus(a, 'CANCELLED')">Cancelar</button>
          </div>
        </li>
      </ul>
    </component-card>

    <!-- Modal nueva cita -->
    <div v-if="showNew" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4" @click.self="showNew = false">
      <form class="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 dark:bg-gray-900" @submit.prevent="saveNew">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">Nueva cita</h3>
        <select v-model="form.serviceId" required class="field">
          <option value="" disabled>Servicio</option>
          <option v-for="s in activeServices" :key="s.id" :value="s.id">{{ s.name }} ({{ s.durationMinutes }} min)</option>
        </select>
        <input v-model="form.customerName" required placeholder="Nombre del cliente" class="field" />
        <input v-model="form.customerPhone" required placeholder="WhatsApp del cliente" class="field" />
        <div class="grid grid-cols-2 gap-2">
          <input v-model="form.date" required type="date" class="field" />
          <input v-model="form.time" required type="time" step="900" class="field" />
        </div>
        <textarea v-model="form.notes" rows="2" placeholder="Notas (opcional)" class="field" />
        <p v-if="formError" class="text-sm text-error-500">{{ formError }}</p>
        <div class="flex justify-end gap-2">
          <button type="button" class="act" @click="showNew = false">Cerrar</button>
          <button :disabled="saving" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
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

const badge: Record<AppointmentStatus, string> = {
  PENDING: 'bg-warning-50 text-warning-600',
  CONFIRMED: 'bg-success-50 text-success-600',
  CANCELLED: 'bg-error-50 text-error-600',
  COMPLETED: 'bg-blue-light-50 text-blue-light-600',
  NO_SHOW: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
}

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
const copied = ref(false)

const slug = computed(() => auth.user?.tenant?.slug ?? '')
const bookingLink = computed(() => (slug.value ? bookingUrl(slug.value) : ''))
const whatsappShare = computed(
  () => `https://wa.me/?text=${encodeURIComponent(`Agenda tu cita aquí: ${bookingLink.value}`)}`,
)
const activeServices = computed(() => services.value.filter((s) => s.isActive))

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const dayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `52${digits}` : digits
}

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

async function copyLink() {
  try {
    await navigator.clipboard.writeText(bookingLink.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    /* el usuario puede copiar manualmente del input */
  }
}

async function setStatus(a: AppointmentItem, status: AppointmentStatus) {
  try {
    await setAppointmentStatus(a.id, status)
    await load()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo actualizar la cita')
  }
}

const showNew = ref(false)
const saving = ref(false)
const formError = ref('')
const form = reactive({ serviceId: '', customerName: '', customerPhone: '', date: '', time: '', notes: '' })

function openNew() {
  Object.assign(form, { serviceId: '', customerName: '', customerPhone: '', date: day.value, time: '', notes: '' })
  formError.value = ''
  showNew.value = true
}

async function saveNew() {
  const service = services.value.find((s) => s.id === form.serviceId)
  if (!service) return
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
})
</script>

<style scoped>
@reference "../../assets/main.css";

.nav-btn {
  @apply rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-white/5;
}
.act {
  @apply rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-white/5;
}
.field {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white;
}
</style>
