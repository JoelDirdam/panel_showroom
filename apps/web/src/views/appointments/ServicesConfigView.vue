<template>
  <admin-layout>
    <page-breadcrumb page-title="Servicios y horarios" />

    <component-card title="Servicios" class-name="mb-6">
      <form class="mb-4 grid gap-2 sm:grid-cols-[1fr_120px_120px_auto]" @submit.prevent="addService">
        <input v-model="newService.name" required placeholder="Ej. Corte de cabello" class="field" />
        <input v-model.number="newService.durationMinutes" required type="number" min="5" max="480" step="5" placeholder="Minutos" class="field" />
        <input v-model.number="newService.price" required type="number" min="0" step="1" placeholder="Precio $" class="field" />
        <button class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Agregar</button>
      </form>
      <p v-if="serviceError" class="mb-2 text-sm text-error-500">{{ serviceError }}</p>
      <p v-if="services.length === 0" class="text-sm text-gray-500">Aún no tienes servicios. Agrega el primero arriba.</p>
      <ul class="divide-y divide-gray-100 dark:divide-gray-800">
        <li v-for="s in services" :key="s.id" class="flex flex-wrap items-center gap-3 py-3 text-sm">
          <span :class="['flex-1 text-gray-800 dark:text-white', !s.isActive && 'line-through opacity-60']">{{ s.name }}</span>
          <span class="text-gray-500">{{ s.durationMinutes }} min</span>
          <span class="text-gray-500">${{ Number(s.price).toLocaleString('es-MX') }}</span>
          <button class="act" @click="toggle(s)">{{ s.isActive ? 'Desactivar' : 'Activar' }}</button>
          <button class="act text-error-600" @click="remove(s)">Eliminar</button>
        </li>
      </ul>
    </component-card>

    <component-card title="Horario de atención">
      <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">Tus clientes solo verán horas dentro de este horario.</p>
      <ul class="space-y-2">
        <li v-for="d in orderedHours" :key="d.dayOfWeek" class="flex flex-wrap items-center gap-3 text-sm">
          <span class="w-24 text-gray-800 dark:text-white">{{ WEEKDAY_LABELS[d.dayOfWeek] }}</span>
          <label class="flex items-center gap-1 text-gray-600 dark:text-gray-300">
            <input v-model="d.isClosed" type="checkbox" class="accent-brand-500" /> Cerrado
          </label>
          <template v-if="!d.isClosed">
            <input v-model="d.openTime" type="time" class="field w-32" />
            <span class="text-gray-500">a</span>
            <input v-model="d.closeTime" type="time" class="field w-32" />
          </template>
        </li>
      </ul>
      <p v-if="hoursError" class="mt-3 text-sm text-error-500">{{ hoursError }}</p>
      <p v-if="hoursSaved" class="mt-3 text-sm text-success-600">Horario guardado.</p>
      <button class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" @click="saveHours">
        Guardar horario
      </button>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { extractApiError } from '@/services/api'
import {
  createService,
  deleteService,
  getBusinessHours,
  listServices,
  saveBusinessHours,
  updateService,
  WEEKDAY_LABELS,
  type BusinessHourItem,
  type ServiceItem,
} from '@/services/citas'

const services = ref<ServiceItem[]>([])
const hours = ref<BusinessHourItem[]>([])
const serviceError = ref('')
const hoursError = ref('')
const hoursSaved = ref(false)
const newService = reactive({ name: '', durationMinutes: 30, price: 0 })

// Lunes primero (0 = domingo en la API).
const orderedHours = computed(() =>
  [...hours.value].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7)),
)

async function loadAll() {
  try {
    ;[services.value, hours.value] = await Promise.all([listServices(true), getBusinessHours()])
  } catch (e) {
    serviceError.value = extractApiError(e, 'No se pudo cargar la configuración')
  }
}

async function addService() {
  serviceError.value = ''
  try {
    await createService({ ...newService })
    Object.assign(newService, { name: '', durationMinutes: 30, price: 0 })
    services.value = await listServices(true)
  } catch (e) {
    serviceError.value = extractApiError(e, 'No se pudo crear el servicio')
  }
}

async function toggle(s: ServiceItem) {
  try {
    await updateService(s.id, { isActive: !s.isActive })
    services.value = await listServices(true)
  } catch (e) {
    serviceError.value = extractApiError(e, 'No se pudo actualizar el servicio')
  }
}

async function remove(s: ServiceItem) {
  if (!window.confirm(`¿Eliminar "${s.name}"?`)) return
  try {
    await deleteService(s.id)
    services.value = await listServices(true)
  } catch (e) {
    serviceError.value = extractApiError(e, 'No se pudo eliminar. Si tiene citas, desactívalo en su lugar.')
  }
}

async function saveHours() {
  hoursError.value = ''
  hoursSaved.value = false
  try {
    hours.value = await saveBusinessHours(hours.value)
    hoursSaved.value = true
  } catch (e) {
    hoursError.value = extractApiError(e, 'Revisa que la hora de cierre sea posterior a la de apertura')
  }
}

onMounted(loadAll)
</script>

<style scoped>
@reference "../../assets/main.css";

.act {
  @apply rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-white dark:hover:bg-white/5;
}
.field {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white;
}
</style>
