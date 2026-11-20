<template>
  <div class="min-h-screen bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100">
    <MarketingHeader />

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-gradient-to-b from-brand-50 via-white to-white dark:from-brand-500/10 dark:via-gray-900 dark:to-gray-900"
      />
      <div class="relative mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:pt-24">
        <div>
          <span
            class="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-400 dark:ring-brand-500/30"
          >
            Hecho en Durango, México
          </span>
          <h1 class="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Tu agenda en línea con recordatorios por WhatsApp
          </h1>
          <p class="mt-5 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-gray-400">
            Para estéticas, barberías, consultorios, spas y cualquier negocio que trabaja con citas. Tus clientes
            agendan desde un link, tú ves todo en un panel y COSDI les recuerda su cita por WhatsApp para que no falten.
          </p>
          <p class="mt-4 text-base font-semibold">
            Plan Citas desde <span class="text-brand-500">${{ citasPrice }} MXN al mes</span>
            <span class="text-sm font-normal text-gray-500 dark:text-gray-400"> · IVA incluido</span>
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <router-link
              to="/register?plan=CITAS_PANEL"
              class="ui-btn ui-btn-primary"
            >
              Crear mi cuenta
            </router-link>
            <a
              :href="BUSINESS.whatsappLink"
              target="_blank"
              rel="noopener"
              class="rounded-lg px-6 py-3.5 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/5"
            >
              Pedir una demostración
            </a>
          </div>
          <p class="mt-4 text-xs text-gray-500 dark:text-gray-500">Pago mensual · Sin plazos forzosos · Cancela cuando quieras</p>
        </div>

        <!-- Mockup del panel -->
        <div class="relative" aria-hidden="true">
          <div class="absolute -inset-4 rounded-[2rem] bg-brand-500/10 blur-2xl" />
          <div
            class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <span class="h-2.5 w-2.5 rounded-full bg-error-400" />
              <span class="h-2.5 w-2.5 rounded-full bg-warning-400" />
              <span class="h-2.5 w-2.5 rounded-full bg-success-400" />
              <span class="ml-3 text-xs text-gray-400">cosdi.mx / panel</span>
            </div>
            <div class="grid grid-cols-3 gap-3 p-4">
              <div v-for="s in stats" :key="s.label" class="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ s.label }}</p>
                <p class="mt-1 text-lg font-bold">{{ s.value }}</p>
              </div>
            </div>
            <div class="px-4 pb-4">
              <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">Citas de hoy</p>
              <ul class="space-y-2">
                <li
                  v-for="c in citas"
                  :key="c.hora"
                  class="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2.5 dark:border-gray-800"
                >
                  <div class="flex items-center gap-3">
                    <span class="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">{{ c.hora }}</span>
                    <span class="text-sm">{{ c.nombre }}</span>
                  </div>
                  <span class="text-xs text-success-600 dark:text-success-500">{{ c.estado }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Qué es -->
    <section id="que-es" class="scroll-mt-20 border-y border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-950">
      <div class="mx-auto max-w-5xl px-6 text-center">
        <p class="text-sm font-semibold uppercase tracking-wider text-brand-500">Qué es COSDI</p>
        <h2 class="mt-3 text-3xl font-bold sm:text-4xl">Un solo sistema para el día a día de tu negocio</h2>
        <p class="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-400">
          COSDI es un software en línea para pequeños y medianos negocios en México. Sustituye la libreta de citas,
          las hojas de cálculo y los mensajes sueltos por un panel claro, accesible desde tu celular o computadora.
          Empieza con tu agenda y, si vendes productos, suma inventario, ventas y caja con el plan Negocio.
        </p>
        <div class="mt-12 grid gap-6 text-left sm:grid-cols-3">
          <div v-for="p in pilares" :key="p.title" class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
              <component :is="p.icon" class="h-5 w-5" />
            </div>
            <h3 class="mt-4 text-base font-semibold">{{ p.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ p.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Funciones -->
    <section id="funciones" class="scroll-mt-20 py-20">
      <div class="mx-auto max-w-7xl px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wider text-brand-500">Funciones</p>
          <h2 class="mt-3 text-3xl font-bold sm:text-4xl">Todo lo que necesitas, sin complicarte</h2>
        </div>
        <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="f in funciones" :key="f.title" class="rounded-2xl border border-gray-200 p-6 transition hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:hover:border-brand-500/40">
            <component :is="f.icon" class="h-6 w-6 text-brand-500" />
            <h3 class="mt-4 text-base font-semibold">{{ f.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ f.text }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Cómo funciona -->
    <section class="bg-gray-50 py-20 dark:bg-gray-950">
      <div class="mx-auto max-w-5xl px-6">
        <h2 class="text-center text-3xl font-bold sm:text-4xl">Empieza en tres pasos</h2>
        <ol class="mt-12 grid gap-8 sm:grid-cols-3">
          <li v-for="(s, i) in pasos" :key="s.title" class="text-center">
            <span class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">{{ i + 1 }}</span>
            <h3 class="mt-4 font-semibold">{{ s.title }}</h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ s.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- Planes -->
    <section id="planes" class="scroll-mt-20 py-20">
      <div class="mx-auto max-w-7xl px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-semibold uppercase tracking-wider text-brand-500">Planes</p>
          <h2 class="mt-3 text-3xl font-bold sm:text-4xl">Elige el plan de tu negocio</h2>
          <p class="mt-4 text-gray-500 dark:text-gray-400">
            Pago mensual con IVA incluido. Sin plazos forzosos: cancela cuando quieras.
          </p>
        </div>
        <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="plan in displayPlans"
            :key="plan.type"
            class="relative flex flex-col rounded-2xl border p-6"
            :class="
              plan.available
                ? 'border-brand-300 bg-brand-50/40 shadow-theme-xs dark:border-brand-500/40 dark:bg-brand-500/5'
                : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]'
            "
          >
            <span
              class="absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold text-white"
              :class="plan.available ? 'bg-brand-500' : 'bg-gray-400 dark:bg-gray-600'"
            >
              {{ plan.available ? 'Disponible' : 'Próximamente' }}
            </span>
            <h3 class="mt-2 text-lg font-semibold">Plan {{ plan.name }}</h3>
            <p class="mt-3">
              <template v-if="shownPrice(plan, false)">
                <span class="text-3xl font-bold">${{ shownPrice(plan, false) }}</span>
                <span class="text-sm text-gray-500 dark:text-gray-400"> MXN/mes · IVA incluido</span>
              </template>
              <span v-else class="text-sm font-medium text-gray-500 dark:text-gray-400">Precio al contratar</span>
            </p>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ plan.description }}</p>
            <ul class="mt-5 flex-1 space-y-2.5">
              <li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <CheckIcon class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                {{ feature }}
              </li>
            </ul>
            <router-link
              v-if="plan.available"
              :to="`/register?plan=${plan.type}`"
              class="ui-btn ui-btn-primary mt-6"
            >
              Registrarme
            </router-link>
            <span
              v-else
              class="mt-6 flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-400 ring-1 ring-inset ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
            >
              Próximamente
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="border-t border-gray-100 bg-gray-50 py-20 dark:border-gray-800 dark:bg-gray-950">
      <div class="mx-auto max-w-3xl px-6">
        <h2 class="text-center text-3xl font-bold sm:text-4xl">Preguntas frecuentes</h2>
        <div class="mt-10 space-y-3">
          <details v-for="q in faq" :key="q.q" class="group rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
              {{ q.q }}
              <span class="ml-4 text-brand-500 transition group-open:rotate-45">+</span>
            </summary>
            <p class="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ q.a }}</p>
          </details>
        </div>
      </div>
    </section>

    <!-- CTA final -->
    <section class="py-20">
      <div class="mx-auto max-w-4xl rounded-3xl bg-brand-500 px-8 py-14 text-center text-white shadow-theme-xl">
        <h2 class="text-3xl font-bold">Ordena tu negocio desde hoy</h2>
        <p class="mx-auto mt-3 max-w-xl text-brand-50">Crea tu cuenta en minutos. ¿Quieres verlo antes? Te hacemos una demostración por WhatsApp.</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <router-link to="/register?plan=CITAS_PANEL" class="rounded-lg bg-white px-6 py-3.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
            Crear mi cuenta
          </router-link>
          <a :href="BUSINESS.whatsappLink" target="_blank" rel="noopener" class="rounded-lg px-6 py-3.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/50 hover:bg-white/10">
            Hablar por WhatsApp
          </a>
        </div>
      </div>
    </section>

    <MarketingFooter />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  CheckIcon,
  PackageIcon,
  CalendarCheckIcon,
  MessageCircleIcon,
  StoreIcon,
  ReceiptIcon,
  TagsIcon,
  UsersIcon,
  BarChart3Icon,
  ShieldCheckIcon,
} from 'lucide-vue-next'
import MarketingHeader from '@/components/marketing/MarketingHeader.vue'
import MarketingFooter from '@/components/marketing/MarketingFooter.vue'
import { planInfo, shownPrice } from '@/lib/plans'
import type { PlanType } from '@/lib/entitlements'
import { BUSINESS } from '@/lib/business'

/** Home pública: el plan Citas va primero porque es la oferta de entrada (sin plan Marca). */
const PLAN_ORDER: PlanType[] = ['CITAS_PANEL', 'CITAS_IA', 'NEGOCIO', 'CITAS_RECORDATORIOS']
const displayPlans = computed(() =>
  PLAN_ORDER.map((t) => planInfo(t)).filter((p): p is NonNullable<typeof p> => Boolean(p)),
)
const citasPrice = planInfo('CITAS_PANEL')?.priceMxn ?? 349

const stats = [
  { label: 'Citas hoy', value: '9' },
  { label: 'Esta semana', value: '42' },
  { label: 'Recordatorios', value: '38' },
]
const citas = [
  { hora: '10:00', nombre: 'Ana López · Corte', estado: 'Confirmada' },
  { hora: '11:30', nombre: 'Luis Ramos · Revisión', estado: 'Recordatorio enviado' },
  { hora: '13:00', nombre: 'María Soto · Consulta', estado: 'Confirmada' },
]

const pilares = [
  { icon: CalendarCheckIcon, title: 'Agenda', text: 'Citas en línea con un link para tus clientes y recordatorios automáticos.' },
  { icon: StoreIcon, title: 'Administra', text: 'Marcas, productos y stock siempre al día, con consignaciones y solicitudes de producto.' },
  { icon: ReceiptIcon, title: 'Vende y cobra', text: 'Punto de venta con tickets, caja y cortes para saber cuánto entra cada día.' },
]

const funciones = [
  { icon: CalendarCheckIcon, title: 'Citas en línea', text: 'Define servicios, precios y horarios, y comparte tu link de reservas en redes.' },
  { icon: MessageCircleIcon, title: 'Recordatorios por WhatsApp', text: 'Reduce las faltas avisando a tus clientes antes de su cita.' },
  { icon: TagsIcon, title: 'Marcas y consignaciones', text: 'Registra las marcas que vendes, sus productos y lo que le corresponde a cada una.' },
  { icon: PackageIcon, title: 'Inventario y stock', text: 'Catálogo con importación desde Excel, entradas, salidas y etiquetas con código de barras.' },
  { icon: ReceiptIcon, title: 'Caja y ventas', text: 'Cobra en mostrador, imprime tickets y haz cortes de caja sin hojas de cálculo.' },
  { icon: UsersIcon, title: 'Equipo y permisos', text: 'Da acceso a tus empleados y controla qué puede ver y hacer cada quien.' },
  { icon: BarChart3Icon, title: 'Reportes claros', text: 'Consulta ventas, movimientos de stock y actividad de tu negocio.' },
  { icon: ShieldCheckIcon, title: 'Datos seguros', text: 'Acceso con contraseña cifrada y respaldo en la nube. Consulta nuestro aviso de privacidad.' },
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
