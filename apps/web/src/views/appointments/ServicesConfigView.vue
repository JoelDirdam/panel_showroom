<template>
  <admin-layout>
    <PageHeader
      title="Servicios y horarios"
      description="Lo que ofreces y cuándo atiendes. Tus clientes solo podrán agendar servicios activos dentro de tu horario."
    />

    <p v-if="loadError" class="mb-6 rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700" role="alert">
      {{ loadError }}
      <button type="button" class="ml-2 font-semibold underline" @click="loadAll">Reintentar</button>
    </p>

    <div class="space-y-6">
      <!-- Servicios -->
      <UiCard title="Servicios" description="Nombre, duración y precio de cada servicio que se puede agendar.">
        <form class="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03] sm:p-5" novalidate @submit.prevent="addService">
          <p class="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Agregar servicio</p>
          <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <UiField
              v-slot="f"
              class="sm:col-span-2 lg:col-span-1"
              label="Nombre del servicio"
              required
              :error="formErrors.name"
            >
              <input
                :id="f.id"
                v-model.trim="newService.name"
                type="text"
                maxlength="120"
                autocomplete="off"
                placeholder="Ej. Corte de cabello"
                class="ui-input"
                :aria-describedby="f.describedBy"
                :aria-invalid="f.invalid"
              />
            </UiField>
            <UiField
              v-slot="f"
              label="Duración (min)"
              required
              help="De 5 a 480 minutos."
              :error="formErrors.durationMinutes"
            >
              <input
                :id="f.id"
                v-model.number="newService.durationMinutes"
                type="number"
                inputmode="numeric"
                min="5"
                max="480"
                step="5"
                placeholder="45"
                class="ui-input"
                :aria-describedby="f.describedBy"
                :aria-invalid="f.invalid"
              />
            </UiField>
            <UiField
              v-slot="f"
              label="Precio ($ MXN)"
              required
              help="Lo que verán tus clientes. Usa 0 si es gratis."
              :error="formErrors.price"
            >
              <div class="relative">
                <span class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-gray-500" aria-hidden="true">$</span>
                <input
                  :id="f.id"
                  v-model.number="newService.price"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="1"
                  placeholder="250"
                  class="ui-input pl-7"
                  :aria-describedby="f.describedBy"
                  :aria-invalid="f.invalid"
                />
              </div>
            </UiField>
          </div>
          <div class="mt-4 flex justify-end">
            <UiButton type="submit" :loading="adding" loading-text="Agregando…" class="w-full sm:w-auto">
              <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
              Agregar servicio
            </UiButton>
          </div>
        </form>

        <div class="mt-6">
          <div v-if="loading" class="space-y-2" aria-busy="true" aria-label="Cargando servicios">
            <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
          </div>

          <UiEmptyState
            v-else-if="services.length === 0"
            title="Aún no tienes servicios"
            description="Agrega tu primer servicio arriba. Es lo que tus clientes elegirán al agendar."
          >
            <template #icon><Scissors class="h-5 w-5" /></template>
          </UiEmptyState>

          <template v-else>
            <!-- Escritorio: tabla -->
            <div class="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 md:block">
              <table class="ui-table">
                <caption class="sr-only">Servicios del negocio</caption>
                <thead>
                  <tr>
                    <th scope="col">Servicio</th>
                    <th scope="col" class="text-right">Duración</th>
                    <th scope="col" class="text-right">Precio</th>
                    <th scope="col">Estado</th>
                    <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in services" :key="s.id">
                    <td class="font-medium" :class="!s.isActive && 'text-gray-500'">{{ s.name }}</td>
                    <td class="whitespace-nowrap text-right">{{ s.durationMinutes }} min</td>
                    <td class="whitespace-nowrap text-right">{{ formatPrice(s.price) }}</td>
                    <td>
                      <Badge size="sm" :color="s.isActive ? 'success' : 'light'">
                        {{ s.isActive ? 'Activo' : 'Inactivo' }}
                      </Badge>
                    </td>
                    <td>
                      <div class="flex justify-end gap-2">
                        <UiButton
                          size="sm"
                          variant="secondary"
                          :loading="busyId === s.id"
                          :aria-label="`${s.isActive ? 'Desactivar' : 'Activar'} ${s.name}`"
                          @click="toggle(s)"
                        >
                          {{ s.isActive ? 'Desactivar' : 'Activar' }}
                        </UiButton>
                        <UiButton size="sm" variant="danger" :aria-label="`Eliminar ${s.name}`" @click="remove(s)">
                          Eliminar
                        </UiButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Móvil: tarjetas -->
            <ul class="space-y-3 md:hidden" aria-label="Servicios del negocio">
              <li
                v-for="s in services"
                :key="s.id"
                class="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
              >
                <div class="flex items-start justify-between gap-3">
                  <p class="font-semibold text-gray-900 dark:text-white" :class="!s.isActive && 'text-gray-500'">
                    {{ s.name }}
                  </p>
                  <Badge size="sm" :color="s.isActive ? 'success' : 'light'">
                    {{ s.isActive ? 'Activo' : 'Inactivo' }}
                  </Badge>
                </div>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {{ s.durationMinutes }} min · {{ formatPrice(s.price) }}
                </p>
                <div class="mt-3 grid grid-cols-2 gap-2">
                  <UiButton
                    variant="secondary"
                    :loading="busyId === s.id"
                    :aria-label="`${s.isActive ? 'Desactivar' : 'Activar'} ${s.name}`"
                    @click="toggle(s)"
                  >
                    {{ s.isActive ? 'Desactivar' : 'Activar' }}
                  </UiButton>
                  <UiButton variant="danger" :aria-label="`Eliminar ${s.name}`" @click="remove(s)">Eliminar</UiButton>
                </div>
              </li>
            </ul>
          </template>
        </div>
      </UiCard>

      <!-- Horario -->
      <UiCard
        title="Horario de atención"
        description="Tus clientes solo verán horas dentro de este horario. Agrega un descanso si cierras a medio día (por ejemplo, para comer)."
      >
        <template #actions>
          <UiButton
            v-if="hours.length && !loading"
            size="sm"
            variant="ghost"
            :disabled="!mondayOpen"
            @click="copyMondayToOpenDays"
          >
            <template #icon><Copy class="h-4 w-4" aria-hidden="true" /></template>
            Copiar lunes a días abiertos
          </UiButton>
        </template>

        <div v-if="loading" class="space-y-2" aria-busy="true" aria-label="Cargando horario">
          <div v-for="n in 7" :key="n" class="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
        </div>

        <ul v-else class="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          <li
            v-for="d in orderedHours"
            :key="d.dayOfWeek"
            :class="[
              'rounded-xl border p-4 transition-colors',
              d.isClosed
                ? 'border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/[0.02]'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-transparent',
              dayErrors[d.dayOfWeek] && 'border-error-300',
            ]"
          >
            <fieldset>
              <legend class="sr-only">{{ WEEKDAY_LABELS[d.dayOfWeek] }}</legend>
              <div class="flex items-center justify-between gap-3">
                <p class="font-semibold text-gray-900 dark:text-white">{{ WEEKDAY_LABELS[d.dayOfWeek] }}</p>
                <UiToggle
                  :model-value="!d.isClosed"
                  on-label="Abierto"
                  off-label="Cerrado"
                  :aria-label="`${WEEKDAY_LABELS[d.dayOfWeek]}: abierto`"
                  @update:model-value="(open: boolean) => (d.isClosed = !open)"
                />
              </div>

              <p v-if="d.isClosed" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Cerrado: no se podrán agendar citas este día.
              </p>

              <div v-else class="mt-3 space-y-3">
                <div>
                  <p v-if="d.breakStart" class="mb-2 text-[13px] font-medium text-gray-500">Primer bloque</p>
                  <div class="grid grid-cols-2 gap-3">
                    <UiField v-slot="f" label="Apertura">
                      <input :id="f.id" v-model="d.openTime" type="time" step="900" class="ui-input" />
                    </UiField>
                    <UiField v-if="d.breakStart" v-slot="f" label="Cierre">
                      <input :id="f.id" v-model="d.breakStart" type="time" step="900" class="ui-input" />
                    </UiField>
                    <UiField v-else v-slot="f" label="Cierre">
                      <input :id="f.id" v-model="d.closeTime" type="time" step="900" class="ui-input" />
                    </UiField>
                  </div>
                </div>

                <div v-if="d.breakStart">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-[13px] font-medium text-gray-500">Segundo bloque</p>
                    <button
                      type="button"
                      class="min-h-11 rounded-lg px-2 text-[13px] font-semibold text-error-600 hover:bg-error-50 md:min-h-8"
                      @click="removeBreak(d)"
                    >
                      Quitar segundo bloque
                    </button>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <UiField v-slot="f" label="Apertura">
                      <input :id="f.id" v-model="d.breakEnd" type="time" step="900" class="ui-input" />
                    </UiField>
                    <UiField v-slot="f" label="Cierre">
                      <input :id="f.id" v-model="d.closeTime" type="time" step="900" class="ui-input" />
                    </UiField>
                  </div>
                </div>

                <button
                  v-else
                  type="button"
                  class="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-brand-600 hover:underline md:min-h-8 dark:text-brand-300"
                  @click="addBreak(d)"
                >
                  <Plus class="h-4 w-4" aria-hidden="true" />
                  Agregar segundo bloque (ej. después de comer)
                </button>

                <p v-if="dayErrors[d.dayOfWeek]" class="ui-error" role="alert">{{ dayErrors[d.dayOfWeek] }}</p>
              </div>
            </fieldset>
          </li>
        </ul>

        <template #footer>
          <p class="mr-auto text-sm" :class="isDirty ? 'text-warning-700' : 'text-gray-500'" aria-live="polite">
            {{ isDirty ? 'Tienes cambios sin guardar.' : 'Sin cambios pendientes.' }}
          </p>
          <UiButton :loading="savingHours" loading-text="Guardando…" :disabled="!isDirty" class="w-full sm:w-auto" @click="saveHours">
            Guardar horario
          </UiButton>
        </template>
      </UiCard>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Copy, Plus, Scissors } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiField from '@/components/ui/UiField.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiToggle from '@/components/ui/UiToggle.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import Badge from '@/components/ui/Badge.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
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

const toast = useToast()

const services = ref<ServiceItem[]>([])
const hours = ref<BusinessHourItem[]>([])
const savedSnapshot = ref('')
const loading = ref(true)
const loadError = ref('')
const adding = ref(false)
const busyId = ref<string | null>(null)
const savingHours = ref(false)

const newService = reactive<{ name: string; durationMinutes: number | null; price: number | null }>({
  name: '',
  durationMinutes: null,
  price: null,
})
const formErrors = reactive<{ name?: string; durationMinutes?: string; price?: string }>({})

// Lunes primero (0 = domingo en la API).
const orderedHours = computed(() =>
  [...hours.value].sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7)),
)

function normalize(list: BusinessHourItem[]) {
  return list.map((d) => ({ ...d, breakStart: d.breakStart || null, breakEnd: d.breakEnd || null }))
}

function snapshot(list: BusinessHourItem[]) {
  return JSON.stringify(
    [...list]
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map(({ dayOfWeek, openTime, closeTime, isClosed, breakStart, breakEnd }) => ({
        dayOfWeek,
        openTime,
        closeTime,
        isClosed,
        breakStart: breakStart || null,
        breakEnd: breakEnd || null,
      })),
  )
}

const isDirty = computed(() => !loading.value && snapshot(hours.value) !== savedSnapshot.value)

const dayErrors = computed<Record<number, string>>(() => {
  const errors: Record<number, string> = {}
  for (const d of hours.value) {
    if (d.isClosed) continue
    if (d.breakStart && d.breakEnd) {
      if (!(d.openTime < d.breakStart)) errors[d.dayOfWeek] = 'El primer bloque debe cerrar después de abrir.'
      else if (!(d.breakStart < d.breakEnd)) errors[d.dayOfWeek] = 'El segundo bloque debe empezar después de que cierre el primero.'
      else if (!(d.breakEnd < d.closeTime)) errors[d.dayOfWeek] = 'El segundo bloque debe cerrar después de abrir.'
    } else if (!(d.openTime < d.closeTime)) {
      errors[d.dayOfWeek] = 'La hora de cierre debe ser posterior a la de apertura.'
    }
  }
  return errors
})

const mondayOpen = computed(() => hours.value.find((d) => d.dayOfWeek === 1 && !d.isClosed))

function formatPrice(price: string | number) {
  return Number(price).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const [s, h] = await Promise.all([listServices(true), getBusinessHours()])
    services.value = s
    hours.value = normalize(h)
    savedSnapshot.value = snapshot(hours.value)
  } catch (e) {
    loadError.value = extractApiError(e, 'No se pudo cargar la configuración.')
  } finally {
    loading.value = false
  }
}

function validateService() {
  formErrors.name = newService.name ? undefined : 'Escribe el nombre del servicio.'
  const d = newService.durationMinutes
  formErrors.durationMinutes =
    d == null || Number.isNaN(d) || d < 5 || d > 480 || d % 5 !== 0
      ? 'Escribe una duración de 5 a 480 minutos, en múltiplos de 5.'
      : undefined
  const p = newService.price
  formErrors.price = p == null || Number.isNaN(p) || p < 0 ? 'Escribe un precio de 0 o más.' : undefined
  return !formErrors.name && !formErrors.durationMinutes && !formErrors.price
}

async function addService() {
  if (!validateService()) return
  adding.value = true
  try {
    const name = newService.name
    await createService({
      name,
      durationMinutes: newService.durationMinutes as number,
      price: newService.price as number,
    })
    Object.assign(newService, { name: '', durationMinutes: null, price: null })
    services.value = await listServices(true)
    toast.success('Servicio agregado', `"${name}" ya aparece en tu link de reservas.`)
  } catch (e) {
    toast.error('No se pudo agregar el servicio', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    adding.value = false
  }
}

async function toggle(s: ServiceItem) {
  busyId.value = s.id
  try {
    await updateService(s.id, { isActive: !s.isActive })
    services.value = await listServices(true)
    toast.success(
      s.isActive ? 'Servicio desactivado' : 'Servicio activado',
      s.isActive ? `"${s.name}" ya no se puede agendar.` : `"${s.name}" se puede agendar de nuevo.`,
    )
  } catch (e) {
    toast.error('No se pudo actualizar el servicio', extractApiError(e, 'Intenta de nuevo.'))
  } finally {
    busyId.value = null
  }
}

async function remove(s: ServiceItem) {
  const ok = await confirm({
    title: `¿Eliminar "${s.name}"?`,
    description: 'Ya no aparecerá en tu link de reservas. Si tiene citas, mejor desactívalo.',
    confirmText: 'Eliminar servicio',
    danger: true,
  })
  if (!ok) return
  try {
    await deleteService(s.id)
    services.value = await listServices(true)
    toast.success('Servicio eliminado', `"${s.name}" se eliminó.`)
  } catch (e) {
    toast.error('No se pudo eliminar', extractApiError(e, 'Si tiene citas, desactívalo en su lugar.'))
  }
}

function addBreak(d: BusinessHourItem) {
  // Propuesta inicial: comida de 14:00 a 16:00 si cabe; si no, parte el día a la mitad.
  if (d.openTime < '14:00' && '16:00' < d.closeTime) {
    d.breakStart = '14:00'
    d.breakEnd = '16:00'
    return
  }
  const [oh, om] = d.openTime.split(':').map(Number)
  const [ch, cm] = d.closeTime.split(':').map(Number)
  const mid = Math.round(((oh * 60 + om + ch * 60 + cm) / 2) / 15) * 15
  const fmt = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  d.breakStart = fmt(mid - 30)
  d.breakEnd = fmt(mid + 30)
}

function removeBreak(d: BusinessHourItem) {
  d.breakStart = null
  d.breakEnd = null
}

function copyMondayToOpenDays() {
  const monday = mondayOpen.value
  if (!monday) return
  for (const d of hours.value) {
    if (d.isClosed || d.dayOfWeek === 1) continue
    d.openTime = monday.openTime
    d.closeTime = monday.closeTime
    d.breakStart = monday.breakStart ?? null
    d.breakEnd = monday.breakEnd ?? null
  }
  toast.info('Horario del lunes copiado', 'Revisa y guarda para aplicar los cambios.')
}

function describeDay(d: BusinessHourItem) {
  if (d.isClosed) return 'cerrado'
  if (d.breakStart && d.breakEnd) return `${d.openTime}–${d.breakStart} y ${d.breakEnd}–${d.closeTime}`
  return `${d.openTime}–${d.closeTime}`
}

async function saveHours() {
  if (Object.keys(dayErrors.value).length > 0) {
    toast.error('Revisa el horario', 'Hay días con horas que no cuadran. Corrígelos y vuelve a guardar.')
    return
  }
  const before = JSON.parse(savedSnapshot.value || '[]') as BusinessHourItem[]
  savingHours.value = true
  try {
    const saved = normalize(await saveBusinessHours(hours.value))
    const changed = saved
      .filter((d) => {
        const prev = before.find((b) => b.dayOfWeek === d.dayOfWeek)
        return !prev || describeDay(prev) !== describeDay(d)
      })
      .sort((a, b) => ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7))
      .map((d) => `${WEEKDAY_LABELS[d.dayOfWeek]}: ${describeDay(d)}`)
    hours.value = saved
    savedSnapshot.value = snapshot(saved)
    toast.success('Horario guardado', changed.length ? changed.join(' · ') : undefined)
  } catch (e) {
    toast.error('No se pudo guardar el horario', extractApiError(e, 'Revisa que cada cierre sea posterior a su apertura.'))
  } finally {
    savingHours.value = false
  }
}

onMounted(loadAll)
</script>
