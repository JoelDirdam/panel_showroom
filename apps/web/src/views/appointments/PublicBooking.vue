<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <main class="mx-auto max-w-lg px-4 py-8">
      <p v-if="loading" class="text-center text-sm text-gray-500">Cargando…</p>
      <div v-else-if="loadError" class="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-gray-800">
        <h1 class="text-lg font-semibold text-gray-800 dark:text-white">No encontramos este negocio</h1>
        <p class="mt-2 text-sm text-gray-500">{{ loadError }}</p>
      </div>

      <template v-else-if="data">
        <header class="mb-6 text-center">
          <img
            v-if="logoSrc"
            :src="logoSrc"
            alt=""
            class="mx-auto mb-3 h-16 w-16 rounded-full object-cover"
          />
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">{{ data.business.name }}</h1>
          <p v-if="data.business.address" class="mt-1 text-sm text-gray-500">{{ data.business.address }}</p>
          <p class="mt-1 text-sm text-gray-500">Agenda tu cita en línea</p>
        </header>

        <div v-if="done" class="rounded-xl bg-white p-6 text-center shadow-sm dark:bg-gray-800">
          <div class="mb-2 text-4xl">✅</div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white">¡Cita solicitada!</h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ done.service.name }} · {{ formatDateTime(done.startTime) }}
          </p>
          <p class="mt-2 text-sm text-gray-500">
            {{ data.business.name }} confirmará tu cita. Guarda esta pantalla como comprobante.
          </p>
          <button
            class="mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-white"
            @click="reset"
          >
            Agendar otra cita
          </button>
        </div>

        <form v-else class="space-y-5 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800" @submit.prevent="submit">
          <section>
            <h2 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">1. Elige el servicio</h2>
            <p v-if="data.services.length === 0" class="text-sm text-gray-500">
              Este negocio aún no tiene servicios disponibles.
            </p>
            <div class="grid gap-2">
              <label
                v-for="s in data.services"
                :key="s.id"
                :class="[
                  'flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm',
                  serviceId === s.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-gray-200 dark:border-gray-700',
                ]"
              >
                <span class="flex items-center gap-2">
                  <input v-model="serviceId" type="radio" :value="s.id" class="accent-brand-500" @change="loadSlots" />
                  <span class="text-gray-800 dark:text-white">{{ s.name }}</span>
                </span>
                <span class="text-gray-500">{{ s.durationMinutes }} min · {{ money(s.price) }}</span>
              </label>
            </div>
          </section>

          <section v-if="data.sucursales.length > 1">
            <h2 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">Sucursal</h2>
            <select
              v-model="sucursalId"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              @change="loadSlots"
            >
              <option value="" disabled>Elige una sucursal</option>
              <option v-for="s in data.sucursales" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </section>

          <section>
            <h2 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">2. Elige el día</h2>
            <input
              v-model="date"
              type="date"
              :min="minDate"
              :max="maxDate"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              @change="loadSlots"
            />
          </section>

          <section v-if="serviceId && date">
            <h2 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">3. Elige la hora</h2>
            <p v-if="loadingSlots" class="text-sm text-gray-500">Buscando horarios…</p>
            <p v-else-if="slots.length === 0" class="text-sm text-gray-500">
              No hay horarios disponibles ese día. Prueba con otra fecha.
            </p>
            <div v-else class="grid grid-cols-4 gap-2">
              <button
                v-for="t in slots"
                :key="t"
                type="button"
                :class="[
                  'rounded-lg border px-2 py-2 text-sm',
                  time === t
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200',
                ]"
                @click="time = t"
              >
                {{ t }}
              </button>
            </div>
          </section>

          <section v-if="time" class="space-y-3">
            <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200">4. Tus datos</h2>
            <input
              v-model="customerName"
              required
              minlength="2"
              placeholder="Tu nombre"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <input
              v-model="customerPhone"
              required
              type="tel"
              inputmode="tel"
              placeholder="Tu WhatsApp (10 dígitos)"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <textarea
              v-model="notes"
              rows="2"
              maxlength="500"
              placeholder="Notas (opcional)"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <p class="text-xs text-gray-500">
              Al agendar aceptas que {{ data.business.name }} use tu nombre y teléfono para gestionar tu cita y
              enviarte recordatorios. COSDI procesa estos datos por cuenta del negocio.
            </p>
            <p v-if="error" class="text-sm text-error-500">{{ error }}</p>
            <button
              :disabled="submitting"
              class="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {{ submitting ? 'Agendando…' : 'Confirmar cita' }}
            </button>
          </section>
        </form>

        <p class="mt-6 text-center text-xs text-gray-400">Reservas con COSDI</p>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { bookPublic, getPublicBusiness, getPublicSlots, type PublicBusiness } from '@/services/citas'
import { extractApiError } from '@/services/api'
import { resolveUploadUrl } from '@/utils/mediaUrl'

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
const maxDate = computed(() =>
  isoLocal(new Date(Date.now() + (data.value?.maxDaysAhead ?? 90) * 86_400_000)),
)

const logoSrc = computed(() => resolveUploadUrl(data.value?.business.logoUrl))
const money = (v: string | number) => `$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  })

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
