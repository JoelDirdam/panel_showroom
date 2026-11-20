<template>
  <section
    class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
    aria-labelledby="twofa-title"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="twofa-title" class="text-lg font-semibold text-gray-800 dark:text-white">
          Verificación en dos pasos
        </h2>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Además de tu contraseña, se pide un código de 6 dígitos de una app de autenticación (Google Authenticator,
          Microsoft Authenticator, Authy, 1Password…).
        </p>
      </div>
      <span
        v-if="status"
        class="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
        :class="
          status.twoFactorEnabled
            ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400'
            : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
        "
      >
        {{ status.twoFactorEnabled ? 'Activa' : 'Inactiva' }}
      </span>
    </div>

    <p v-if="loading" class="mt-4 text-sm text-gray-500">Cargando…</p>

    <p
      v-if="status?.twoFactorRequired && !status.twoFactorEnabled"
      role="alert"
      class="mt-4 rounded-lg bg-warning-50 p-3 text-sm text-warning-800 dark:bg-warning-500/10 dark:text-warning-300"
    >
      Tu cuenta de plataforma requiere la verificación en dos pasos. Actívala para poder usar el panel.
    </p>

    <!-- Códigos de recuperación recién generados (se muestran una sola vez) -->
    <div
      v-if="recoveryCodes.length"
      class="mt-5 rounded-xl border border-warning-300 bg-warning-50 p-4 dark:border-warning-500/40 dark:bg-warning-500/10"
    >
      <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Guarda tus códigos de recuperación</h3>
      <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">
        Cada código sirve una sola vez para entrar si pierdes tu teléfono. <strong>No se volverán a mostrar.</strong>
        Guárdalos en un lugar seguro (por ejemplo, tu gestor de contraseñas o impresos).
      </p>
      <ul class="mt-3 grid grid-cols-2 gap-2 font-mono text-sm text-gray-900 dark:text-white" aria-label="Códigos de recuperación">
        <li v-for="c in recoveryCodes" :key="c" class="rounded bg-white px-3 py-1.5 text-center dark:bg-gray-900">{{ c }}</li>
      </ul>
      <div class="mt-3 flex flex-wrap gap-2">
        <button type="button" :class="secondaryBtn" @click="copyCodes">{{ copied ? 'Copiados' : 'Copiar' }}</button>
        <button type="button" :class="secondaryBtn" @click="downloadCodes">Descargar .txt</button>
        <button type="button" :class="primaryBtn" @click="finishCodes">Ya los guardé</button>
      </div>
    </div>

    <template v-else-if="status && !loading">
      <!-- INACTIVA: paso 0 (contraseña) -->
      <form v-if="!status.twoFactorEnabled && step === 'idle'" class="mt-5 space-y-3" @submit.prevent="begin">
        <div>
          <label :for="`${uid}-pw`" :class="labelCls">Para empezar, confirma tu contraseña</label>
          <input :id="`${uid}-pw`" v-model="password" type="password" required autocomplete="current-password" :class="inputCls" />
        </div>
        <p v-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
        <button type="submit" :disabled="busy" :class="primaryBtn">
          {{ busy ? 'Un momento…' : 'Activar verificación en dos pasos' }}
        </button>
      </form>

      <!-- INACTIVA: paso 1 (QR + código) -->
      <form v-else-if="!status.twoFactorEnabled && step === 'scan'" class="mt-5 space-y-4" @submit.prevent="confirm">
        <ol class="list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>Abre tu app de autenticación y elige “Agregar cuenta”.</li>
          <li>Escanea este código QR (o escribe la clave a mano).</li>
          <li>Escribe aquí el código de 6 dígitos que muestra la app.</li>
        </ol>
        <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <img
            v-if="qrDataUrl"
            :src="qrDataUrl"
            width="200"
            height="200"
            class="rounded-lg border border-gray-200 bg-white p-2"
            alt="Código QR para configurar la verificación en dos pasos en tu app de autenticación"
          />
          <div class="min-w-0 flex-1">
            <p :class="labelCls">Clave para escribirla a mano</p>
            <p class="break-all rounded-lg bg-gray-50 p-3 font-mono text-sm text-gray-900 dark:bg-white/[0.06] dark:text-white">
              {{ groupedSecret }}
            </p>
            <label :for="`${uid}-code`" :class="[labelCls, 'mt-4']">Código de 6 dígitos</label>
            <input
              :id="`${uid}-code`"
              ref="codeInput"
              v-model="code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="7"
              required
              :class="[inputCls, 'max-w-[12rem] tracking-widest']"
            />
          </div>
        </div>
        <p v-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
        <div class="flex flex-wrap gap-2">
          <button type="submit" :disabled="busy" :class="primaryBtn">{{ busy ? 'Verificando…' : 'Confirmar y activar' }}</button>
          <button type="button" :class="secondaryBtn" @click="reset">Cancelar</button>
        </div>
      </form>

      <!-- ACTIVA -->
      <div v-else-if="status.twoFactorEnabled" class="mt-5">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Activa desde el {{ formatDate(status.twoFactorEnabledAt) }}. Te quedan
          <strong>{{ status.recoveryCodesLeft }}</strong> códigos de recuperación.
        </p>

        <form v-if="step === 'manage'" class="mt-4 space-y-3" @submit.prevent="runManage">
          <p class="text-sm font-medium text-gray-800 dark:text-white">
            {{ manageAction === 'disable' ? 'Desactivar la verificación en dos pasos' : 'Generar códigos de recuperación nuevos' }}
          </p>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label :for="`${uid}-mpw`" :class="labelCls">Contraseña</label>
              <input :id="`${uid}-mpw`" v-model="password" type="password" required autocomplete="current-password" :class="inputCls" />
            </div>
            <div>
              <label :for="`${uid}-mcode`" :class="labelCls">Código de tu app</label>
              <input :id="`${uid}-mcode`" v-model="code" type="text" inputmode="numeric" autocomplete="one-time-code" required :class="inputCls" />
            </div>
          </div>
          <p v-if="error" role="alert" class="text-sm text-error-500">{{ error }}</p>
          <div class="flex flex-wrap gap-2">
            <button type="submit" :disabled="busy" :class="manageAction === 'disable' ? dangerBtn : primaryBtn">
              {{ busy ? 'Un momento…' : manageAction === 'disable' ? 'Desactivar' : 'Generar códigos' }}
            </button>
            <button type="button" :class="secondaryBtn" @click="reset">Cancelar</button>
          </div>
        </form>

        <div v-else class="mt-4 flex flex-wrap gap-2">
          <button type="button" :class="secondaryBtn" @click="openManage('codes')">Generar códigos de recuperación nuevos</button>
          <button type="button" :class="secondaryBtn" @click="openManage('disable')">Desactivar</button>
        </div>
        <p v-if="status.twoFactorRequired" class="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Si la desactivas, no podrás usar el panel de plataforma hasta volver a activarla (útil para cambiar de teléfono).
        </p>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from 'vue'
import QRCode from 'qrcode'
import { extractApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import {
  disableTwoFactor,
  enableTwoFactor,
  fetchSecurity,
  regenerateRecoveryCodes,
  startTwoFactorSetup,
  type SecurityStatus,
} from '@/services/compliance'

const emit = defineEmits<{ changed: [enabled: boolean] }>()

const auth = useAuthStore()
const uid = useId()

const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const inputCls =
  'w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const primaryBtn =
  'rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60'
const secondaryBtn =
  'rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'
const dangerBtn =
  'rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:opacity-60'

const status = ref<SecurityStatus | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const step = ref<'idle' | 'scan' | 'manage'>('idle')
const manageAction = ref<'disable' | 'codes'>('codes')
const password = ref('')
const code = ref('')
const secret = ref('')
const qrDataUrl = ref('')
const recoveryCodes = ref<string[]>([])
const copied = ref(false)
const codeInput = ref<HTMLInputElement | null>(null)

const groupedSecret = computed(() => secret.value.replace(/(.{4})/g, '$1 ').trim())

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'
}

async function load() {
  try {
    status.value = await fetchSecurity()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar el estado de seguridad')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function reset() {
  step.value = 'idle'
  password.value = ''
  code.value = ''
  secret.value = ''
  qrDataUrl.value = ''
  error.value = null
}

async function begin() {
  error.value = null
  busy.value = true
  try {
    const setup = await startTwoFactorSetup(password.value)
    secret.value = setup.secret
    qrDataUrl.value = await QRCode.toDataURL(setup.otpauthUrl, { width: 400, margin: 1 })
    password.value = ''
    step.value = 'scan'
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo iniciar la configuración')
  } finally {
    busy.value = false
  }
}

async function confirm() {
  error.value = null
  busy.value = true
  try {
    const result = await enableTwoFactor(code.value.replace(/\s/g, ''))
    recoveryCodes.value = result.recoveryCodes
    auth.user = result.user
    reset()
    await load()
    emit('changed', true)
  } catch (e) {
    error.value = extractApiError(e, 'Código incorrecto')
  } finally {
    busy.value = false
  }
}

function openManage(action: 'disable' | 'codes') {
  reset()
  manageAction.value = action
  step.value = 'manage'
}

async function runManage() {
  error.value = null
  busy.value = true
  try {
    if (manageAction.value === 'disable') {
      const result = await disableTwoFactor(password.value, code.value.trim())
      auth.user = result.user
      reset()
      await load()
      emit('changed', false)
    } else {
      const result = await regenerateRecoveryCodes(password.value, code.value.trim())
      recoveryCodes.value = result.recoveryCodes
      reset()
      await load()
    }
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo completar la acción')
  } finally {
    busy.value = false
  }
}

const codesText = () =>
  `Códigos de recuperación de COSDI (${auth.user?.email ?? ''})\nCada código sirve una sola vez.\n\n${recoveryCodes.value.join('\n')}\n`

async function copyCodes() {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join('\n'))
    copied.value = true
  } catch {
    copied.value = false
  }
}

function downloadCodes() {
  const url = URL.createObjectURL(new Blob([codesText()], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'cosdi-codigos-de-recuperacion.txt'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function finishCodes() {
  recoveryCodes.value = []
  copied.value = false
}
</script>
