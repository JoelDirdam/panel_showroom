<template>
  <div class="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100">
    <MarketingHeader />

    <main id="contenido" tabindex="-1">
      <!-- Hero -->
      <section class="relative overflow-hidden">
        <div class="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-20">
          <div>
            <p class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-gray-700">
              <MapPin class="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              Hecho en Durango, México
            </p>
            <h1 class="mt-5 text-[40px] font-semibold leading-[1.05] tracking-tight text-gray-900 sm:text-[56px] dark:text-white">
              Tu agenda en línea con recordatorios por WhatsApp
            </h1>
            <p class="mt-5 max-w-xl text-lg leading-relaxed text-gray-600 dark:text-gray-400">
              Para estéticas, barberías, consultorios, spas y cualquier negocio que trabaja con citas. Tus clientes
              agendan desde un link, tú ves todo en un panel y COSDI les recuerda su cita por WhatsApp para que no falten.
            </p>
            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <router-link to="/register?plan=CITAS_PANEL" class="ui-btn ui-btn-primary min-h-12 px-6 text-[15px]">
                Crear mi cuenta
              </router-link>
              <a :href="BUSINESS.whatsappLink" target="_blank" rel="noopener" class="ui-btn ui-btn-secondary min-h-12 px-6 text-[15px]">
                <MessageCircleIcon class="h-4 w-4 text-wa-600" aria-hidden="true" />
                Pedir una demostración
              </a>
            </div>
            <p class="mt-5 text-[15px] text-gray-700 dark:text-gray-300">
              <span class="font-semibold text-gray-900 dark:text-white">Plan Citas: ${{ citasPrice }} MXN al mes</span>
              <span class="text-gray-500"> · IVA incluido · sin plazos forzosos</span>
            </p>
          </div>

          <!-- Vista del panel: la agenda del día y el recordatorio que recibe el cliente -->
          <div class="relative mx-auto w-full max-w-[520px] pb-24 sm:pb-16" aria-hidden="true">
            <div class="rounded-[22px] border border-gray-200 bg-white p-2 shadow-pop dark:border-gray-800 dark:bg-gray-900">
              <div class="rounded-2xl bg-gray-50 p-4 sm:p-5 dark:bg-white/[0.03]">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs text-gray-500">Estética Ana · Panel</p>
                    <p class="font-display text-lg font-semibold text-gray-900 dark:text-white">Hoy, jueves</p>
                  </div>
                  <span class="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">6 citas</span>
                </div>
                <ul class="mt-4 space-y-2">
                  <li
                    v-for="c in citas"
                    :key="c.hora"
                    class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900"
                  >
                    <span class="w-14 font-display text-lg font-semibold tabular-nums text-gray-900 dark:text-white">{{ c.hora }}</span>
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ c.nombre }}</span>
                      <span class="block truncate text-xs text-gray-500">{{ c.servicio }}</span>
                    </span>
                    <span
                      :class="[
                        'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                        c.tono === 'ok' ? 'bg-success-50 text-success-700' : 'bg-wa-50 text-wa-700',
                      ]"
                    >
                      {{ c.estado }}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <!-- Burbuja de WhatsApp -->
            <div class="absolute -bottom-0 left-4 right-4 sm:left-auto sm:right-[-12px] sm:w-[300px] lg:right-[-28px]">
              <div class="rounded-2xl bg-[#ece5dd] p-3 shadow-pop ring-1 ring-black/5">
                <p class="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-wa-700">
                  <MessageCircleIcon class="h-3.5 w-3.5" />
                  WhatsApp · Recordatorio
                </p>
                <div class="rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[13px] leading-snug text-gray-900">
                  Hola Luis, te recordamos tu cita en Estética Ana (Barba) el <strong>jueves a las 11:30 a.m.</strong>
                  <span class="mt-0.5 block text-right text-[10px] text-gray-500">9:30 a.m.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Franja de confianza: solo hechos verificables -->
        <div class="border-y border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.02]">
          <ul class="mx-auto grid max-w-7xl grid-cols-2 gap-x-6 gap-y-4 px-5 py-6 sm:px-6 lg:grid-cols-4">
            <li v-for="t in confianza" :key="t.text" class="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <component :is="t.icon" class="h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
              {{ t.text }}
            </li>
          </ul>
        </div>
      </section>

      <!-- Qué es -->
      <section id="que-es" class="scroll-mt-20 py-20 lg:py-28">
        <div class="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">
              Qué es COSDI
            </h2>
            <p class="mt-5 max-w-xl text-[17px] leading-relaxed text-gray-600 dark:text-gray-400">
              COSDI es un software en línea para pequeños y medianos negocios en México. Sustituye la libreta de citas,
              las hojas de cálculo y los mensajes sueltos por un panel claro, accesible desde tu celular o computadora.
              Empieza con tu agenda y, si vendes productos, suma inventario, ventas y caja con el plan Negocio.
            </p>
          </div>
          <div class="ui-card overflow-hidden">
            <div class="grid grid-cols-2 border-b border-gray-100 bg-gray-50 text-sm font-semibold dark:border-gray-800 dark:bg-white/[0.02]">
              <p class="px-5 py-3 text-gray-500">Antes</p>
              <p class="px-5 py-3 text-brand-600 dark:text-brand-300">Con COSDI</p>
            </div>
            <ul class="divide-y divide-gray-100 dark:divide-gray-800">
              <li v-for="r in antesDespues" :key="r.antes" class="grid grid-cols-2 text-sm">
                <p class="px-5 py-4 text-gray-500 line-through decoration-gray-300">{{ r.antes }}</p>
                <p class="px-5 py-4 font-medium text-gray-900 dark:text-white">{{ r.despues }}</p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Funciones -->
      <section id="funciones" class="scroll-mt-20 bg-white py-20 lg:py-28 dark:bg-white/[0.02]">
        <div class="mx-auto max-w-7xl px-5 sm:px-6">
          <div class="max-w-2xl">
            <h2 class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">Funciones</h2>
            <p class="mt-4 text-[17px] text-gray-600 dark:text-gray-400">Lo que usas todos los días para llenar tu agenda y que nadie falte.</p>
          </div>
          <div class="mt-12 grid gap-5 md:grid-cols-2">
            <article
              v-for="f in funciones"
              :key="f.title"
              class="rounded-2xl border border-gray-200 bg-gray-50 p-6 sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <span
                :class="[
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  f.wa ? 'bg-wa-50 text-wa-700' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15',
                ]"
                aria-hidden="true"
              >
                <component :is="f.icon" class="h-5 w-5" />
              </span>
              <h3 class="mt-5 text-xl font-semibold text-gray-900 dark:text-white">{{ f.title }}</h3>
              <p class="mt-2 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{{ f.text }}</p>
              <ul class="mt-4 space-y-2">
                <li v-for="d in f.detalles" :key="d" class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {{ d }}
                </li>
              </ul>
            </article>
          </div>

          <div class="mt-5 flex flex-col gap-5 rounded-2xl border border-dashed border-gray-300 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between dark:border-gray-700">
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">¿También vendes productos?</h3>
              <p class="mt-1 text-[15px] text-gray-600 dark:text-gray-400">
                Con el plan Negocio sumas inventario, caja, ventas, marcas y consignaciones en el mismo panel.
              </p>
            </div>
            <ul class="flex flex-wrap gap-2">
              <li
                v-for="n in negocio"
                :key="n.title"
                class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-gray-700"
              >
                <component :is="n.icon" class="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
                {{ n.title }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Cómo funciona -->
      <section id="como-funciona" class="scroll-mt-20 py-20 lg:py-28">
        <div class="mx-auto max-w-7xl px-5 sm:px-6">
          <h2 class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">Cómo funciona</h2>
          <ol class="mt-12 grid gap-5 md:grid-cols-3">
            <li v-for="(s, i) in pasos" :key="s.title" class="relative rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <span class="font-display text-5xl font-semibold leading-none text-brand-500/25" aria-hidden="true">{{ i + 1 }}</span>
              <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                <span class="sr-only">Paso {{ i + 1 }}: </span>{{ s.title }}
              </h3>
              <p class="mt-2 text-[15px] text-gray-600 dark:text-gray-400">{{ s.text }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Testimonios (solo los aprobados en el panel de plataforma) -->
      <section v-if="testimonios.length" id="testimonios" class="scroll-mt-20 pb-20 lg:pb-28" aria-labelledby="testimonios-titulo">
        <div class="mx-auto max-w-7xl px-5 sm:px-6">
          <h2 id="testimonios-titulo" class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">
            Lo que dicen otros negocios
          </h2>
          <ul class="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <li
              v-for="t in testimonios"
              :key="t.id"
              class="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div v-if="t.rating" class="flex gap-0.5" :aria-label="`${t.rating} de 5 estrellas`">
                <StarIcon
                  v-for="n in 5"
                  :key="n"
                  :class="['h-4 w-4', n <= t.rating ? 'fill-warning-400 text-warning-500' : 'text-gray-300']"
                  aria-hidden="true"
                />
              </div>
              <blockquote class="mt-4 flex-1 text-[16px] leading-relaxed text-gray-800 dark:text-gray-200">“{{ t.quote }}”</blockquote>
              <footer class="mt-5 flex items-center gap-3">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-semibold text-brand-700" aria-hidden="true">
                  {{ t.authorName.charAt(0).toUpperCase() }}
                </span>
                <span class="min-w-0 text-sm">
                  <span class="block font-semibold text-gray-900 dark:text-white">{{ t.authorName }}</span>
                  <span class="block text-gray-600 dark:text-gray-400">
                    {{ t.businessName }}<template v-if="t.authorRole"> · {{ t.authorRole }}</template>
                  </span>
                </span>
                <a
                  v-if="t.sourceUrl"
                  :href="t.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  class="ml-auto inline-flex min-h-11 items-center text-xs font-medium text-gray-500 underline hover:text-gray-800"
                >
                  Ver en {{ SOURCE_LABEL[t.source] }}
                </a>
              </footer>
            </li>
          </ul>
        </div>
      </section>

      <!-- Planes -->
      <section id="planes" class="scroll-mt-20 bg-white py-20 lg:py-28 dark:bg-white/[0.02]">
        <div class="mx-auto max-w-7xl px-5 sm:px-6">
          <div class="max-w-2xl">
            <h2 class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">Planes y precios</h2>
            <p class="mt-4 text-[17px] text-gray-600 dark:text-gray-400">
              Pago mensual con IVA incluido. Sin plazos forzosos: cancela cuando quieras.
            </p>
          </div>
          <div class="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <article
              v-for="(plan, idx) in displayPlans"
              :key="plan.type"
              :class="[
                'relative flex flex-col rounded-2xl border p-6',
                idx === 0 && plan.available
                  ? 'border-brand-500 bg-white ring-1 ring-brand-500 dark:bg-gray-900'
                  : plan.available
                    ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]',
              ]"
            >
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Plan {{ plan.name }}</h3>
                <Badge size="sm" :color="plan.available ? (idx === 0 ? 'primary' : 'success') : 'light'">
                  {{ plan.available ? 'Disponible' : 'Próximamente' }}
                </Badge>
              </div>
              <p class="mt-4">
                <template v-if="shownPrice(plan, false)">
                  <span class="font-display text-4xl font-semibold text-gray-900 dark:text-white">${{ shownPrice(plan, false) }}</span>
                  <span class="text-sm text-gray-500"> MXN/mes</span>
                  <span class="mt-1 block text-[13px] text-gray-500">IVA incluido</span>
                </template>
                <span v-else class="text-[15px] font-semibold text-gray-700 dark:text-gray-300">Precio al contratar</span>
              </p>
              <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">{{ plan.description }}</p>
              <ul class="mt-5 flex-1 space-y-2.5 border-t border-gray-100 pt-5 dark:border-gray-800">
                <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  {{ feature }}
                </li>
              </ul>
              <router-link
                v-if="plan.available"
                :to="`/register?plan=${plan.type}`"
                :class="['ui-btn mt-6 w-full', idx === 0 ? 'ui-btn-primary' : 'ui-btn-secondary']"
              >
                Elegir plan {{ plan.name }}
              </router-link>
              <span v-else class="ui-btn ui-btn-secondary mt-6 w-full cursor-default opacity-60" aria-disabled="true">Próximamente</span>
            </article>
          </div>
        </div>
      </section>

      <!-- FAQ -->
      <section id="preguntas" class="scroll-mt-20 py-20 lg:py-28">
        <div class="mx-auto grid max-w-7xl gap-10 px-5 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 class="text-3xl font-semibold leading-tight text-gray-900 sm:text-[40px] dark:text-white">Preguntas frecuentes</h2>
            <p class="mt-4 text-[15px] text-gray-600 dark:text-gray-400">
              ¿No encuentras tu respuesta?
              <a :href="BUSINESS.whatsappLink" target="_blank" rel="noopener" class="font-semibold text-brand-600 underline">Escríbenos por WhatsApp</a>.
            </p>
          </div>
          <div class="divide-y divide-gray-200 border-y border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            <details v-for="q in faq" :key="q.q" class="group">
              <summary class="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-gray-900 dark:text-white">
                {{ q.q }}
                <ChevronDownIcon class="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p class="pb-5 pr-8 text-[15px] leading-relaxed text-gray-600 dark:text-gray-400">{{ q.a }}</p>
            </details>
          </div>
        </div>
      </section>

      <!-- CTA final -->
      <section class="px-5 pb-20 sm:px-6 lg:pb-28">
        <div class="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-brand-700 px-6 py-14 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
          <div class="max-w-xl">
            <h2 class="text-3xl font-semibold leading-tight sm:text-[40px]">Ordena tu agenda desde hoy</h2>
            <p class="mt-3 text-[17px] text-brand-100">
              Crea tu cuenta en minutos. ¿Quieres verlo antes? Te hacemos una demostración por WhatsApp.
            </p>
          </div>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <router-link to="/register?plan=CITAS_PANEL" class="ui-btn min-h-12 bg-white px-6 text-[15px] text-brand-700 hover:bg-brand-50">
              Crear mi cuenta
            </router-link>
            <a
              :href="BUSINESS.whatsappLink"
              target="_blank"
              rel="noopener"
              class="ui-btn min-h-12 px-6 text-[15px] text-white ring-1 ring-inset ring-white/50 hover:bg-white/10"
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>

    <MarketingFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CheckIcon,
  ChevronDownIcon,
  CalendarCheckIcon,
  MessageCircleIcon,
  ContactIcon,
  CreditCardIcon,
  MapPin,
  PackageIcon,
  ReceiptIcon,
  TagsIcon,
  UsersIcon,
  ShieldCheckIcon,
  BadgeCheckIcon,
  SmartphoneIcon,
} from 'lucide-vue-next'
import MarketingHeader from '@/components/marketing/MarketingHeader.vue'
import MarketingFooter from '@/components/marketing/MarketingFooter.vue'
import Badge from '@/components/ui/Badge.vue'
import { planInfo, shownPrice } from '@/lib/plans'
import type { PlanType } from '@/lib/entitlements'
import { BUSINESS } from '@/lib/business'
import { listPublicTestimonials, SOURCE_LABEL, type PublicTestimonial } from '@/services/testimonials'
import { StarIcon } from 'lucide-vue-next'

/** Testimonios aprobados en /platform/testimonios. Si falla la carga, la sección no aparece. */
const testimonios = ref<PublicTestimonial[]>([])
onMounted(async () => {
  try {
    testimonios.value = await listPublicTestimonials()
  } catch {
    testimonios.value = []
  }
})

/** Home pública: el plan Citas va primero porque es la oferta de entrada (sin plan Marca). */
const PLAN_ORDER: PlanType[] = ['CITAS_PANEL', 'CITAS_IA', 'NEGOCIO', 'CITAS_RECORDATORIOS']
const displayPlans = computed(() =>
  PLAN_ORDER.map((t) => planInfo(t)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
)
const citasPrice = planInfo('CITAS_PANEL')?.priceMxn ?? 349

/** Datos de ejemplo del mockup (ficticios). */
const citas = [
  { hora: '10:00', nombre: 'Ana López', servicio: 'Corte y peinado', estado: 'Confirmada', tono: 'ok' },
  { hora: '11:30', nombre: 'Luis Ramos', servicio: 'Barba', estado: 'Recordatorio enviado', tono: 'wa' },
  { hora: '13:00', nombre: 'María Soto', servicio: 'Uñas acrílicas', estado: 'Confirmada', tono: 'ok' },
]

/** Solo hechos que ya están en el sitio (sin testimonios ni cifras inventadas). */
const confianza = [
  { icon: MapPin, text: 'Hecho en Durango, México' },
  { icon: BadgeCheckIcon, text: 'WhatsApp Business oficial de Meta' },
  { icon: CreditCardIcon, text: 'Pago mensual, sin plazos forzosos' },
  { icon: ShieldCheckIcon, text: 'Datos tratados conforme a la LFPDPPP' },
]

const antesDespues = [
  { antes: 'Libreta de citas', despues: 'Agenda en línea con link de reservas' },
  { antes: 'Mensajes sueltos para recordar', despues: 'Recordatorio automático por WhatsApp' },
  { antes: 'Contactos en hojas de cálculo', despues: 'Directorio de clientes en tu panel' },
  { antes: 'Solo en la computadora', despues: 'Desde tu celular o computadora' },
]

const funciones = [
  {
    icon: CalendarCheckIcon,
    title: 'Agenda',
    text: 'Define servicios, precios y horarios, y comparte tu link de reservas en redes.',
    detalles: ['Tus clientes eligen servicio, día y hora', 'Vista del día o de la semana', 'Confirma, completa o cancela en un toque'],
  },
  {
    icon: MessageCircleIcon,
    title: 'Recordatorios por WhatsApp',
    text: 'Reduce las faltas avisando a tus clientes antes de su cita.',
    detalles: ['Se envían solos antes de cada cita', 'Desde el número de COSDI o el de tu negocio', 'Envíate una prueba cuando quieras'],
    wa: true,
  },
  {
    icon: ContactIcon,
    title: 'Clientes',
    text: 'Ten el nombre y el WhatsApp de cada cliente a la mano.',
    detalles: ['Busca por nombre o teléfono', 'Escríbeles por WhatsApp desde su ficha'],
  },
  {
    icon: CreditCardIcon,
    title: 'Pagos y suscripción',
    text: 'Paga tu plan con tarjeta, mes a mes, y adminístralo desde tu panel.',
    detalles: ['IVA incluido en el precio', 'Cambia tu tarjeta o consulta recibos', 'Cancela desde tu panel cuando quieras'],
  },
]

const negocio = [
  { icon: PackageIcon, title: 'Inventario y stock' },
  { icon: ReceiptIcon, title: 'Caja y ventas' },
  { icon: TagsIcon, title: 'Marcas y consignaciones' },
  { icon: UsersIcon, title: 'Equipo y permisos' },
  { icon: SmartphoneIcon, title: 'Tickets por WhatsApp' },
]

const pasos = [
  { title: 'Crea tu cuenta', text: 'Regístrate con tu correo y elige el plan de tu negocio.' },
  { title: 'Configura tu agenda', text: 'Da de alta tus servicios y horarios; te ayudamos si lo necesitas.' },
  { title: 'Comparte tu link', text: 'Tus clientes agendan solos y reciben su recordatorio por WhatsApp.' },
]

const faq = [
  { q: '¿Qué es COSDI?', a: 'COSDI (Consultoría y Soluciones Digitales) es un software en línea para administrar tu agenda de citas con recordatorios por WhatsApp y, si lo necesitas, inventario, ventas y caja. Se usa desde el navegador, sin instalar nada.' },
  { q: '¿Pueden crear una app o software para mi negocio?', a: 'Sí. Si necesitas una app, un sistema o una automatización a la medida, escríbenos a contacto@cosdi.mx contándonos tu idea y te respondemos con una propuesta.' },
  { q: '¿Cuánto cuesta?', a: `El plan Citas cuesta $${citasPrice} MXN al mes con IVA incluido. Se paga mes a mes y puedes cancelar cuando quieras. Si tienes un código de prueba o de descuento, escríbelo al elegir tu plan.` },
  { q: '¿Me ayudan a configurarlo?', a: 'Sí. Te ayudamos a dar de alta tus servicios y horarios y a dejar listos tu link de citas y los recordatorios. Escríbenos por WhatsApp.' },
  { q: '¿Puedo probarlo antes de pagar?', a: 'Sí. Te hacemos una demostración por WhatsApp o en tu negocio, y si tienes un código de prueba gratis lo usas sin tarjeta. Sin código, el plan se activa al pagar tu primer mes y puedes cancelar cuando quieras.' },
  { q: '¿Cómo protegen mis datos?', a: 'Tratamos tu información conforme a la LFPDPPP. No vendemos tus datos; puedes leer los detalles en el aviso de privacidad y ejercer tus derechos ARCO escribiendo a privacidad@cosdi.mx.' },
  { q: '¿Cómo funcionan los recordatorios de WhatsApp?', a: 'COSDI usa la plataforma oficial WhatsApp Business de Meta para enviar avisos de cita a tus clientes, siempre con su consentimiento.' },
  { q: '¿Quién está detrás de COSDI?', a: 'COSDI es operado por Joel Andrés Violante Madrid, desde Durango, Durango. Puedes escribirnos a contacto@cosdi.mx.' },
]
</script>
