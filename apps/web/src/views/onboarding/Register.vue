<template>
  <AuthShell title="Crea tu cuenta" subtitle="Registra tu negocio y activa tu plan en minutos. Sin plazos forzosos.">
    <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
      <UiField v-slot="f" label="Nombre completo" required>
        <input :id="f.id" v-model="name" type="text" autocomplete="name" placeholder="Tu nombre y apellido" class="ui-input" />
      </UiField>

      <UiField v-slot="f" label="Correo electrónico" required help="Ahí te enviaremos un código para verificarlo.">
        <input
          :id="f.id"
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="tucorreo@negocio.com"
          class="ui-input"
          :aria-describedby="f.describedBy"
        />
      </UiField>

      <UiField v-slot="f" label="Teléfono" optional help="10 dígitos. Solo para ayudarte si lo necesitas.">
        <input
          :id="f.id"
          v-model="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="618 123 4567"
          class="ui-input"
          :aria-describedby="f.describedBy"
        />
      </UiField>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <UiField v-slot="f" label="Contraseña" required help="Mínimo 8 caracteres.">
          <input
            :id="f.id"
            v-model="password"
            type="password"
            minlength="8"
            autocomplete="new-password"
            class="ui-input"
            :aria-describedby="f.describedBy"
          />
        </UiField>
        <UiField v-slot="f" label="Confirmar contraseña" required>
          <input :id="f.id" v-model="confirmPassword" type="password" minlength="8" autocomplete="new-password" class="ui-input" />
        </UiField>
      </div>

      <!-- Casillas SIN marcar por defecto: la aceptación debe ser un acto expreso. -->
      <div class="space-y-3 rounded-xl bg-white p-4 ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-gray-800">
        <FormCheckbox v-model="agreeToTerms" required align="start">
          He leído y acepto los
          <router-link to="/terminos" target="_blank" class="font-medium text-brand-600 underline">
            Términos y Condiciones{{ terms ? ` (v${terms.version})` : '' }}</router-link
          >, incluida la renovación automática de los planes de pago, y el
          <router-link to="/privacidad" target="_blank" class="font-medium text-brand-600 underline">Aviso de Privacidad</router-link
          >.<span class="text-error-600">*</span>
        </FormCheckbox>
        <!-- Consentimiento de marketing: aparte, opcional y desmarcado. -->
        <FormCheckbox v-model="marketingOptIn" align="start">
          Quiero recibir novedades y promociones de COSDI por correo. (Opcional; puedes darte de baja cuando quieras.)
        </FormCheckbox>
      </div>

      <p v-if="validationError" class="ui-error" role="alert">{{ validationError }}</p>
      <p v-if="auth.error" class="ui-error" role="alert">{{ auth.error }}</p>

      <UiButton type="submit" block :loading="auth.loading" loading-text="Creando cuenta…">Crear cuenta</UiButton>

      <p class="text-center text-sm text-gray-600 dark:text-gray-400">
        ¿Ya tienes cuenta?
        <router-link to="/login" class="font-semibold text-brand-600 hover:underline dark:text-brand-300">Inicia sesión</router-link>
      </p>
    </form>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthShell from '@/components/marketing/AuthShell.vue'
import UiField from '@/components/ui/UiField.vue'
import UiButton from '@/components/ui/UiButton.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { useAuthStore } from '@/stores/auth'
import { trackSignup } from '@/lib/trackers'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
// Ambas casillas inician desmarcadas; nunca se premarcan.
const agreeToTerms = ref(false)
const marketingOptIn = ref(false)
const validationError = ref<string | null>(null)

const terms = computed(() => auth.terms)

onMounted(async () => {
  const plan = typeof route.query.plan === 'string' ? route.query.plan : null
  // Link de recomendación (?ref=CODIGO) o de campaña (?codigo=CODIGO): se precarga al elegir plan.
  const rawCode = route.query.ref ?? route.query.codigo
  const code = typeof rawCode === 'string' && /^[A-Za-z0-9_-]{3,30}$/.test(rawCode) ? rawCode.toUpperCase() : null
  try {
    if (plan) sessionStorage.setItem('pendingPlanType', plan)
    if (code) sessionStorage.setItem('pendingPromoCode', code)
  } catch {
    /* ignore */
  }
  try {
    await auth.fetchTerms()
  } catch {
    // Si no hay términos publicados, el registro sigue funcionando (ver registerSchema en la API).
  }
})

async function handleSubmit() {
  validationError.value = null
  auth.error = null

  const fullName = name.value.trim()
  if (!fullName) {
    validationError.value = 'El nombre completo es obligatorio'
    return
  }
  const phoneValue = phone.value.trim()
  if (phoneValue && phoneValue.length < 7) {
    validationError.value = 'Revisa el teléfono (o déjalo vacío: es opcional)'
    return
  }
  if (password.value !== confirmPassword.value) {
    validationError.value = 'Las contraseñas no coinciden'
    return
  }
  if (!agreeToTerms.value) {
    validationError.value = 'Debes aceptar los Términos y Condiciones'
    return
  }

  const ok = await auth.register({
    name: fullName,
    email: email.value.trim(),
    phone: phoneValue || null,
    password: password.value,
    signedName: fullName,
    termsVersion: auth.terms?.version ?? '',
    acceptTerms: agreeToTerms.value,
    marketingOptIn: marketingOptIn.value,
  })

  if (ok) {
    trackSignup()
    router.push('/onboarding/verify-email')
  }
}
</script>
