<template>
  <AuthShell :title="titles[step].title" :subtitle="titles[step].subtitle">
    <ol class="mb-6 flex items-center gap-2 text-xs font-medium text-gray-500" aria-label="Pasos">
      <li
        v-for="(label, i) in stepLabels"
        :key="label"
        :aria-current="i === stepIndex ? 'step' : undefined"
        class="flex items-center gap-2"
      >
        <span
          :class="[
            'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold',
            i < stepIndex
              ? 'bg-brand-600 text-white'
              : i === stepIndex
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-300 dark:bg-brand-500/15 dark:text-brand-200'
                : 'bg-gray-100 text-gray-500 dark:bg-white/5',
          ]"
        >
          <Check v-if="i < stepIndex" class="h-3.5 w-3.5" aria-hidden="true" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span :class="i === stepIndex ? 'text-gray-900 dark:text-white' : ''">{{ label }}</span>
        <span v-if="i < stepLabels.length - 1" class="h-px w-4 bg-gray-300 dark:bg-gray-700" aria-hidden="true" />
      </li>
    </ol>

    <!-- 1. Correo y canal -->
    <form v-if="step === 'email'" class="space-y-5" novalidate @submit.prevent="sendCode">
      <UiField label="Correo de tu cuenta" :error="emailError" v-slot="f">
        <input
          :id="f.id"
          v-model.trim="email"
          type="email"
          autocomplete="username"
          required
          :aria-describedby="f.describedBy"
          :aria-invalid="f.invalid"
          class="ui-input"
        />
      </UiField>

      <fieldset>
        <legend class="ui-label">¿Por dónde quieres recibir el código?</legend>
        <div class="mt-2 grid gap-2 sm:grid-cols-2">
          <label
            v-for="opt in channels"
            :key="opt.value"
            :class="[
              'flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors',
              channel === opt.value
                ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-500 dark:bg-brand-500/10'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-white/[0.03]',
            ]"
          >
            <input v-model="channel" type="radio" name="canal" :value="opt.value" class="mt-0.5 h-4 w-4 accent-brand-600" />
            <span>
              <span class="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-white">
                <component :is="opt.icon" class="h-4 w-4" aria-hidden="true" />{{ opt.label }}
              </span>
              <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ opt.help }}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <p v-if="error" role="alert" class="ui-error">{{ error }}</p>
      <UiButton type="submit" block :loading="loading" loading-text="Enviando…">Enviar código</UiButton>
      <p class="text-center text-sm">
        <router-link to="/login" class="font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Volver a iniciar sesión
        </router-link>
      </p>
    </form>

    <!-- 2. Código -->
    <form v-else-if="step === 'code'" class="space-y-5" novalidate @submit.prevent="checkCode">
      <p role="status" class="rounded-xl bg-gray-100 p-3 text-sm text-gray-700 dark:bg-white/[0.05] dark:text-gray-300">
        {{ sentMessage }}
      </p>
      <UiField label="Código de 6 dígitos" help="Vence en 15 minutos y solo sirve una vez." v-slot="f">
        <input
          :id="f.id"
          ref="codeInput"
          v-model="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          pattern="\d{6}"
          required
          :aria-describedby="f.describedBy"
          class="ui-input text-center font-display text-2xl tracking-[0.5em]"
          @input="code = code.replace(/\D/g, '').slice(0, 6)"
        />
      </UiField>
      <p v-if="error" role="alert" class="ui-error">{{ error }}</p>
      <UiButton type="submit" block :loading="loading" loading-text="Revisando…" :disabled="code.length !== 6">
        Continuar
      </UiButton>
      <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          class="min-h-11 font-semibold text-brand-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline dark:text-brand-300"
          :disabled="cooldown > 0 || loading"
          @click="sendCode"
        >
          {{ cooldown > 0 ? `Pedir otro código en ${cooldown} s` : 'Pedir otro código' }}
        </button>
        <button type="button" class="min-h-11 text-gray-600 hover:underline dark:text-gray-400" @click="restart">
          Cambiar correo
        </button>
      </div>
    </form>

    <!-- 3. Contraseña nueva -->
    <form v-else-if="step === 'password'" class="space-y-5" novalidate @submit.prevent="savePassword">
      <UiField label="Contraseña nueva" :error="passwordError" :help="passwordHelp" v-slot="f">
        <div class="relative">
          <input
            :id="f.id"
            ref="passwordInput"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            minlength="8"
            required
            :aria-describedby="f.describedBy"
            :aria-invalid="f.invalid"
            class="ui-input pr-12"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-5 w-5" aria-hidden="true" />
            <Eye v-else class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </UiField>
      <div class="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" aria-hidden="true">
        <div :class="['h-full rounded-full transition-all', strength.bar]" :style="{ width: strength.width }" />
      </div>
      <UiField label="Escríbela otra vez" :error="confirmError" v-slot="f">
        <input
          :id="f.id"
          v-model="confirm"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          required
          :aria-describedby="f.describedBy"
          :aria-invalid="f.invalid"
          class="ui-input"
        />
      </UiField>
      <p v-if="error" role="alert" class="ui-error">{{ error }}</p>
      <UiButton type="submit" block :loading="loading" loading-text="Guardando…">Guardar contraseña</UiButton>
    </form>

    <!-- 4. Listo -->
    <div v-else class="space-y-5">
      <div class="flex items-start gap-3 rounded-xl border border-success-200 bg-success-50 p-4 text-sm text-success-800 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-200">
        <ShieldCheck class="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>
          Tu contraseña cambió. Cerramos las sesiones abiertas en otros dispositivos y te enviamos un aviso por correo.
        </p>
      </div>
      <UiButton to="/login" block>Iniciar sesión</UiButton>
    </div>
  </AuthShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { Check, Eye, EyeOff, Mail, MessageCircle, ShieldCheck } from 'lucide-vue-next'
import AuthShell from '@/components/marketing/AuthShell.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import { extractApiError } from '@/services/api'
import { requestResetCode, resetPassword, verifyResetCode, type ResetChannel } from '@/services/passwordReset'

type Step = 'email' | 'code' | 'password' | 'done'

const titles: Record<Step, { title: string; subtitle: string }> = {
  email: {
    title: 'Recupera tu contraseña',
    subtitle: 'Te enviamos un código para confirmar que la cuenta es tuya.',
  },
  code: { title: 'Escribe el código', subtitle: 'Revisa tu correo o tu WhatsApp.' },
  password: { title: 'Elige tu contraseña nueva', subtitle: 'Usa una que no uses en otros sitios.' },
  done: { title: 'Listo', subtitle: 'Ya puedes entrar con tu contraseña nueva.' },
}
const stepLabels = ['Correo', 'Código', 'Contraseña']

const channels = [
  { value: 'EMAIL' as const, label: 'Correo', icon: Mail, help: 'Si no lo ves, revisa también la carpeta de spam.' },
  {
    value: 'WHATSAPP' as const,
    label: 'WhatsApp',
    icon: MessageCircle,
    help: 'Solo si verificaste tu número. Si no, te llega por correo.',
  },
]

const step = ref<Step>('email')
/** En 'done' (índice 3) los tres pasos quedan marcados como listos. */
const stepIndex = computed(() => ['email', 'code', 'password', 'done'].indexOf(step.value))
const email = ref('')
const channel = ref<ResetChannel>('EMAIL')
const code = ref('')
const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const resetToken = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const emailError = ref<string | null>(null)
const passwordError = ref<string | null>(null)
const confirmError = ref<string | null>(null)
const sentMessage = ref('')
const cooldown = ref(0)
const codeInput = ref<HTMLInputElement | null>(null)
const passwordInput = ref<HTMLInputElement | null>(null)
let timer: ReturnType<typeof setInterval> | null = null

function startCooldown() {
  cooldown.value = 60
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0 && timer) clearInterval(timer)
  }, 1000)
}
onBeforeUnmount(() => timer && clearInterval(timer))

async function sendCode() {
  error.value = null
  emailError.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) ? null : 'Escribe un correo válido'
  if (emailError.value) return
  loading.value = true
  try {
    const res = await requestResetCode(email.value, channel.value)
    sentMessage.value = res.message
    step.value = 'code'
    code.value = ''
    startCooldown()
    await nextTick()
    codeInput.value?.focus()
  } catch (e) {
    error.value = extractApiError(e, 'No pudimos enviar el código. Intenta de nuevo en unos minutos.')
  } finally {
    loading.value = false
  }
}

async function checkCode() {
  error.value = null
  loading.value = true
  try {
    resetToken.value = await verifyResetCode(email.value, code.value)
    step.value = 'password'
    await nextTick()
    passwordInput.value?.focus()
  } catch (e) {
    error.value = extractApiError(e, 'No pudimos revisar el código.')
    code.value = ''
  } finally {
    loading.value = false
  }
}

const strength = computed(() => {
  const p = password.value
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++
  const levels = [
    { width: '10%', bar: 'bg-error-500', label: 'Muy corta' },
    { width: '30%', bar: 'bg-error-500', label: 'Débil' },
    { width: '55%', bar: 'bg-warning-500', label: 'Aceptable' },
    { width: '80%', bar: 'bg-success-500', label: 'Buena' },
    { width: '100%', bar: 'bg-success-600', label: 'Muy buena' },
  ]
  return levels[p ? score : 0]
})
const passwordHelp = computed(() =>
  password.value ? `Seguridad: ${strength.value.label}. Mínimo 8 caracteres; una frase larga es más segura.` : 'Mínimo 8 caracteres. Una frase larga es más segura.',
)

async function savePassword() {
  error.value = null
  passwordError.value = password.value.length < 8 ? 'Usa al menos 8 caracteres' : null
  confirmError.value = password.value !== confirm.value ? 'Las contraseñas no coinciden' : null
  if (passwordError.value || confirmError.value) return
  loading.value = true
  try {
    await resetPassword(resetToken.value, password.value)
    step.value = 'done'
    password.value = ''
    confirm.value = ''
  } catch (e) {
    const msg = extractApiError(e, 'No pudimos guardar la contraseña.')
    const expired = (e as { response?: { data?: { code?: string } } }).response?.data?.code === 'RESET_EXPIRED'
    if (expired) {
      step.value = 'email'
      error.value = msg
    } else {
      passwordError.value = msg
    }
  } finally {
    loading.value = false
  }
}

function restart() {
  step.value = 'email'
  code.value = ''
  error.value = null
}
</script>
