<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div
        class="relative flex flex-col justify-center w-full min-h-screen lg:flex-row dark:bg-gray-900"
      >
        <div class="flex flex-col flex-1 w-full lg:w-1/2">
          <div class="w-full max-w-md pt-10 mx-auto">
            <router-link
              to="/"
              class="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ArrowLeft class="mr-1.5 h-4 w-4" />
              Ver planes
            </router-link>
          </div>

          <div class="flex flex-col justify-center flex-1 w-full max-w-md py-8 mx-auto">
            <div class="mb-6">
              <h1 class="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
                Crea tu cuenta
              </h1>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Registra tu negocio y comienza tu prueba gratuita.
              </p>
            </div>

            <form @submit.prevent="handleSubmit">
              <div class="space-y-5">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Nombre completo<span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="name"
                    type="text"
                    required
                    placeholder="Tu nombre y apellido"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Correo electrónico<span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="email"
                    type="email"
                    required
                    placeholder="tucorreo@negocio.com"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>

                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Teléfono<span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="phone"
                    type="tel"
                    required
                    minlength="7"
                    placeholder="10 dígitos"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                </div>

                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Contraseña<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="password"
                      type="password"
                      required
                      minlength="8"
                      placeholder="Mínimo 8 caracteres"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                      Confirmar contraseña<span class="text-error-500">*</span>
                    </label>
                    <input
                      v-model="confirmPassword"
                      type="password"
                      required
                      minlength="8"
                      placeholder="Repite tu contraseña"
                      class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    />
                  </div>
                </div>

                <div>
                  <FormCheckbox v-model="agreeToTerms" required align="start">
                    Acepto los
                    <router-link to="/terms" target="_blank" class="text-brand-500 hover:text-brand-600">
                      Términos y Condiciones{{ terms ? ` (v${terms.version})` : '' }}
                    </router-link>
                  </FormCheckbox>
                </div>

                <p v-if="validationError" class="text-sm text-error-500">{{ validationError }}</p>
                <p v-if="auth.error" class="text-sm text-error-500">{{ auth.error }}</p>

                <button
                  type="submit"
                  :disabled="auth.loading"
                  class="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
                >
                  {{ auth.loading ? 'Creando cuenta...' : 'Crear cuenta' }}
                </button>
              </div>
            </form>

            <div class="mt-5">
              <p class="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
                ¿Ya tienes cuenta?
                <router-link to="/login" class="text-brand-500 hover:text-brand-600 dark:text-brand-400">
                  Inicia sesión
                </router-link>
              </p>
            </div>
          </div>
        </div>

        <div
          class="relative hidden w-full bg-brand-950 dark:bg-white/5 lg:flex lg:w-1/2 lg:items-center lg:justify-center"
        >
          <common-grid-shape />
          <div class="relative z-1 flex max-w-xs flex-col items-center px-6">
            <router-link to="/" class="mb-4 block text-center">
              <span class="text-2xl font-semibold tracking-tight text-white">Punto Maneki</span>
            </router-link>
            <p class="text-center text-gray-400 dark:text-white/60">
              Prueba nuestras funciones por 15 días gratis. Marcas, productos, stock, ventas, caja y
              agenda en un solo panel.
            </p>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import CommonGridShape from '@/components/common/CommonGridShape.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreeToTerms = ref(false)
const validationError = ref<string | null>(null)

const terms = computed(() => auth.terms)

onMounted(async () => {
  const plan = typeof route.query.plan === 'string' ? route.query.plan : null
  if (plan) {
    try {
      sessionStorage.setItem('pendingPlanType', plan)
    } catch {
      /* ignore */
    }
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
  if (!phone.value.trim() || phone.value.trim().length < 7) {
    validationError.value = 'El teléfono es obligatorio'
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
    phone: phone.value.trim(),
    password: password.value,
    signedName: fullName,
    termsVersion: auth.terms?.version ?? '',
  })

  if (ok) {
    router.push('/onboarding/verify-email')
  }
}
</script>
