<template>
  <div>
    <PageHeader :title="greeting" :description="todayLabel">
      <template #actions>
        <UiButton to="/appointments?nueva=1" :disabled="!activeServices.length">
          <template #icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Nueva cita
        </UiButton>
        <UiButton v-if="link" variant="secondary" @click="copyLink">
          <template #icon>
            <Check v-if="copied" class="h-4 w-4" aria-hidden="true" />
            <Link2 v-else class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ copied ? 'Link copiado' : 'Copiar mi link' }}
        </UiButton>
      </template>
    </PageHeader>

    <!-- Avisos que requieren acción -->
    <div class="mb-6 space-y-3 empty:hidden">
      <div
        v-if="booking?.pause.paused"
        class="flex flex-wrap items-center gap-3 rounded-2xl border border-warning-300 bg-warning-50 p-4 dark:border-warning-500/40 dark:bg-warning-500/10"
        role="status"
      >
        <PauseCircle class="h-5 w-5 shrink-0 text-warning-700 dark:text-warning-300" aria-hidden="true" />
        <p class="min-w-0 flex-1 text-sm text-warning-900 dark:text-warning-100">
          <strong>Tus reservas en línea están en pausa</strong>
          {{ booking.pause.until ? `hasta el ${longDate(booking.pause.until)}` : 'hasta que las reactives' }}.
          Tus clientes no pueden agendar en tu link.
        </p>
        <UiButton size="sm" variant="secondary" to="/appointments/config#vacaciones">Administrar</UiButton>
      </div>
      <div
        v-if="trial"
        :class="[
          'flex flex-wrap items-center gap-3 rounded-2xl border p-4',
          trial.tone === 'error'
            ? 'border-error-200 bg-error-50 dark:border-error-500/30 dark:bg-error-500/10'
            : 'border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10',
        ]"
        role="status"
      >
        <Sparkles class="h-5 w-5 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden="true" />
        <p class="min-w-0 flex-1 text-sm text-gray-800 dark:text-gray-100">
          <strong>{{ trial.title }}</strong> {{ trial.body }}
        </p>
        <UiButton size="sm" to="/suscripcion">{{ trial.cta }}</UiButton>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div class="min-w-0 space-y-6">
        <!-- Hoy -->
        <UiCard title="Tu día" :description="loading ? 'Cargando…' : todaySummary">
          <template #actions>
            <UiButton size="sm" variant="ghost" to="/appointments">Ver agenda</UiButton>
          </template>

          <dl class="mb-5 grid grid-cols-3 gap-2">
            <div v-for="c in counters" :key="c.label" class="rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/[0.04]">
              <dt class="text-xs font-medium text-gray-600 dark:text-gray-400">{{ c.label }}</dt>
              <dd class="mt-0.5 font-display text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">
                {{ loading ? '–' : c.value }}
              </dd>
            </div>
          </dl>

          <div v-if="loading" class="space-y-2" aria-busy="true">
            <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
          </div>
          <ul v-else-if="todayList.length" class="divide-y divide-gray-100 dark:divide-gray-800">
            <li v-for="a in todayList.slice(0, 6)" :key="a.id" class="flex items-center gap-3 py-2.5">
              <span class="w-14 shrink-0 font-display text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ hm(a.startTime) }}</span>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-gray-900 dark:text-white">{{ a.customerName }}</p>
                <p class="truncate text-sm text-gray-600 dark:text-gray-400">{{ a.service?.name ?? 'Servicio' }}</p>
              </div>
              <Badge :color="statusColor(a.status)" size="sm">{{ statusLabel(a.status) }}</Badge>
            </li>
          </ul>
          <div v-else class="rounded-xl border border-dashed border-gray-300 p-5 text-center dark:border-gray-700">
            <p class="font-medium text-gray-900 dark:text-white">No tienes citas hoy</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ nextAppt ? `Tu próxima cita es el ${apptWhen(nextAppt.startTime)} con ${nextAppt.customerName}.` : 'Comparte tu link para que tus clientes agenden solos.' }}
            </p>
          </div>
        </UiCard>

        <!-- Pendientes de configuración -->
        <UiCard v-if="!loading && pendingSteps.length" title="Deja tu agenda lista" :description="`${doneCount} de ${steps.length} pasos listos`">
          <div class="mb-4 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
            <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: `${(doneCount / steps.length) * 100}%` }" />
          </div>
          <ol class="space-y-1">
            <li v-for="s in steps" :key="s.id">
              <router-link
                :to="s.to"
                :class="[
                  'group flex min-h-14 items-center gap-3 rounded-xl px-2 py-2 transition-colors',
                  s.done ? 'opacity-70' : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
                ]"
              >
                <span
                  :class="[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    s.done ? 'bg-success-600 text-white' : 'border-2 border-gray-300 text-gray-500 dark:border-gray-600',
                  ]"
                  aria-hidden="true"
                >
                  <Check v-if="s.done" class="h-4 w-4" />
                  <component :is="s.icon" v-else class="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0 flex-1">
                  <span :class="['block font-medium', s.done ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white']">{{ s.label }}</span>
                  <span v-if="!s.done" class="block text-sm text-gray-600 dark:text-gray-400">{{ s.hint }}</span>
                </span>
                <span class="sr-only">{{ s.done ? 'Listo' : 'Pendiente' }}</span>
                <ChevronRight v-if="!s.done" class="h-5 w-5 shrink-0 text-gray-400 group-hover:text-gray-700" aria-hidden="true" />
              </router-link>
            </li>
          </ol>
        </UiCard>

        <TestimonialRequestCard :ready="completedCount >= 5" />
      </div>

      <!-- Columna lateral -->
      <aside class="space-y-6" aria-label="Sugerencias">
        <!-- Promoción según el plan -->
        <section
          v-if="promo"
          class="overflow-hidden rounded-2xl bg-brand-700 p-5 text-white shadow-card sm:p-6"
          aria-labelledby="promo-titulo"
        >
          <p class="flex items-center gap-2 text-sm font-medium text-brand-100">
            <component :is="promo.icon" class="h-4 w-4" aria-hidden="true" />
            {{ promo.kicker }}
          </p>
          <h2 id="promo-titulo" class="mt-2 font-display text-xl font-semibold leading-snug text-white">{{ promo.title }}</h2>
          <p class="mt-2 text-sm text-brand-100">{{ promo.body }}</p>
          <ul class="mt-4 space-y-2 text-sm">
            <li v-for="b in promo.bullets" :key="b" class="flex gap-2">
              <Check class="mt-0.5 h-4 w-4 shrink-0 text-brand-200" aria-hidden="true" />{{ b }}
            </li>
          </ul>
          <p v-if="promo.price" class="mt-4 text-sm text-brand-100">{{ promo.price }}</p>
          <a
            :href="promo.href"
            :target="promo.external ? '_blank' : undefined"
            :rel="promo.external ? 'noopener' : undefined"
            class="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-[10px] bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
            @click="promo.onClick?.($event)"
          >
            {{ promo.cta }}
          </a>
        </section>

        <!-- Día festivo próximo -->
        <section v-if="holidayTip" class="ui-card p-5" aria-labelledby="festivo-titulo">
          <p class="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
            <CalendarX class="h-4 w-4" aria-hidden="true" />
            Se acerca un día festivo
          </p>
          <h2 id="festivo-titulo" class="mt-1 text-base font-semibold text-gray-900 dark:text-white">
            {{ holidayTip.name }}, {{ longDate(holidayTip.date) }}
          </h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">¿Vas a cerrar? Bloquéalo para que nadie agende ese día.</p>
          <UiButton size="sm" variant="secondary" class="mt-3" to="/appointments/config#vacaciones">Bloquear el día</UiButton>
        </section>

        <!-- Accesos -->
        <nav class="ui-card p-2" aria-label="Accesos rápidos">
          <router-link
            v-for="q in quick"
            :key="q.to"
            :to="q.to"
            class="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.04]"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-200">
              <component :is="q.icon" class="h-4 w-4" aria-hidden="true" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ q.label }}</span>
              <span class="block text-xs text-gray-600 dark:text-gray-400">{{ q.hint }}</span>
            </span>
            <ChevronRight class="h-4 w-4 text-gray-400" aria-hidden="true" />
          </router-link>
        </nav>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import {
  BarChart3,
  Bot,
  CalendarClock,
  CalendarX,
  Check,
  ChevronRight,
  Clock,
  Contact,
  Gift,
  ImagePlus,
  Link2,
  MessageCircle,
  PauseCircle,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import Badge from '@/components/ui/Badge.vue'
import TestimonialRequestCard from '@/components/home/TestimonialRequestCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import {
  bookingUrl,
  getBusinessHours,
  listAppointments,
  listServices,
  STATUS_LABELS,
  type AppointmentItem,
  type AppointmentStatus,
  type BusinessHourItem,
  type ServiceItem,
} from '@/services/citas'
import { fetchRemindersStatus, fetchReferralSummary, type ReferralSummary, type RemindersStatus } from '@/services/billing'
import { getBookingSettings, type BookingSettingsState } from '@/services/bookingSettings'
import { upcomingHolidays } from '@/lib/holidaysMx'
import { markLinkShared, wasLinkShared } from '@/lib/linkShared'
import { planInfo } from '@/lib/plans'
import { BUSINESS } from '@/lib/business'

const auth = useAuthStore()
const toast = useToast()

const loading = ref(true)
const services = ref<ServiceItem[]>([])
const hours = ref<BusinessHourItem[]>([])
const appts = ref<AppointmentItem[]>([])
const reminders = ref<RemindersStatus | null>(null)
const booking = ref<BookingSettingsState | null>(null)
const referral = ref<ReferralSummary | null>(null)
const linkShared = ref(wasLinkShared())
const copied = ref(false)

const firstName = computed(() => auth.user?.name?.split(' ')[0] ?? '')
const greeting = computed(() => {
  const h = new Date().getHours()
  const base = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  return firstName.value ? `${base}, ${firstName.value}` : base
})
const todayLabel = computed(() => {
  const d = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return `${d.charAt(0).toUpperCase()}${d.slice(1)} · ${auth.user?.tenant?.name ?? ''}`
})
const link = computed(() => (auth.user?.tenant?.slug ? bookingUrl(auth.user.tenant.slug) : ''))

/* ---------- Citas ---------- */
function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
const now = new Date()
const todayKey = dayKey(now)
const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
const active = (a: AppointmentItem) => a.status === 'PENDING' || a.status === 'CONFIRMED'

const todayList = computed(() =>
  appts.value
    .filter((a) => dayKey(new Date(a.startTime)) === todayKey && a.status !== 'CANCELLED')
    .sort((a, b) => a.startTime.localeCompare(b.startTime)),
)
const counters = computed(() => [
  { label: 'Hoy', value: todayList.value.filter(active).length },
  { label: 'Mañana', value: appts.value.filter((a) => active(a) && dayKey(new Date(a.startTime)) === dayKey(tomorrow)).length },
  {
    label: 'Próx. 7 días',
    value: appts.value.filter((a) => active(a) && new Date(a.startTime) >= now && new Date(a.startTime) < weekEnd).length,
  },
])
const nextAppt = computed(() =>
  appts.value.filter((a) => active(a) && new Date(a.startTime) > now).sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null,
)
const completedCount = computed(() => appts.value.filter((a) => a.status === 'COMPLETED').length)
const todaySummary = computed(() => {
  const n = counters.value[0].value
  if (!n) return 'Sin citas pendientes para hoy.'
  const next = todayList.value.find((a) => active(a) && new Date(a.endTime) > now)
  return `${n} ${n === 1 ? 'cita pendiente' : 'citas pendientes'}${next ? `. La siguiente es a las ${hm(next.startTime)}.` : '.'}`
})

function hm(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function apptWhen(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { weekday: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function longDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
}
const STATUS: Record<AppointmentStatus, { label: string; color: 'success' | 'warning' | 'light' | 'error' | 'primary' }> = {
  PENDING: { label: STATUS_LABELS.PENDING, color: 'warning' },
  CONFIRMED: { label: STATUS_LABELS.CONFIRMED, color: 'success' },
  COMPLETED: { label: STATUS_LABELS.COMPLETED, color: 'primary' },
  CANCELLED: { label: STATUS_LABELS.CANCELLED, color: 'light' },
  NO_SHOW: { label: STATUS_LABELS.NO_SHOW, color: 'error' },
}
const statusLabel = (s: AppointmentStatus) => STATUS[s].label
const statusColor = (s: AppointmentStatus) => STATUS[s].color

/* ---------- Pasos de configuración ---------- */
const activeServices = computed(() => services.value.filter((s) => s.isActive))
const hasHours = computed(() => hours.value.some((h) => !h.isClosed))

interface Step {
  id: string
  label: string
  hint: string
  to: string
  done: boolean
  icon: Component
}
const steps = computed<Step[]>(() => [
  {
    id: 'services',
    label: 'Agrega tus servicios',
    hint: 'Nombre, duración y precio de lo que ofreces.',
    to: '/appointments/config',
    done: activeServices.value.length > 0,
    icon: Scissors,
  },
  {
    id: 'hours',
    label: 'Define tu horario',
    hint: 'Tus clientes solo verán horas dentro de él.',
    to: '/appointments/config',
    done: hasHours.value,
    icon: Clock,
  },
  {
    id: 'reminders',
    label: 'Activa los recordatorios por WhatsApp',
    hint: 'Se envían solos antes de cada cita para que no falten.',
    to: '/appointments/whatsapp',
    done: Boolean(reminders.value?.remindersEnabled),
    icon: MessageCircle,
  },
  {
    id: 'link',
    label: 'Comparte tu link de reservas',
    hint: 'Ponlo en tu bio de Instagram, Facebook y estados de WhatsApp.',
    to: '/appointments',
    done: linkShared.value || appts.value.some((a) => a.notes?.includes('[Reserva en línea]')),
    icon: Link2,
  },
  {
    id: 'logo',
    label: 'Sube el logo de tu negocio',
    hint: 'Aparece en tu link de reservas y da confianza.',
    to: '/cuenta',
    done: Boolean(auth.user?.tenant?.logoUrl),
    icon: ImagePlus,
  },
  {
    id: 'phone',
    label: 'Verifica tu número de WhatsApp',
    hint: 'Te sirve para recuperar tu contraseña por WhatsApp.',
    to: '/cuenta',
    done: Boolean(auth.user?.phoneVerifiedAt),
    icon: ShieldCheck,
  },
])
const doneCount = computed(() => steps.value.filter((s) => s.done).length)
const pendingSteps = computed(() => steps.value.filter((s) => !s.done))

/* ---------- Avisos de suscripción ---------- */
const trial = computed(() => {
  const sub = auth.user?.subscription
  if (!sub) return null
  if (sub.status === 'EXPIRED') {
    return { tone: 'error', title: 'Tu suscripción venció.', body: 'Renueva para seguir recibiendo citas y recordatorios.', cta: 'Renovar' }
  }
  if (sub.status === 'TRIALING' && sub.trialEndsAt) {
    const days = Math.ceil((new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000)
    if (days > 7) return null
    return {
      tone: 'info',
      title: days <= 0 ? 'Tu prueba termina hoy.' : `Te quedan ${days} ${days === 1 ? 'día' : 'días'} de prueba.`,
      body: 'Agrega tu forma de pago para no perder tu agenda.',
      cta: 'Ver mi suscripción',
    }
  }
  return null
})

/* ---------- Promoción según el plan ---------- */
const plan = computed(() => auth.user?.subscription?.planType)
const iaPrice = planInfo('CITAS_IA')?.priceMxn ?? 549
const panelPrice = planInfo('CITAS_PANEL')?.priceMxn ?? 349

async function copyReferral(e: Event) {
  e.preventDefault()
  if (!referral.value) return
  const text = `Te recomiendo COSDI para tu agenda y recordatorios por WhatsApp. Usa mi código ${referral.value.code} y tienes ${referral.value.referredPercentOff}% de descuento en tu primer mes: ${BUSINESS.site}`
  try {
    await navigator.clipboard.writeText(text)
    toast.success('Mensaje copiado', 'Pégalo en WhatsApp para recomendar COSDI.')
  } catch {
    toast.error('No se pudo copiar', `Tu código es ${referral.value.code}.`)
  }
}

const promo = computed(() => {
  if (plan.value === 'CITAS_PANEL' || plan.value === 'CITAS_RECORDATORIOS') {
    const msg = `Hola, soy de ${auth.user?.tenant?.name ?? 'mi negocio'} y quiero cambiarme al plan Citas + IA.`
    return {
      icon: Bot,
      kicker: 'Sube de nivel',
      title: 'Cámbiate a Citas + IA',
      body: 'Un asistente responde a tus clientes por WhatsApp a cualquier hora y les agenda la cita solo, aunque estés atendiendo a alguien más.',
      bullets: ['Responde y agenda las 24 horas', 'Revisa tu horario y tus servicios antes de ofrecer una hora', 'Ves todas las conversaciones en un tablero'],
      price: `$${iaPrice} MXN al mes, IVA incluido ($${iaPrice - panelPrice} más que tu plan actual).`,
      cta: 'Quiero Citas + IA',
      href: `${BUSINESS.whatsappLink}?text=${encodeURIComponent(msg)}`,
      external: true,
      onClick: undefined as ((e: Event) => void) | undefined,
    }
  }
  if (referral.value) {
    const r = referral.value
    return {
      icon: Gift,
      kicker: 'Recomienda y gana',
      title: 'Gana un mes gratis por cada negocio que recomiendes',
      body: `Tu código es ${r.code}. Quien lo use tiene ${r.referredPercentOff}% de descuento en su primer mes y tú ganas un mes gratis cuando pague (hasta ${r.maxRewards}).`,
      bullets: r.earned ? [`Llevas ${r.earned} ${r.earned === 1 ? 'mes ganado' : 'meses ganados'}`] : [],
      price: '',
      cta: 'Copiar mensaje para recomendar',
      href: '#',
      external: false,
      onClick: copyReferral,
    }
  }
  return null
})

/* ---------- Día festivo ---------- */
const holidayTip = computed(() => {
  const today = booking.value?.today
  if (!today) return null
  const horizon = new Date(`${today}T12:00:00`)
  horizon.setDate(horizon.getDate() + 21)
  const limit = horizon.toISOString().slice(0, 10)
  const blocked = (d: string) => booking.value!.closures.some((c) => c.startDate <= d && d <= c.endDate)
  return upcomingHolidays(today, 3).find((h) => h.date <= limit && !blocked(h.date)) ?? null
})

const quick = [
  { to: '/dashboard', label: 'Resumen del negocio', hint: 'Qué servicio piden más y qué días se llenan', icon: BarChart3 },
  { to: '/customers', label: 'Clientes', hint: 'Busca a un cliente y escríbele por WhatsApp', icon: Contact },
  { to: '/appointments/config#vacaciones', label: 'Vacaciones y pausa', hint: 'Bloquea días o pausa tus reservas', icon: CalendarClock },
]

async function copyLink() {
  if (!link.value) return
  try {
    await navigator.clipboard.writeText(link.value)
    markLinkShared()
    linkShared.value = true
    copied.value = true
    toast.success('Link copiado', 'Pégalo en tu bio, estados o mensajes.')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    toast.error('No se pudo copiar', link.value)
  }
}

onMounted(async () => {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 8)
  const [s, h, a, r, b, ref] = await Promise.allSettled([
    listServices(true),
    getBusinessHours(),
    listAppointments(from, to),
    fetchRemindersStatus(),
    getBookingSettings(),
    fetchReferralSummary(),
  ])
  if (s.status === 'fulfilled') services.value = s.value
  if (h.status === 'fulfilled') hours.value = h.value
  if (a.status === 'fulfilled') appts.value = a.value
  if (r.status === 'fulfilled') reminders.value = r.value
  if (b.status === 'fulfilled') booking.value = b.value
  if (ref.status === 'fulfilled') referral.value = ref.value
  loading.value = false
})
</script>
