<template>
  <platform-layout>
    <PageHeader
      title="Redes sociales"
      description="Guía para abrir las cuentas de COSDI, publicar lo primero y juntar testimonios que den confianza a nuevos negocios."
    />

    <!-- Avance -->
    <section class="ui-card mb-6 p-5" aria-labelledby="avance-titulo">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="avance-titulo" class="text-base font-semibold text-gray-900 dark:text-white">Tu avance</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">{{ doneCount }} de {{ allTasks.length }} pasos</p>
      </div>
      <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10" aria-hidden="true">
        <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: `${(doneCount / allTasks.length) * 100}%` }" />
      </div>
      <p class="mt-2 text-xs text-gray-500">Se guarda en este navegador.</p>
    </section>

    <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <!-- Índice -->
      <nav class="hidden lg:sticky lg:top-36 lg:block" aria-label="Secciones de la guía">
        <ol class="space-y-1 text-sm">
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`" class="flex min-h-10 items-center gap-2 rounded-lg px-3 text-gray-700 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5" @click.prevent="goTo(s.id)">
              <component :is="s.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />{{ s.title }}
            </a>
          </li>
        </ol>
      </nav>

      <div class="min-w-0 space-y-6">
        <!-- Pasos por red -->
        <section v-for="s in sections.filter((x) => x.tasks)" :id="s.id" :key="s.id" class="ui-card scroll-mt-36 p-5 sm:p-6" :aria-labelledby="`${s.id}-t`">
          <div class="flex items-start gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
              <component :is="s.icon" class="h-5 w-5" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <h2 :id="`${s.id}-t`" class="text-lg font-semibold text-gray-900 dark:text-white">{{ s.title }}</h2>
              <p class="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{{ s.why }}</p>
            </div>
          </div>

          <ol class="mt-4 space-y-1">
            <li v-for="t in s.tasks" :key="t.id">
              <label class="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl px-2 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.03]">
                <input type="checkbox" class="mt-1 h-5 w-5 shrink-0 accent-brand-600" :checked="done.has(t.id)" @change="toggle(t.id)" />
                <span class="min-w-0 text-sm">
                  <span :class="['font-medium', done.has(t.id) ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white']">{{ t.label }}</span>
                  <span v-if="t.detail" class="mt-0.5 block text-gray-600 dark:text-gray-400">{{ t.detail }}</span>
                </span>
              </label>
            </li>
          </ol>

          <div v-if="s.bio" class="mt-4 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-semibold text-gray-900 dark:text-white">Texto sugerido para el perfil</p>
              <p :class="['text-xs tabular-nums', s.bio.length > (s.bioMax ?? 999) ? 'text-error-600' : 'text-gray-500']">
                {{ s.bio.length }}/{{ s.bioMax }} caracteres
              </p>
            </div>
            <p class="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{{ s.bio }}</p>
            <UiButton size="sm" variant="secondary" class="mt-3" @click="copy(s.bio, 'Texto del perfil copiado')">
              <template #icon><Copy class="h-4 w-4" aria-hidden="true" /></template>
              Copiar texto
            </UiButton>
          </div>
        </section>

        <!-- Primeras publicaciones -->
        <section id="primeras" class="ui-card scroll-mt-36 p-5 sm:p-6" aria-labelledby="primeras-t">
          <h2 id="primeras-t" class="text-lg font-semibold text-gray-900 dark:text-white">Tus primeras 9 publicaciones</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Llenan la primera cuadrícula de Instagram y responden lo que un dueño de estética se pregunta antes de pagar:
            qué es, cuánto cuesta, quién está detrás y si a otros les funciona. Publica el mismo contenido en Facebook y
            TikTok (en TikTok, solo los videos).
          </p>
          <ol class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <li v-for="(p, i) in posts" :key="p.title" class="flex flex-col rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div class="flex items-center justify-between gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white dark:bg-white dark:text-gray-900">{{ i + 1 }}</span>
                <Badge color="light" size="sm">{{ p.format }}</Badge>
              </div>
              <h3 class="mt-3 font-semibold text-gray-900 dark:text-white">{{ p.title }}</h3>
              <p class="mt-1 flex-1 text-sm text-gray-600 dark:text-gray-400">{{ p.idea }}</p>
              <p class="mt-3 rounded-lg bg-gray-50 p-2.5 text-sm italic text-gray-800 dark:bg-white/[0.04] dark:text-gray-200">“{{ p.caption }}”</p>
              <UiButton size="sm" variant="ghost" class="mt-2 self-start" @click="copy(p.caption, 'Texto copiado')">
                <template #icon><Copy class="h-4 w-4" aria-hidden="true" /></template>
                Copiar texto
              </UiButton>
            </li>
          </ol>
        </section>

        <!-- Calendario -->
        <section id="calendario" class="ui-card scroll-mt-36 p-5 sm:p-6" aria-labelledby="calendario-t">
          <h2 id="calendario-t" class="text-lg font-semibold text-gray-900 dark:text-white">Calendario del primer mes</h2>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Tres publicaciones por semana y una historia diaria. Publicar seguido pesa más que publicar mucho de golpe.
          </p>
          <div class="mt-4 overflow-x-auto">
            <table class="ui-table min-w-[560px]">
              <thead>
                <tr><th scope="col">Semana</th><th scope="col">Lunes</th><th scope="col">Miércoles</th><th scope="col">Viernes</th><th scope="col">Historias</th></tr>
              </thead>
              <tbody>
                <tr v-for="w in calendar" :key="w.week">
                  <th scope="row" class="font-semibold">{{ w.week }}</th>
                  <td v-for="(c, i) in w.days" :key="i">{{ c }}</td>
                  <td>{{ w.stories }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- Testimonios -->
        <section id="testimonios" class="ui-card scroll-mt-36 p-5 sm:p-6" aria-labelledby="testimonios-t">
          <h2 id="testimonios-t" class="text-lg font-semibold text-gray-900 dark:text-white">Cómo juntar testimonios</h2>
          <ul class="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
            <li v-for="tip in testimonialTips" :key="tip.title" class="flex gap-3">
              <component :is="tip.icon" class="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span><strong class="text-gray-900 dark:text-white">{{ tip.title }}</strong> {{ tip.text }}</span>
            </li>
          </ul>
          <div class="mt-5 rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">Mensaje para pedir una opinión por WhatsApp</p>
            <p class="mt-2 text-sm text-gray-800 dark:text-gray-200">{{ askMessage }}</p>
            <UiButton size="sm" variant="secondary" class="mt-3" @click="copy(askMessage, 'Mensaje copiado')">
              <template #icon><Copy class="h-4 w-4" aria-hidden="true" /></template>
              Copiar mensaje
            </UiButton>
          </div>

          <h3 class="mt-6 text-base font-semibold text-gray-900 dark:text-white">¿Se pueden pasar solos de las redes a la landing?</h3>
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            No de forma confiable. Facebook, Instagram y TikTok no dejan copiar comentarios o reseñas a otro sitio sin una
            app aprobada por cada red, y aunque se pudiera, un comentario público no es permiso para usar el nombre de alguien en tu publicidad.
            Por eso COSDI lo resuelve así:
          </p>
          <ul class="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li class="flex gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />El panel le pide la opinión a cada negocio que ya lleva 5 citas atendidas, con su autorización por escrito.</li>
            <li class="flex gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />Tú la apruebas en <router-link to="/platform/testimonios" class="font-semibold text-brand-600 underline">Testimonios</router-link> y aparece sola en cosdi.mx.</li>
            <li class="flex gap-2"><Check class="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden="true" />Si alguien te deja una reseña en redes, pídele permiso y agrégala ahí mismo con el enlace a la publicación.</li>
          </ul>
        </section>
      </div>
    </div>
  </platform-layout>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import {
  CalendarDays,
  Camera,
  Check,
  Copy,
  Facebook,
  Heart,
  Images,
  MapPin,
  MessageCircle,
  Music2,
  Ban,
  Clock,
  Video,
  Wrench,
} from 'lucide-vue-next'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiButton from '@/components/ui/UiButton.vue'
import Badge from '@/components/ui/Badge.vue'
import { useToast } from '@/composables/useToast'
import { BUSINESS } from '@/lib/business'
import { planInfo } from '@/lib/plans'

const toast = useToast()
const price = planInfo('CITAS_PANEL')?.priceMxn ?? 349

interface Task {
  id: string
  label: string
  detail?: string
}
interface Section {
  id: string
  title: string
  icon: Component
  why?: string
  tasks?: Task[]
  bio?: string
  bioMax?: number
}

const sections: Section[] = [
  {
    id: 'preparar',
    title: 'Antes de empezar',
    icon: Wrench,
    why: 'Media hora una sola vez. Con esto, abrir cada cuenta toma cinco minutos y todas se ven iguales.',
    tasks: [
      { id: 'p-nombre', label: 'Elige un usuario que esté libre en las tres redes', detail: 'Ejemplos: @cosdimx o @cosdi.mx. Usa el mismo en todas para que te encuentren.' },
      { id: 'p-logo', label: 'Prepara el logo cuadrado (1080 × 1080 px)', detail: 'Que se lea bien en círculo pequeño: solo las letras COSDI, sin texto extra.' },
      { id: 'p-portada', label: 'Prepara una portada para Facebook', detail: 'Una captura del panel en el celular con el texto “Tu agenda en línea con recordatorios por WhatsApp”.' },
      { id: 'p-datos', label: 'Ten a la mano los datos de contacto', detail: `${BUSINESS.site} · WhatsApp ${BUSINESS.phone} · ${BUSINESS.email} · ${BUSINESS.city}, ${BUSINESS.state}.` },
      { id: 'p-correo', label: 'Usa el correo de COSDI para abrir las cuentas', detail: 'Así no quedan atadas a tu correo personal y puedes dar acceso a alguien más después.' },
    ],
  },
  {
    id: 'facebook',
    title: 'Facebook',
    icon: Facebook,
    why: 'Es donde más dueños de estéticas y barberías en México buscan proveedores y leen recomendaciones.',
    tasks: [
      { id: 'f-crear', label: 'Crea una página desde tu perfil: Menú › Páginas › Crear página', detail: 'Nombre: COSDI. Categoría: Software o Empresa de software.' },
      { id: 'f-datos', label: 'Llena la información: sitio web, WhatsApp, correo y ciudad', detail: 'Marca que atiendes en línea (no tienes local abierto al público).' },
      { id: 'f-boton', label: 'Agrega el botón “Enviar mensaje de WhatsApp”', detail: 'Desde Editar página › Agregar botón. Lleva directo a tu chat.' },
      { id: 'f-resenas', label: 'Activa las recomendaciones (reseñas)', detail: 'En Configuración de la página › Privacidad. Son prueba social que otros negocios leen.' },
      { id: 'f-suite', label: 'Instala Meta Business Suite en tu celular', detail: 'Desde ahí programas la misma publicación para Facebook e Instagram a la vez.' },
    ],
    bio: `Agenda en línea con recordatorios por WhatsApp para estéticas, barberías y spas. Desde $${price} al mes. Hecho en Durango.`,
    bioMax: 255,
  },
  {
    id: 'instagram',
    title: 'Instagram',
    icon: Camera,
    why: 'Tus clientes (estéticas, uñas, barberías) viven aquí. Es tu vitrina.',
    tasks: [
      { id: 'i-crear', label: 'Crea la cuenta y cámbiala a profesional › Empresa', detail: 'Ajustes › Tipo de cuenta y herramientas › Cambiar a cuenta profesional.' },
      { id: 'i-vincular', label: 'Vincúlala con la página de Facebook', detail: 'En el Centro de cuentas de Meta. Así compartes publicaciones y mensajes en un solo lugar.' },
      { id: 'i-bio', label: 'Pega la bio y el enlace a cosdi.mx', detail: 'Agrega también el botón de contacto por WhatsApp.' },
      { id: 'i-destacadas', label: 'Crea 4 historias destacadas', detail: 'Cómo funciona · Precio · Clientes · Preguntas. Reúsalas de tus primeras historias.' },
    ],
    bio: `📅 Agenda en línea para tu estética o barbería
💬 Recordatorios automáticos por WhatsApp
💲 Desde $${price}/mes, IVA incluido
📍 Hecho en Durango`,
    bioMax: 150,
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    icon: Music2,
    why: 'Videos cortos que enseñan el panel en acción llegan a negocios que todavía no te siguen.',
    tasks: [
      { id: 't-crear', label: 'Crea la cuenta con el mismo usuario', detail: 'Usa el correo de COSDI.' },
      { id: 't-empresa', label: 'Cámbiala a cuenta de empresa', detail: 'Perfil › Menú › Ajustes y privacidad › Cuenta › Cambiar a cuenta de empresa.' },
      { id: 't-bio', label: 'Pega la bio corta', detail: 'Agrega el enlace a cosdi.mx cuando TikTok te dé la opción (algunas cuentas la piden con un mínimo de seguidores).' },
      { id: 't-video', label: 'Graba tu primer video con la pantalla del celular', detail: 'Así agenda un cliente en 20 segundos. Vertical, con texto en pantalla y sin música con derechos.' },
    ],
    bio: 'Agenda en línea + recordatorios por WhatsApp para estéticas 💇',
    bioMax: 80,
  },
  {
    id: 'google',
    title: 'Perfil de Google',
    icon: MapPin,
    why: 'Las reseñas de Google son de las que más confianza dan, y te ayudan a aparecer cuando alguien busca “agenda para estética”.',
    tasks: [
      { id: 'g-crear', label: 'Crea el Perfil de Negocio en google.com/business', detail: 'Elige “Negocio de servicios sin local”: así no se publica tu domicilio.' },
      { id: 'g-verificar', label: 'Verifícalo', detail: 'Google te pide un video o un código. Puede tardar unos días.' },
      { id: 'g-link', label: 'Copia tu enlace para pedir reseñas', detail: 'Lo encuentras en el perfil como “Pedir reseñas”. Úsalo en el mensaje de abajo.' },
    ],
  },
  { id: 'primeras', title: 'Primeras publicaciones', icon: Images },
  { id: 'calendario', title: 'Calendario', icon: CalendarDays },
  { id: 'testimonios', title: 'Testimonios', icon: Heart },
]

const posts = [
  { format: 'Reel', title: 'Quiénes somos', idea: 'Tú a cámara, 15 segundos: quién eres, desde dónde y qué problema resuelve COSDI.', caption: 'Hola, soy Joel, de Durango. Hice COSDI para que las estéticas dejen de perder citas por olvidos. 👇' },
  { format: 'Carrusel', title: 'El problema', idea: 'Tres láminas: la libreta, los mensajes sueltos, la clienta que no llegó. Última lámina: hay otra forma.', caption: '¿Cuántas citas se te cayeron esta semana porque alguien olvidó? No es mala suerte, es falta de recordatorio.' },
  { format: 'Video', title: 'Así agenda tu cliente', idea: 'Grabación de pantalla: abrir el link, elegir servicio, día y hora. Menos de 20 segundos.', caption: 'Tu cliente agenda solo, a cualquier hora, sin escribirte. Así se ve tu link de reservas.' },
  { format: 'Imagen', title: 'El recordatorio', idea: 'Captura del mensaje de WhatsApp que recibe el cliente un día antes, con los botones para confirmar.', caption: 'Un día antes, tu cliente recibe esto por WhatsApp. Confirma con un toque.' },
  { format: 'Imagen', title: 'Precio claro', idea: 'Una sola cifra grande y lo que incluye. Sin letras chiquitas.', caption: `$${price} al mes con IVA incluido. Sin plazos forzosos: cancelas desde tu panel cuando quieras.` },
  { format: 'Reel', title: 'Detrás de COSDI', idea: 'Tú trabajando, explicando por qué lo hiciste. Ver una cara real da confianza.', caption: 'Detrás de COSDI hay una persona en Durango que te contesta por WhatsApp. 👋' },
  { format: 'Carrusel', title: 'Pon tu link en la bio', idea: 'Paso a paso con capturas de cómo poner el link de reservas en Instagram y en WhatsApp Business.', caption: 'Guarda este post: así pones tu link de citas en tu bio para que agenden solas.' },
  { format: 'Imagen', title: 'Primer testimonio', idea: 'La opinión de un negocio real, con su permiso, con foto de su local o logo.', caption: '“Desde que uso los recordatorios casi nadie falta.” Gracias por confiar en COSDI. 💜' },
  { format: 'Carrusel', title: 'Preguntas frecuentes', idea: '¿Necesito instalar algo? ¿Puedo cancelar? ¿Me ayudan a configurarlo? Una pregunta por lámina.', caption: 'Las 5 preguntas que más nos hacen antes de empezar. ¿Tienes otra? Escríbenos.' },
]

const calendar = [
  { week: 'Semana 1', days: ['Quiénes somos', 'El problema', 'Así agenda tu cliente'], stories: 'Encuesta: ¿usas libreta o WhatsApp para tus citas?' },
  { week: 'Semana 2', days: ['El recordatorio', 'Precio claro', 'Detrás de COSDI'], stories: 'Muestra tu día: respondiendo dudas, configurando un negocio' },
  { week: 'Semana 3', days: ['Pon tu link en la bio', 'Preguntas frecuentes', 'Video: configurar servicios en 1 minuto'], stories: 'Caja de preguntas sobre agenda y faltas' },
  { week: 'Semana 4', days: ['Primer testimonio', 'Antes y después de usar COSDI', 'Invitación a una demo por WhatsApp'], stories: 'Comparte las publicaciones de tus clientes que te etiqueten' },
]

const testimonialTips = [
  { icon: Clock, title: 'Pídela en el momento correcto.', text: 'Después de 2 o 3 semanas de uso, cuando ya vieron que sus clientes llegan a tiempo.' },
  { icon: MessageCircle, title: 'Que sea fácil.', text: 'Un mensaje corto con el enlace directo. Mientras menos pasos, más respuestas.' },
  { icon: Video, title: 'Pide un video de 15 segundos.', text: 'Un video de la dueña o el dueño en su local convence más que un texto.' },
  { icon: Check, title: 'Siempre con permiso.', text: 'Pregunta si puedes publicar su nombre y el de su negocio, y guarda esa respuesta.' },
  { icon: Ban, title: 'Nunca inventes reseñas.', text: 'Además de dañar la confianza, la publicidad engañosa está prohibida por la Ley Federal de Protección al Consumidor.' },
]

const askMessage =
  '¡Hola! Soy Joel de COSDI. Gracias por usar la agenda estas semanas. ¿Me regalas dos líneas sobre cómo te ha ido? Puedes dejarla en tu panel (Inicio › Dejar mi opinión) o en Google. Con tu permiso la compartimos para que otros negocios nos conozcan. 🙏'

/* ---------- Avance ---------- */
const KEY = 'cosdi:guia-redes'
const done = ref<Set<string>>(new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[]))
const allTasks = sections.flatMap((s) => s.tasks ?? [])
const doneCount = computed(() => allTasks.filter((t) => done.value.has(t.id)).length)

function toggle(id: string) {
  const next = new Set(done.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  done.value = next
  localStorage.setItem(KEY, JSON.stringify([...next]))
}

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function copy(text: string, title: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(title)
  } catch {
    toast.error('No se pudo copiar', 'Selecciona el texto y cópialo a mano.')
  }
}
</script>
