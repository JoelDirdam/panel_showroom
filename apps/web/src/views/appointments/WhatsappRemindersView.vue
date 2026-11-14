<template>
  <admin-layout>
    <page-breadcrumb page-title="Recordatorios por WhatsApp" />

    <p v-if="loading" class="text-sm text-gray-500">Cargando…</p>
    <p v-else-if="loadError" class="text-sm text-error-500">{{ loadError }}</p>

    <template v-else-if="status">
      <component-card title="Recordatorios automáticos" class-name="mb-6">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <p class="min-w-0 flex-1 text-sm text-gray-600 dark:text-gray-300">
            Cada cliente recibe un WhatsApp unas {{ status.hoursBefore }} horas antes de su cita. No tienes que
            hacer nada: se envían solos para las citas pendientes y confirmadas.
          </p>
          <span :class="['shrink-0 rounded-full px-3 py-1 text-xs font-medium', stateBadge.cls]">
            {{ stateBadge.label }}
          </span>
        </div>

        <div class="mt-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
          <p class="text-gray-500 dark:text-gray-400">Se envían desde</p>
          <p class="mt-0.5 break-words font-medium text-gray-800 dark:text-white">{{ senderLabel }}</p>
        </div>

        <div class="mt-4 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
          <p class="text-gray-500 dark:text-gray-400">Así se ve el mensaje</p>
          <p class="mt-1 text-gray-800 dark:text-gray-100">
            Hola María, te recordamos tu cita en {{ businessName }} (Corte de cabello) el
            <strong>viernes 14 de noviembre a las 10:00 a.m.</strong> Si necesitas cambiarla, responde a este
            mensaje.
          </p>
        </div>

        <label class="mt-4 flex items-center gap-3 text-sm text-gray-800 dark:text-white">
          <input
            type="checkbox"
            class="h-5 w-5 rounded border-gray-300"
            :checked="status.remindersEnabled"
            :disabled="saving"
            @change="toggle(($event.target as HTMLInputElement).checked)"
          />
          Enviar recordatorios a mis clientes
        </label>

        <form class="mt-5 flex flex-col gap-2 sm:flex-row" @submit.prevent="sendTest">
          <input
            v-model="testPhone"
            class="field sm:max-w-xs"
            inputmode="tel"
            placeholder="Tu WhatsApp (10 dígitos)"
            required
          />
          <button class="btn-secondary" :disabled="testing || status.mode === 'none'">
            {{ testing ? 'Enviando…' : 'Enviarme una prueba' }}
          </button>
        </form>
        <p v-if="testMessage" :class="['mt-2 text-sm', testOk ? 'text-success-600' : 'text-error-500']">
          {{ testMessage }}
        </p>
      </component-card>

      <component-card title="Usar el número de mi negocio (opcional)">
        <template v-if="status.own.connected">
          <div class="rounded-lg bg-gray-50 p-3 text-sm dark:bg-white/[0.03]">
            <p class="break-words font-medium text-gray-800 dark:text-white">
              {{ status.own.verifiedName || 'Número conectado' }}
              <span v-if="status.own.displayPhoneNumber" class="font-normal text-gray-500">
                · {{ status.own.displayPhoneNumber }}
              </span>
            </p>
            <p class="mt-1 text-gray-600 dark:text-gray-300">{{ templateText }}</p>
          </div>
          <div class="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              v-if="status.own.templateStatus !== 'APPROVED'"
              class="btn-secondary"
              :disabled="saving"
              @click="refresh"
            >
              Revisar aprobación de Meta
            </button>
            <button class="btn-secondary text-error-600" :disabled="saving" @click="disconnect">
              Desconectar mi número
            </button>
          </div>
        </template>

        <template v-else>
          <p class="text-sm text-gray-600 dark:text-gray-300">
            Si ya tienes una cuenta de WhatsApp Business en Meta, tus clientes pueden recibir los recordatorios
            desde el número de tu negocio. Si no la tienes, no hagas nada: se envían desde el número de COSDI.
          </p>
          <ol class="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
            <li>Entra a business.facebook.com y abre tu cuenta de WhatsApp Business.</li>
            <li>Copia el identificador del número de teléfono y el identificador de la cuenta.</li>
            <li>Crea un usuario del sistema con permiso de mensajes y genera su token permanente.</li>
            <li>Pega los tres datos aquí. Nosotros pedimos a Meta la plantilla del recordatorio.</li>
          </ol>
          <form class="mt-4 grid gap-3" @submit.prevent="connect">
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Identificador del número de teléfono
              <input v-model.trim="form.phoneNumberId" class="field mt-1" inputmode="numeric" required />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Identificador de la cuenta de WhatsApp Business
              <input v-model.trim="form.wabaId" class="field mt-1" inputmode="numeric" required />
            </label>
            <label class="text-sm text-gray-700 dark:text-gray-200">
              Token de acceso permanente
              <input v-model.trim="form.accessToken" class="field mt-1" type="password" autocomplete="off" required />
            </label>
            <button class="btn-primary sm:w-fit" :disabled="saving">
              {{ saving ? 'Conectando…' : 'Conectar mi número' }}
            </button>
          </form>
        </template>
        <p v-if="ownError" class="mt-3 break-words text-sm text-error-500">{{ ownError }}</p>
      </component-card>
    </template>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
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

const businessName = computed(() => auth.user?.tenant?.name || 'tu negocio')

const working = computed(
  () => Boolean(status.value?.schedulerEnabled && status.value.remindersEnabled && status.value.mode !== 'none'),
)

const stateBadge = computed(() => {
  if (working.value)
    return { label: 'Activos', cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' }
  if (status.value && !status.value.remindersEnabled)
    return { label: 'Apagados', cls: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300' }
  return { label: 'Aún no disponibles', cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' }
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

onMounted(async () => {
  try {
    status.value = await fetchRemindersStatus()
  } catch (e) {
    loadError.value = extractApiError(e, 'No se pudo cargar la configuración')
  } finally {
    loading.value = false
  }
})

async function run(action: () => Promise<RemindersStatus>, fallback: string) {
  ownError.value = null
  saving.value = true
  try {
    status.value = await action()
  } catch (e) {
    ownError.value = extractApiError(e, fallback)
  } finally {
    saving.value = false
  }
}

const toggle = (enabled: boolean) => run(() => setRemindersEnabled(enabled), 'No se pudo guardar')
const refresh = () => run(refreshWhatsappTemplate, 'No se pudo consultar a Meta')
const disconnect = () => run(disconnectWhatsappNumber, 'No se pudo desconectar')

async function connect() {
  await run(() => connectWhatsappNumber({ ...form }), 'No se pudo conectar el número')
  if (!ownError.value) form.accessToken = ''
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

<style scoped>
@reference "../../assets/main.css";

.field {
  @apply w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white;
}
.btn-primary {
  @apply rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50;
}
.btn-secondary {
  @apply rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5;
}
</style>
