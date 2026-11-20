<template>
  <AuthShell
    :title="auth.twoFactorChallenge ? 'Verificación en dos pasos' : 'Inicia sesión'"
    :subtitle="
      auth.twoFactorChallenge
        ? useRecovery
          ? 'Escribe uno de tus códigos de recuperación.'
          : 'Escribe el código de 6 dígitos de tu app de autenticación.'
        : 'Entra a tu panel para ver tus citas, clientes y recordatorios.'
    "
  >
    <p
      v-if="accountDeleted"
      role="status"
      class="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.04] dark:text-gray-300"
    >
      Tu cuenta y tus datos fueron eliminados. Te enviamos una confirmación por correo.
    </p>

    <!-- Segundo paso: código de la app de autenticación -->
    <form v-if="auth.twoFactorChallenge" class="space-y-5" @submit.prevent="handleTwoFactor">
      <div>
        <label for="login-2fa" class="ui-label">
          {{ useRecovery ? 'Código de recuperación' : 'Código de 6 dígitos' }}
        </label>
        <input
          id="login-2fa"
          ref="twoFactorInput"
          v-model="twoFactorCode"
          type="text"
          :inputmode="useRecovery ? 'text' : 'numeric'"
          autocomplete="one-time-code"
          required
          class="ui-input tracking-[0.3em]"
        />
      </div>
      <p v-if="auth.error" role="alert" class="ui-error">{{ auth.error }}</p>
      <UiButton type="submit" block :loading="auth.loading" loading-text="Verificando…">Verificar y entrar</UiButton>
      <div class="flex flex-wrap justify-between gap-2 text-sm">
        <button type="button" class="min-h-11 font-semibold text-brand-600 hover:underline" @click="toggleRecovery">
          {{ useRecovery ? 'Usar el código de mi app' : 'No tengo mi teléfono: usar código de recuperación' }}
        </button>
        <button type="button" class="min-h-11 text-gray-600 hover:underline dark:text-gray-400" @click="backToPassword">
          Volver
        </button>
      </div>
    </form>

    <form v-else class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="login-email" class="ui-label">Correo electrónico</label>
        <input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="username"
          required
          class="ui-input"
          placeholder="tu@correo.com"
        />
      </div>
      <div>
        <label for="login-password" class="ui-label">Contraseña</label>
        <div class="relative">
          <input
            id="login-password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            required
            class="ui-input pr-12"
          />
          <button
            type="button"
            class="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
            :aria-label="showPassword ? 'Ocultar contraseña' : 'Ver contraseña'"
            :aria-pressed="showPassword"
            @click="showPassword = !showPassword"
          >
            <EyeOff v-if="showPassword" class="h-5 w-5" aria-hidden="true" />
            <Eye v-else class="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p v-if="auth.error" role="alert" class="ui-error">{{ auth.error }}</p>
      <UiButton type="submit" block :loading="auth.loading" loading-text="Entrando…">Iniciar sesión</UiButton>
      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        ¿Aún no tienes cuenta?
        <router-link to="/register" class="font-semibold text-brand-600 hover:underline dark:text-brand-300">Crea tu cuenta</router-link>
      </p>
    </form>
  </AuthShell>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Eye, EyeOff } from 'lucide-vue-next'
import AuthShell from '@/components/marketing/AuthShell.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const twoFactorCode = ref('')
const useRecovery = ref(false)
const twoFactorInput = ref<HTMLInputElement | null>(null)
const accountDeleted = route.query.cuenta === 'eliminada'

function goToPanel() {
  router.push(auth.mustChangePassword ? '/change-password' : auth.isSuperAdmin ? '/platform' : '/home')
}

async function handleSubmit() {
  const ok = await auth.login(email.value, password.value)
  if (ok) {
    goToPanel()
  } else if (auth.twoFactorChallenge) {
    password.value = ''
    twoFactorCode.value = ''
    useRecovery.value = false
    await nextTick()
    twoFactorInput.value?.focus()
  }
}

async function handleTwoFactor() {
  const ok = await auth.verifyTwoFactor(twoFactorCode.value.trim())
  if (ok) {
    goToPanel()
  } else {
    twoFactorCode.value = ''
    twoFactorInput.value?.focus()
  }
}

async function toggleRecovery() {
  useRecovery.value = !useRecovery.value
  twoFactorCode.value = ''
  auth.error = null
  await nextTick()
  twoFactorInput.value?.focus()
}

function backToPassword() {
  auth.cancelTwoFactor()
  twoFactorCode.value = ''
}

onBeforeUnmount(() => auth.cancelTwoFactor())
</script>
