<template>
  <section
    class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
    aria-labelledby="tenant-actions-title"
  >
    <h3 id="tenant-actions-title" class="text-sm font-semibold text-gray-800 dark:text-white">Acciones</h3>

    <div
      v-if="suspended"
      role="status"
      class="mt-3 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-800 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300"
    >
      <strong>Suspendido</strong> desde el {{ formatDateTime(tenant.suspendedAt) }}.
      <span v-if="tenant.suspendedReason">Motivo: {{ tenant.suspendedReason }}</span>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
      <span
        v-if="tenant.isTest"
        class="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400"
      >
        Cuenta de prueba
      </span>
      <span class="flex-1 text-xs text-gray-500 dark:text-gray-400">
        {{
          tenant.isTest
            ? 'No recibe correos masivos ni automáticos (términos, renovación, inactividad) y no se elimina por inactividad. Sí recibe sus códigos de acceso.'
            : 'Márcalo como cuenta de prueba si es tuyo y lo usas para probar: seguirá en el panel, pero sin correos masivos ni automáticos.'
        }}
      </span>
      <button
        type="button"
        :disabled="busy !== null"
        class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5"
        @click="toggleTest"
      >
        {{ busy === 'test' ? 'Guardando…' : tenant.isTest ? 'Quitar marca de prueba' : 'Marcar como cuenta de prueba' }}
      </button>
    </div>

    <p v-if="message" role="status" class="mt-3 text-sm text-success-600 dark:text-success-400">{{ message }}</p>
    <p v-if="error" role="alert" class="mt-3 text-sm text-error-500">{{ error }}</p>

    <div class="mt-4 grid gap-5 lg:grid-cols-2">
      <!-- Extender prueba -->
      <form class="space-y-3" @submit.prevent="extend">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-100">Extender la prueba gratuita</h4>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          <template v-if="sub">Prueba actual hasta el {{ formatDateTime(sub.trialEndsAt) }} ({{ statusLabel }}).</template>
          <template v-else>Aún no elige plan: no hay prueba que extender.</template>
          Si registró tarjeta, el primer cobro también se mueve en Stripe.
        </p>
        <fieldset :disabled="!sub || busy !== null" class="space-y-3">
          <legend class="sr-only">Días a agregar</legend>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="d in [7, 15, 30]"
              :key="d"
              type="button"
              class="rounded-lg border px-3 py-1.5 text-sm"
              :class="days === d ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-200'"
              :aria-pressed="days === d"
              @click="days = d"
            >
              +{{ d }} días
            </button>
            <label class="sr-only" :for="`${uid}-days`">Otro número de días</label>
            <input :id="`${uid}-days`" v-model.number="days" type="number" min="1" max="365" class="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          </div>
          <div>
            <label :for="`${uid}-ereason`" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Motivo (interno, opcional)</label>
            <input :id="`${uid}-ereason`" v-model="extendReason" type="text" maxlength="300" placeholder="Ej. compensación por falla" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
          </div>
          <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">
            {{ busy === 'extend' ? 'Extendiendo…' : `Extender ${days || 0} días` }}
          </button>
        </fieldset>
      </form>

      <!-- Suspender / reactivar -->
      <div class="space-y-3">
        <h4 class="text-sm font-medium text-gray-800 dark:text-gray-100">{{ suspended ? 'Reactivar el negocio' : 'Suspender el negocio' }}</h4>
        <template v-if="!suspended">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            El negocio y sus usuarios no podrán usar el panel, su página de reservas deja de mostrarse y el asistente de
            WhatsApp no responde. Si paga con tarjeta, el cobro se pausa en Stripe. Sus datos no se borran y puede
            descargarlos.
          </p>
          <form v-if="confirmingSuspend" class="space-y-3 rounded-xl border border-error-200 p-3 dark:border-error-500/30" @submit.prevent="suspend">
            <div>
              <label :for="`${uid}-sreason`" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Motivo (lo verá el negocio) *</label>
              <textarea :id="`${uid}-sreason`" v-model="suspendReason" rows="2" required minlength="5" maxlength="500" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white" />
            </div>
            <FormCheckbox v-model="notify">Avisar por correo al dueño del negocio</FormCheckbox>
            <div class="flex flex-wrap gap-2">
              <button type="submit" :disabled="busy !== null || suspendReason.trim().length < 5" class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 disabled:opacity-50">
                {{ busy === 'suspend' ? 'Suspendiendo…' : 'Sí, suspender' }}
              </button>
              <button type="button" class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-200" @click="confirmingSuspend = false">
                Cancelar
              </button>
            </div>
          </form>
          <button v-else type="button" class="rounded-lg border border-error-300 px-4 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:text-error-400" @click="confirmingSuspend = true">
            Suspender…
          </button>
        </template>
        <template v-else>
          <p class="text-xs text-gray-500 dark:text-gray-400">Recupera el acceso al panel y, si tenía tarjeta, se reanuda el cobro en Stripe.</p>
          <FormCheckbox v-model="notify">Avisar por correo al dueño del negocio</FormCheckbox>
          <button type="button" :disabled="busy !== null" class="rounded-lg bg-success-500 px-4 py-2 text-sm font-medium text-white hover:bg-success-600 disabled:opacity-50" @click="reactivate">
            {{ busy === 'reactivate' ? 'Reactivando…' : 'Reactivar' }}
          </button>
        </template>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { extractApiError } from '@/services/api'
import {
  extendTenantTrial,
  formatDateTime,
  reactivateTenant,
  setTenantTestFlag,
  suspendTenant,
} from '@/services/compliance'

interface TenantLike {
  id: string
  active: boolean
  isTest?: boolean
  suspendedAt?: string | null
  suspendedReason?: string | null
  subscription?: { status: string; trialEndsAt: string } | null
}

const props = defineProps<{ tenant: TenantLike }>()
const emit = defineEmits<{ changed: [] }>()

const uid = useId()
const days = ref(15)
const extendReason = ref('')
const suspendReason = ref('')
const notify = ref(true)
const confirmingSuspend = ref(false)
type ActionKind = 'extend' | 'suspend' | 'reactivate' | 'test'
const busy = ref<ActionKind | null>(null)
const message = ref<string | null>(null)
const error = ref<string | null>(null)

const suspended = computed(() => !props.tenant.active)
const sub = computed(() => props.tenant.subscription ?? null)
const statusLabel = computed(
  () =>
    ({ TRIALING: 'en prueba', ACTIVE: 'activa', EXPIRED: 'vencida', CANCELED: 'cancelada' })[sub.value?.status ?? ''] ??
    sub.value?.status ??
    '',
)

async function run(kind: ActionKind, fn: () => Promise<string>) {
  message.value = null
  error.value = null
  busy.value = kind
  try {
    message.value = await fn()
    emit('changed')
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo completar la acción')
  } finally {
    busy.value = null
  }
}

function extend() {
  const n = Number(days.value)
  if (!Number.isInteger(n) || n < 1 || n > 365) {
    error.value = 'Indica de 1 a 365 días'
    return
  }
  void run('extend', async () => {
    const r = await extendTenantTrial(props.tenant.id, n, extendReason.value.trim())
    extendReason.value = ''
    return `Prueba extendida hasta el ${formatDateTime(r.trialEndsAt)}${r.stripeUpdated ? ' (también en Stripe)' : ''}.`
  })
}

function suspend() {
  void run('suspend', async () => {
    const r = await suspendTenant(props.tenant.id, suspendReason.value.trim(), notify.value)
    confirmingSuspend.value = false
    suspendReason.value = ''
    return `Negocio suspendido.${r.billingPaused ? ' Cobro pausado en Stripe.' : ''}${notify.value ? ` Avisos enviados: ${r.notified}.` : ''}`
  })
}

function toggleTest() {
  const next = !props.tenant.isTest
  void run('test', async () => {
    await setTenantTestFlag(props.tenant.id, next)
    return next ? 'Marcado como cuenta de prueba.' : 'Ya no es cuenta de prueba: vuelve a recibir los correos normales.'
  })
}

function reactivate() {
  void run('reactivate', async () => {
    const r = await reactivateTenant(props.tenant.id, notify.value)
    return `Negocio reactivado.${r.billingResumed ? ' Cobro reanudado en Stripe.' : ''}${notify.value ? ` Avisos enviados: ${r.notified}.` : ''}`
  })
}
</script>
