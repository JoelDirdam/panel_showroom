<template>
  <admin-layout>
    <PageHeader title="Resumen" description="Cómo va tu agenda: cuántas citas tienes, qué piden más tus clientes y cuándo hay más movimiento.">
      <template #actions>
        <div class="inline-flex rounded-[10px] bg-gray-100 p-1 dark:bg-white/5" role="group" aria-label="Periodo">
          <button
            v-for="opt in PERIODS"
            :key="opt.days"
            type="button"
            :aria-pressed="days === opt.days"
            :class="[
              'min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors',
              days === opt.days
                ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400',
            ]"
            @click="setDays(opt.days)"
          >
            {{ opt.label }}
          </button>
        </div>
      </template>
    </PageHeader>

    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true" aria-label="Cargando resumen">
      <div v-for="n in 4" :key="n" class="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div class="h-64 animate-pulse rounded-2xl bg-gray-100 sm:col-span-2 dark:bg-white/5" />
      <div class="h-64 animate-pulse rounded-2xl bg-gray-100 sm:col-span-2 dark:bg-white/5" />
    </div>

    <UiCard v-else-if="error">
      <UiEmptyState title="No se pudo cargar el resumen" :description="error">
        <template #icon><AlertTriangle class="h-5 w-5" /></template>
        <UiButton variant="secondary" @click="load">Reintentar</UiButton>
      </UiEmptyState>
    </UiCard>

    <div v-else class="space-y-6">
      <!-- Lo importante en una frase -->
      <section
        v-if="insights.length"
        class="rounded-2xl bg-brand-700 p-5 text-white sm:p-6"
        aria-labelledby="insights-title"
      >
        <h2 id="insights-title" class="flex items-center gap-2 text-sm font-semibold text-brand-100">
          <Lightbulb class="h-4 w-4" aria-hidden="true" />
          Para decidir esta semana
        </h2>
        <ul class="mt-3 grid gap-3 md:grid-cols-3">
          <li v-for="i in insights" :key="i" class="rounded-xl bg-white/10 p-4 text-[15px] leading-snug">{{ i }}</li>
        </ul>
      </section>

      <!-- Indicadores -->
      <dl class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <div v-for="k in kpis" :key="k.label" class="ui-card p-4 sm:p-5">
          <dt class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <component :is="k.icon" class="h-4 w-4 text-gray-500" aria-hidden="true" />
            {{ k.label }}
          </dt>
          <dd class="mt-3 font-display text-[26px] font-semibold leading-none tabular-nums text-gray-900 sm:text-[32px] dark:text-white">
            {{ k.value }}
          </dd>
          <dd v-if="k.hint" class="mt-2 text-[13px]" :class="k.tone === 'up' ? 'text-success-700' : k.tone === 'down' ? 'text-error-600' : 'text-gray-500'">
            {{ k.hint }}
          </dd>
        </div>
      </dl>

      <div v-if="periodAppts.length === 0" class="grid gap-6 lg:grid-cols-2">
        <UiCard>
          <UiEmptyState
            title="Aún no hay citas en este periodo"
            description="Cuando tus clientes empiecen a agendar, aquí verás qué servicios piden más, qué días se llenan y quién regresa."
          >
            <template #icon><BarChart3 class="h-5 w-5" /></template>
            <UiButton to="/appointments">Ir a mis citas</UiButton>
          </UiEmptyState>
        </UiCard>
        <BookingLinkCard :link="bookingLink" :has-services="services.length > 0" :show-checklist="services.length === 0" />
      </div>

      <template v-else>
        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Servicios -->
          <UiCard title="Servicios más pedidos" :description="`Citas agendadas en los últimos ${days} días, sin contar canceladas.`">
            <ol class="space-y-4">
              <li v-for="(s, i) in topServices" :key="s.name">
                <div class="flex items-baseline justify-between gap-3 text-sm">
                  <span class="min-w-0 truncate font-semibold text-gray-900 dark:text-white">
                    <span class="mr-1.5 text-gray-400 tabular-nums">{{ i + 1 }}.</span>{{ s.name }}
                  </span>
                  <span class="shrink-0 tabular-nums text-gray-600 dark:text-gray-400">
                    <strong class="text-gray-900 dark:text-white">{{ s.count }}</strong> {{ s.count === 1 ? 'cita' : 'citas' }} · {{ s.share }}%
                  </span>
                </div>
                <div class="mt-1.5 h-2.5 rounded-full bg-gray-100 dark:bg-white/5" aria-hidden="true">
                  <div class="h-full rounded-full bg-brand-500" :style="{ width: `${(s.count / topServices[0].count) * 100}%` }" />
                </div>
                <p v-if="s.revenue" class="mt-1 text-[13px] text-gray-500">
                  {{ money(s.revenue) }} estimado en citas completadas
                </p>
              </li>
            </ol>
          </UiCard>

          <!-- Días -->
          <UiCard title="Días con más citas" description="Para saber cuándo reforzar tu horario o lanzar una promoción.">
            <ul class="space-y-2.5">
              <li v-for="d in byWeekday" :key="d.label" class="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span :class="d.isTop ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'">{{ d.label }}</span>
                <span class="h-6 rounded-md bg-gray-100 dark:bg-white/5" aria-hidden="true">
                  <span
                    class="block h-full rounded-md"
                    :class="d.isTop ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/40'"
                    :style="{ width: `${maxWeekday ? (d.count / maxWeekday) * 100 : 0}%` }"
                  />
                </span>
                <span class="text-right tabular-nums text-gray-900 dark:text-white">{{ d.count }}</span>
              </li>
            </ul>
          </UiCard>
        </div>

        <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <!-- Horas -->
          <UiCard title="Horas más ocupadas" description="Hora de inicio de las citas en el periodo.">
            <div class="flex h-44 items-end gap-1 sm:gap-1.5" role="img" :aria-label="hoursAria">
              <div v-for="h in byHour" :key="h.hour" class="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span v-if="h.count" class="text-[11px] tabular-nums text-gray-600 dark:text-gray-400">{{ h.count }}</span>
                <span
                  class="w-full rounded-t-md"
                  :class="h.isTop ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/40'"
                  :style="{ height: `${maxHour ? Math.max((h.count / maxHour) * 100, h.count ? 4 : 0) : 0}%` }"
                />
              </div>
            </div>
            <div class="mt-2 flex gap-1 sm:gap-1.5" aria-hidden="true">
              <span v-for="h in byHour" :key="h.hour" class="flex-1 text-center text-[10px] tabular-nums text-gray-500 sm:text-[11px]">{{ h.hour }}</span>
            </div>
          </UiCard>

          <!-- Asistencia -->
          <UiCard title="Asistencia" description="De las citas que ya pasaron en el periodo.">
            <div class="flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5" aria-hidden="true">
              <span class="bg-success-600" :style="{ width: pct(attendance.completed) }" />
              <span class="bg-warning-500" :style="{ width: pct(attendance.noShow) }" />
              <span class="bg-gray-400" :style="{ width: pct(attendance.cancelled) }" />
            </div>
            <dl class="mt-5 grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <span class="h-2.5 w-2.5 rounded-full bg-success-600" aria-hidden="true" />Completadas
                </dt>
                <dd class="mt-1 font-display text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{{ attendance.completed }}</dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <span class="h-2.5 w-2.5 rounded-full bg-warning-500" aria-hidden="true" />No asistieron
                </dt>
                <dd class="mt-1 font-display text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{{ attendance.noShow }}</dd>
              </div>
              <div>
                <dt class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <span class="h-2.5 w-2.5 rounded-full bg-gray-400" aria-hidden="true" />Canceladas
                </dt>
                <dd class="mt-1 font-display text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{{ attendance.cancelled }}</dd>
              </div>
            </dl>
            <p v-if="attendance.unmarked" class="ui-help mt-4">
              {{ attendance.unmarked }} {{ attendance.unmarked === 1 ? 'cita pasada sigue' : 'citas pasadas siguen' }} sin marcar como completada o no asistió.
              <router-link to="/appointments" class="font-semibold text-brand-600 underline">Márcalas en Citas</router-link>
              para que este resumen sea exacto.
            </p>
          </UiCard>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <!-- Clientes frecuentes -->
          <UiCard title="Clientes que más regresan" :description="`Con más citas en los últimos ${days} días.`">
            <p v-if="topCustomers.length === 0" class="text-sm text-gray-500">Todavía nadie ha agendado más de una vez en este periodo.</p>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <li v-for="c in topCustomers" :key="c.phone" class="flex items-center gap-3 py-3">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15" aria-hidden="true">
                  {{ c.name.trim().charAt(0).toUpperCase() }}
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ c.name }}</span>
                  <span class="block text-[13px] text-gray-500">Suele pedir {{ c.favorite }}</span>
                </span>
                <span class="shrink-0 text-sm tabular-nums text-gray-700 dark:text-gray-300">{{ c.count }} citas</span>
              </li>
            </ul>
          </UiCard>

          <!-- Invitar de nuevo -->
          <UiCard
            title="Clientes para invitar de nuevo"
            description="Vinieron antes, pero no tienen cita en los últimos 30 días ni una próxima."
          >
            <p v-if="toReinvite.length === 0" class="text-sm text-gray-500">
              {{ days < 60 ? 'Elige “90 días” para ver a quién invitar de nuevo.' : 'Nadie por ahora: tus clientes recientes siguen viniendo.' }}
            </p>
            <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
              <li v-for="c in toReinvite" :key="c.phone" class="flex flex-wrap items-center gap-3 py-3">
                <span class="min-w-0 flex-1">
                  <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ c.name }}</span>
                  <span class="block text-[13px] text-gray-500">Última cita: {{ c.lastLabel }} · {{ c.favorite }}</span>
                </span>
                <UiButton size="sm" variant="wa" :href="`https://wa.me/${waNumber(c.phone)}`" target="_blank" :aria-label="`Escribir a ${c.name} por WhatsApp`">
                  Escribir
                </UiButton>
              </li>
            </ul>
          </UiCard>
        </div>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CircleDollarSign,
  Lightbulb,
  UserCheck,
  Users,
} from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import BookingLinkCard from '@/components/agenda/BookingLinkCard.vue'
import { useAuthStore } from '@/stores/auth'
import { extractApiError } from '@/services/api'
import { bookingUrl, listAppointments, listServices, type AppointmentItem, type ServiceItem } from '@/services/citas'

/**
 * Resumen para negocios de citas. Todo se calcula en el navegador con las
 * citas y servicios que ya devuelve la API (sin endpoints nuevos).
 */
const PERIODS = [
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
]
const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const DAY_MS = 86_400_000

const auth = useAuthStore()
const days = ref(30)
const loading = ref(true)
const error = ref('')
const all = ref<AppointmentItem[]>([])
const services = ref<ServiceItem[]>([])
const now = ref(Date.now())

const bookingLink = computed(() => (auth.user?.tenant?.slug ? bookingUrl(auth.user.tenant.slug) : ''))

async function load() {
  loading.value = true
  error.value = ''
  now.value = Date.now()
  try {
    // Periodo actual + periodo anterior (para comparar) + próximos 7 días.
    const from = new Date(now.value - 2 * days.value * DAY_MS)
    const to = new Date(now.value + 7 * DAY_MS)
    const [a, s] = await Promise.all([listAppointments(from, to), listServices(true)])
    all.value = a
    services.value = s
  } catch (e) {
    error.value = extractApiError(e, 'Intenta de nuevo en un momento.')
  } finally {
    loading.value = false
  }
}

function setDays(d: number) {
  if (days.value === d) return
  days.value = d
  void load()
}

const t = (a: AppointmentItem) => new Date(a.startTime).getTime()
const notCancelled = (a: AppointmentItem) => a.status !== 'CANCELLED'
const phoneKey = (p: string) => p.replace(/\D/g, '').slice(-10)

const periodStart = computed(() => now.value - days.value * DAY_MS)
const periodAppts = computed(() => all.value.filter((a) => t(a) >= periodStart.value && t(a) < now.value))
const prevAppts = computed(() =>
  all.value.filter((a) => t(a) >= periodStart.value - days.value * DAY_MS && t(a) < periodStart.value),
)
const upcoming = computed(() =>
  all.value.filter((a) => t(a) >= now.value && (a.status === 'PENDING' || a.status === 'CONFIRMED')),
)

const priceById = computed(() => new Map(services.value.map((s) => [s.id, Number(s.price) || 0])))

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

const booked = computed(() => periodAppts.value.filter(notCancelled))
const prevBooked = computed(() => prevAppts.value.filter(notCancelled))

const uniqueCustomers = computed(() => new Set(booked.value.map((a) => phoneKey(a.customerPhone))))
const newCustomers = computed(() => {
  const before = new Set(prevBooked.value.map((a) => phoneKey(a.customerPhone)))
  return [...uniqueCustomers.value].filter((p) => !before.has(p)).length
})

const attendance = computed(() => {
  const completed = periodAppts.value.filter((a) => a.status === 'COMPLETED').length
  const noShow = periodAppts.value.filter((a) => a.status === 'NO_SHOW').length
  const cancelled = periodAppts.value.filter((a) => a.status === 'CANCELLED').length
  const unmarked = periodAppts.value.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length
  return { completed, noShow, cancelled, unmarked, total: completed + noShow + cancelled }
})
const pct = (n: number) => `${attendance.value.total ? (n / attendance.value.total) * 100 : 0}%`
const attendanceRate = computed(() => {
  const { completed, noShow } = attendance.value
  return completed + noShow ? Math.round((completed / (completed + noShow)) * 100) : null
})

const revenue = computed(() =>
  periodAppts.value
    .filter((a) => a.status === 'COMPLETED' && a.service)
    .reduce((sum, a) => sum + (priceById.value.get(a.service!.id) ?? 0), 0),
)

function delta(current: number, previous: number) {
  if (!previous) return null
  return Math.round(((current - previous) / previous) * 100)
}

const kpis = computed(() => {
  const d = delta(booked.value.length, prevBooked.value.length)
  return [
    {
      icon: CalendarCheck,
      label: 'Citas agendadas',
      value: booked.value.length.toLocaleString('es-MX'),
      hint: d === null ? `Últimos ${days.value} días` : `${d >= 0 ? '+' : ''}${d}% vs. los ${days.value} días anteriores`,
      tone: d === null ? undefined : d >= 0 ? 'up' : 'down',
    },
    {
      icon: Users,
      label: 'Clientes que agendaron',
      value: uniqueCustomers.value.size.toLocaleString('es-MX'),
      hint: `${newCustomers.value} ${newCustomers.value === 1 ? 'nuevo' : 'nuevos'} en el periodo`,
    },
    {
      icon: UserCheck,
      label: 'Asistencia',
      value: attendanceRate.value === null ? '—' : `${attendanceRate.value}%`,
      hint: attendanceRate.value === null ? 'Marca tus citas como completadas o no asistió' : `${attendance.value.noShow} no ${attendance.value.noShow === 1 ? 'llegó' : 'llegaron'}`,
      tone: attendanceRate.value !== null && attendanceRate.value < 80 ? 'down' : undefined,
    },
    {
      icon: CircleDollarSign,
      label: 'Ingreso estimado',
      value: money(revenue.value),
      hint: 'Citas completadas × precio del servicio',
    },
  ]
})

const topServices = computed(() => {
  const map = new Map<string, { name: string; count: number; revenue: number }>()
  for (const a of booked.value) {
    const name = a.service?.name ?? 'Sin servicio'
    const entry = map.get(name) ?? { name, count: 0, revenue: 0 }
    entry.count += 1
    if (a.status === 'COMPLETED' && a.service) entry.revenue += priceById.value.get(a.service.id) ?? 0
    map.set(name, entry)
  }
  const total = booked.value.length || 1
  return [...map.values()]
    .sort((x, y) => y.count - x.count)
    .slice(0, 5)
    .map((s) => ({ ...s, share: Math.round((s.count / total) * 100) }))
})

const byWeekday = computed(() => {
  const counts = Array(7).fill(0) as number[]
  for (const a of booked.value) counts[(new Date(a.startTime).getDay() + 6) % 7] += 1
  const max = Math.max(...counts)
  return WEEKDAYS.map((label, i) => ({ label, count: counts[i], isTop: max > 0 && counts[i] === max }))
})
const maxWeekday = computed(() => Math.max(...byWeekday.value.map((d) => d.count)))

const byHour = computed(() => {
  const counts = new Map<number, number>()
  for (const a of booked.value) {
    const h = new Date(a.startTime).getHours()
    counts.set(h, (counts.get(h) ?? 0) + 1)
  }
  const hours = [...counts.keys()]
  const minH = Math.min(9, ...hours)
  const maxH = Math.max(19, ...hours)
  const max = Math.max(0, ...counts.values())
  const out = []
  for (let h = minH; h <= maxH; h++) out.push({ hour: h, count: counts.get(h) ?? 0, isTop: max > 0 && counts.get(h) === max })
  return out
})
const maxHour = computed(() => Math.max(0, ...byHour.value.map((h) => h.count)))
const hoursAria = computed(() => {
  const top = byHour.value.filter((h) => h.isTop).map((h) => `${h.hour}:00`)
  return top.length ? `La hora con más citas es ${top.join(' y ')}.` : 'Sin citas en el periodo.'
})

function favoriteOf(list: AppointmentItem[]) {
  const counts = new Map<string, number>()
  for (const a of list) {
    const n = a.service?.name ?? 'Sin servicio'
    counts.set(n, (counts.get(n) ?? 0) + 1)
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '—'
}

const topCustomers = computed(() => {
  const groups = new Map<string, AppointmentItem[]>()
  for (const a of booked.value) {
    const k = phoneKey(a.customerPhone)
    groups.set(k, [...(groups.get(k) ?? []), a])
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((x, y) => y[1].length - x[1].length)
    .slice(0, 5)
    .map(([phone, list]) => ({ phone, name: list[list.length - 1].customerName, count: list.length, favorite: favoriteOf(list) }))
})

const toReinvite = computed(() => {
  const cutoff = now.value - 30 * DAY_MS
  const groups = new Map<string, AppointmentItem[]>()
  for (const a of all.value.filter(notCancelled)) {
    const k = phoneKey(a.customerPhone)
    groups.set(k, [...(groups.get(k) ?? []), a])
  }
  return [...groups.entries()]
    .filter(([, list]) => list.every((a) => t(a) < cutoff))
    .map(([phone, list]) => {
      const last = list.reduce((m, a) => (t(a) > t(m) ? a : m))
      return {
        phone,
        name: last.customerName,
        last: t(last),
        lastLabel: new Date(last.startTime).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
        favorite: favoriteOf(list),
      }
    })
    .sort((x, y) => y.last - x.last)
    .slice(0, 6)
})

const insights = computed(() => {
  const out: string[] = []
  const pending = upcoming.value.filter((a) => a.status === 'PENDING').length
  if (upcoming.value.length === 0) {
    out.push('No tienes citas en los próximos 7 días. Comparte tu link de reservas en tus redes.')
  } else {
    out.push(
      `Tienes ${upcoming.value.length} ${upcoming.value.length === 1 ? 'cita' : 'citas'} en los próximos 7 días` +
        (pending ? `; ${pending} ${pending === 1 ? 'está' : 'están'} por confirmar.` : '.'),
    )
  }
  if (topServices.value[0]) out.push(`Tu servicio más pedido es ${topServices.value[0].name} (${topServices.value[0].share}% de tus citas).`)
  const topDay = byWeekday.value.find((d) => d.isTop)
  if (topDay) out.push(`Tu día con más citas es el ${topDay.label.toLowerCase()}. Considera abrir más horas ese día.`)
  return out
})

const waNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `52${digits}` : digits
}

onMounted(load)
</script>
