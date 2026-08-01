<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-6 text-center">
          <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/15">
            <MailCheck class="h-6 w-6 text-brand-500" />
          </div>
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Verifica tu correo</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enviamos un código de 6 dígitos a
            <span class="font-medium text-gray-700 dark:text-gray-300">{{ auth.user?.email }}</span>
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="handleVerify">
          <div class="flex items-center justify-center gap-2">
            <div class="flex gap-1.5">
              <input
                v-for="i in 3"
                :key="`a-${i}`"
                :ref="(el) => setInputRef(el, i - 1)"
                v-model="digits[i - 1]"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                @input="onDigitInput(i - 1, $event)"
                @keydown="onDigitKeydown(i - 1, $event)"
                @paste="onPaste"
              />
            </div>
            <span class="text-lg font-semibold text-gray-400">-</span>
            <div class="flex gap-1.5">
              <input
                v-for="i in 3"
                :key="`b-${i}`"
                :ref="(el) => setInputRef(el, i + 2)"
                v-model="digits[i + 2]"
                type="text"
                inputmode="numeric"
                maxlength="1"
                class="h-12 w-10 rounded-lg border border-gray-300 text-center text-lg font-semibold text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                @input="onDigitInput(i + 2, $event)"
                @keydown="onDigitKeydown(i + 2, $event)"
                @paste="onPaste"
              />
            </div>
          </div>

          <p v-if="auth.devCode" class="text-center text-xs text-gray-400 dark:text-gray-500">
            (dev) Código: {{ auth.devCode }}
          </p>
          <p v-if="auth.error" class="text-center text-sm text-error-500">{{ auth.error }}</p>

          <button
            type="submit"
            :disabled="auth.loading || code.length !== 6"
            class="w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {{ auth.loading ? 'Verificando...' : 'Verificar código' }}
          </button>
        </form>

        <div class="mt-6 space-y-3 text-center text-sm">
          <button
            type="button"
            :disabled="resendCooldown > 0 || auth.loading"
            class="font-medium text-brand-500 hover:text-brand-600 disabled:cursor-not-allowed disabled:text-gray-400"
            @click="handleResend"
          >
            {{ resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código' }}
          </button>

          <div>
            <button
              type="button"
              class="text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              @click="showChangeEmail = !showChangeEmail"
            >
              ¿Correo incorrecto? Cámbialo
            </button>
          </div>

          <form v-if="showChangeEmail" class="flex gap-2" @submit.prevent="handleChangeEmail">
            <input
              v-model="newEmail"
              type="email"
              required
              placeholder="nuevo@correo.com"
              class="h-10 flex-1 rounded-lg border border-gray-300 px-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              :disabled="auth.loading"
              class="rounded-lg bg-gray-800 px-3 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-60 dark:bg-white/10"
            >
              Cambiar
            </button>
          </form>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { MailCheck } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const digits = ref<string[]>(['', '', '', '', '', ''])
const inputs: (HTMLInputElement | null)[] = []
const showChangeEmail = ref(false)
const newEmail = ref('')
const resendCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | undefined

const code = computed(() => digits.value.join(''))

function setInputRef(el: unknown, index: number) {
  inputs[index] = el as HTMLInputElement | null
}

function onDigitInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = target.value.replace(/\D/g, '').slice(-1)
  digits.value[index] = value
  if (value && index < 5) {
    inputs[index + 1]?.focus()
  }
}

function onDigitKeydown(index: number, event: KeyboardEvent) {
  if (event.key === 'Backspace' && !digits.value[index] && index > 0) {
    inputs[index - 1]?.focus()
  }
}

function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? ''
  const clean = text.replace(/\D/g, '').slice(0, 6)
  if (!clean) return
  event.preventDefault()
  for (let i = 0; i < 6; i += 1) {
    digits.value[i] = clean[i] ?? ''
  }
  inputs[Math.min(clean.length, 5)]?.focus()
}

function startCooldown(seconds = 60) {
  resendCooldown.value = seconds
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value === 0) clearInterval(cooldownTimer)
  }, 1000)
}

async function handleVerify() {
  const ok = await auth.verifyEmailCode(code.value)
  if (ok) {
    router.push('/onboarding/select-plan')
  } else {
    digits.value = ['', '', '', '', '', '']
    inputs[0]?.focus()
  }
}

async function handleResend() {
  const ok = await auth.resendEmailCode()
  if (ok) startCooldown()
}

async function handleChangeEmail() {
  const ok = await auth.changeEmail(newEmail.value.trim())
  if (ok) {
    showChangeEmail.value = false
    newEmail.value = ''
    digits.value = ['', '', '', '', '', '']
    startCooldown()
  }
}

onMounted(() => {
  inputs[0]?.focus()
  startCooldown()
})

onUnmounted(() => {
  clearInterval(cooldownTimer)
})
</script>
