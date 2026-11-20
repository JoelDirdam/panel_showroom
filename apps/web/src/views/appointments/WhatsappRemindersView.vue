<template>
  <admin-layout>
    <PageHeader
      title="Recordatorios por WhatsApp"
      description="Tus clientes reciben un WhatsApp antes de su cita para que no se les olvide. Se envían solos."
    />

    <div v-if="loading" class="grid gap-6 lg:grid-cols-2" aria-busy="true" aria-label="Cargando configuración">
      <div class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
      <div class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
    </div>

    <UiCard v-else-if="loadError">
      <UiEmptyState title="No se pudo cargar la configuración" :description="loadError">
        <template #icon><AlertTriangle class="h-5 w-5" /></template>
        <UiButton variant="secondary" @click="load">Reintentar</UiButton>
      </UiEmptyState>
    </UiCard>

    <div v-else-if="status" class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
        <!-- Estado -->
        <UiCard>
          <div class="flex items-start gap-4">
            <span
              :class="[
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                state.tone === 'on' && 'bg-wa-50 text-wa-700',
                state.tone === 'off' && 'bg-gray-100 text-gray-500 dark:bg-white/5',
                state.tone === 'wait' && 'bg-warning-50 text-warning-700',
              ]"
              aria-hidden="true"
            >
              <BellRing v-if="state.tone === 'on'" class="h-6 w-6" />
              <BellOff v-else-if="state.tone === 'off'" class="h-6 w-6" />
              <Clock v-else class="h-6 w-6" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Recordatorios automáticos</h2>
                <Badge size="sm" :color="state.tone === 'on' ? 'wa' : state.tone === 'off' ? 'light' : 'warning'">
                  {{ state.label }}
                </Badge>
              </div>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ state.text }}</p>
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <UiToggle
              :model-value="status.remindersEnabled"
              :disabled="saving"
              aria-label="Enviar recordatorios a mis clientes"
              @update:model-value="toggle"
            >
              <span class="text-left">
                <span class="block text-[15px] font-semibold text-gray-900 dark:text-white">Enviar recordatorios a mis clientes</span>
                <span class="block text-sm font-normal text-gray-500">
                  {{ status.remindersEnabled ? 'Encendido' : 'Apagado' }} · para citas pendientes y confirmadas
                </span>
              </span>
            </UiToggle>
          </div>

          <dl class="mt-4 grid gap-3 sm:grid-cols-2">
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <dt class="text-[13px] text-gray-500">Cuándo se envían</dt>
              <dd class="mt-0.5 font-semibold text-gray-900 dark:text-white">{{ status.hoursBefore }} horas antes</dd>
            </div>
            <div class="rounded-xl bg-gray-50 p-4 dark:bg-white/[0.03]">
              <dt class="text-[13px] text-gray-500">Desde qué número</dt>
              <dd class="mt-0.5 break-words font-semibold text-gray-900 dark:text-white">{{ senderLabel }}</dd>
            </div>
          </dl>
        </UiCard>

        <!-- Vista previa -->
        <UiCard title="Así lo verá tu cliente" description="Ejemplo con datos ficticios.">
          <div class="rounded-2xl bg-[#ece5dd] p-4 dark:bg-gray-800">
            <div class="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-[15px] leading-relaxed text-gray-900 shadow-theme-xs dark:bg-gray-900 dark:text-gray-100">
              Hola María, te recordamos tu cita en {{ businessName }} (Corte de cabello) el
              <strong>viernes 14 de noviembre a las 10:00 a.m.</strong> Si necesitas cambiarla, responde a este mensaje.
              <span class="mt-1 block text-right text-[11px] text-gray-500">9:00 a.m.</span>
            </div>
          </div>

          <form class="mt-5" novalidate @submit.prevent="sendTest">
            <UiField
              v-slot="f"
              label="Envíate una prueba"
              help="Escribe tu WhatsApp a 10 dígitos para ver el mensaje real."
              :error="testOk ? undefined : testMessage || undefined"
            >
              <div class="flex flex-col gap-2 sm:flex-row">
                <input
                  :id="f.id"
                  v-model="testPhone"
                  class="ui-input sm:max-w-xs"
                  type="tel"
                  inputmode="tel"
                  autocomplete="tel-national"
                  placeholder="618 123 4567"
                  :aria-describedby="f.describedBy"
                  :aria-invalid="f.invalid"
                />
                <UiButton
                  type="submit"
                  variant="secondary"
                  :loading="testing"
                  loading-text="Enviando…"
                  :disabled="status.mode === 'none' || !testPhone"
                >
                  Enviarme una prueba
                </UiButton>
              </div>
            </UiField>
            <p v-if="testOk && testMessage" class="mt-2 text-sm font-medium text-success-700" role="status">{{ testMessage }}</p>
            <p v-if="status.mode === 'none'" class="ui-help">La prueba estará disponible cuando haya un número para enviar.</p>
          </form>
        </UiCard>
      </div>

      <!-- Número propio -->
      <UiCard
        title="Usar el número de mi negocio"
        description="Opcional. Si no haces nada, los recordatorios salen del número de COSDI."
      >
        <template #actions>
          <Badge v-if="status.own.connected" size="sm" color="wa">Conectado</Badge>
        </template>

        <template v-if="status.own.connected">
          <div class="rounded-xl bg-gray-50 p-4 text-sm dark:bg-white/[0.03]">
            <p class="break-words font-semibold text-gray-900 dark:text-white">
              {{ status.own.verifiedName || 'Número conectado' }}
              <span v-if="status.own.displayPhoneNumber" class="font-normal text-gray-500">
                · {{ status.own.displayPhoneNumber }}
              </span>
            </p>
            <p class="mt-1 text-gray-600 dark:text-gray-300">{{ templateText }}</p>
          </div>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <UiButton v-if="status.own.templateStatus !== 'APPROVED'" variant="secondary" :loading="saving" @click="refresh">
              Revisar aprobación de Meta
            </UiButton>
            <UiButton variant="danger" :disabled="saving" @click="disconnect">Desconectar mi número</UiButton>
          </div>
        </template>

        <details v-else class="group">
          <summary
            class="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:text-white dark:hover:bg-white/5"
          >
            Tengo WhatsApp Business en Meta y quiero conectarlo
            <ChevronDown class="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div class="mt-4 grid gap-6 lg:grid-cols-2">
            <ol class="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <li v-for="(step, i) in steps" :key="i" class="flex gap-3">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15">
                  {{ i + 1 }}
                </span>
                <span class="pt-0.5">{{ step }}</span>
              </li>
            </ol>
            <form class="grid gap-4" novalidate @submit.prevent="connect">
              <UiField v-slot="f" label="Identificador del número de teléfono" required help="En Meta aparece como “Phone number ID”.">
                <input :id="f.id" v-model.trim="form.phoneNumberId" class="ui-input" inputmode="numeric" autocomplete="off" :aria-describedby="f.describedBy" />
              </UiField>
              <UiField v-slot="f" label="Identificador de la cuenta de WhatsApp Business" required help="En Meta aparece como “WhatsApp Business Account ID”.">
                <input :id="f.id" v-model.trim="form.wabaId" class="ui-input" inputmode="numeric" autocomplete="off" :aria-describedby="f.describedBy" />
              </UiField>
              <UiField v-slot="f" label="Token de acceso permanente" required help="El del usuario del sistema con permiso de mensajes.">
                <input :id="f.id" v-model.trim="form.accessToken" class="ui-input" type="password" autocomplete="off" :aria-describedby="f.describedBy" />
              </UiField>
              <UiButton
                type="submit"
                class="sm:w-fit"
                :loading="saving"
                loading-text="Conectando…"
                :disabled="!form.phoneNumberId || !form.wabaId || !form.accessToken"
              >
                Conectar mi número
              </UiButton>
            </form>
          </div>
        </details>
        <p v-if="ownError" class="ui-error mt-3 break-words" role="alert">{{ ownError }}</p>
      </UiCard>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { AlertTriangle, BellOff, BellRing, ChevronDown, Clock } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiToggle from '@/components/ui/UiToggle.vue'
import UiEmptyState from '@/components/ui/UiEmptyState.vue'
import Badge from '@/components/ui/Badge.vue'
import { useToast } from '@/composables/useToast'
import { confirm } from '@/composables/useConfirm'
import { extractApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import {
  connectWhatsappNumber,
  disconnectWhatsappNumber,
  fetchRemindersStatus,
  refreshWhatsappTemplate,
  sendTestReminder,
  setRemindersEnabled,
  type RemindersStatus,
} from '@/services/billing'

const auth = useAuthStore()
const toast = useToast()
const status = ref<RemindersStatus | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const saving = ref(false)
const ownError = ref<string | null>(null)
const testing = ref(false)
const testPhone = ref('')
const testMessage = ref<string | null>(null)
const testOk = ref(false)
const form = reactive({ phoneNumberId: '', wabaId: '', accessToken: '' })

const steps = [
  'Entra a business.facebook.com y abre tu cuenta de WhatsApp Business.',
  'Copia el identificador del número de teléfono y el identificador de la cuenta.',
  'Crea un usuario del sistema con permiso de mensajes y genera su token permanente.',
  'Pega los tres datos aquí. Nosotros pedimos a Meta la plantilla del recordatorio.',
]

const businessName = computed(() => auth.user?.tenant?.name || 'tu negocio')

const working = computed(
  () => Boolean(status.value?.schedulerEnabled && status.value.remindersEnabled && status.value.mode !== 'none'),
)

const state = computed(() => {
  if (working.value)
    return {
      tone: 'on' as const,
      label: 'Activos',
      text: `Cada cliente recibe un WhatsApp unas ${status.value?.hoursBefore} horas antes de su cita. No tienes que hacer nada.`,
    }
  if (status.value && !status.value.remindersEnabled)
    return {
      tone: 'off' as const,
      label: 'Apagados',
      text: 'Tus clientes no recibirán recordatorios. Enciéndelos abajo cuando quieras.',
    }
  return {
    tone: 'wait' as const,
    label: 'Aún no disponibles',
    text: 'Tu preferencia queda guardada. Los recordatorios empezarán a enviarse en cuanto el envío esté listo para tu cuenta.',
  }
})

const senderLabel = computed(() => {
  const s = status.value
  if (!s) return ''
  if (s.mode === 'own') return `${s.own.verifiedName || 'Tu número'} ${s.own.displayPhoneNumber}`.trim()
  if (s.mode === 'platform') return 'El número de WhatsApp de COSDI'
  return 'Sin número disponible por ahora'
})

const templateText = computed(() => {
  const t = status.value?.own.templateStatus
  if (t === 'APPROVED') return 'Meta aprobó tu plantilla. Los recordatorios ya salen desde tu número.'
  if (t === 'REJECTED')
    return 'Meta rechazó la plantilla en tu cuenta. Mientras tanto, los recordatorios salen del número de COSDI.'
  return 'Meta está revisando la plantilla (suele tardar minutos u horas). Mientras tanto, salen del número de COSDI.'
})

async function load() {
  loading.value = true
  loadError.value = null
  try {
    status.value = await fetchRemindersStatus()
  } catch (e) {
    loadError.value = extractApiError(e, 'No se pudo cargar la configuración')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function run(action: () => Promise<RemindersStatus>, fallback: string, done?: string) {
  ownError.value = null
  saving.value = true
  try {
    status.value = await action()
    if (done) toast.success(done)
    return true
  } catch (e) {
    ownError.value = extractApiError(e, fallback)
    toast.error(fallback, ownError.value)
    return false
  } finally {
    saving.value = false
  }
}

const toggle = (enabled: boolean) =>
  run(
    () => setRemindersEnabled(enabled),
    'No se pudo guardar',
    enabled ? 'Recordatorios encendidos' : 'Recordatorios apagados',
  )
const refresh = () => run(refreshWhatsappTemplate, 'No se pudo consultar a Meta', 'Estado de Meta actualizado')

async function disconnect() {
  const ok = await confirm({
    title: '¿Desconectar tu número?',
    description: 'Los recordatorios volverán a salir del número de COSDI.',
    confirmText: 'Desconectar',
    danger: true,
  })
  if (ok) await run(disconnectWhatsappNumber, 'No se pudo desconectar', 'Número desconectado')
}

async function connect() {
  const ok = await run(() => connectWhatsappNumber({ ...form }), 'No se pudo conectar el número', 'Número conectado')
  if (ok) form.accessToken = ''
}

async function sendTest() {
  testMessage.value = null
  testing.value = true
  try {
    await sendTestReminder(testPhone.value)
    testOk.value = true
    testMessage.value = 'Enviado. Revisa tu WhatsApp en unos segundos.'
  } catch (e) {
    testOk.value = false
    testMessage.value = extractApiError(e, 'No se pudo enviar la prueba')
  } finally {
    testing.value = false
  }
}
</script>
