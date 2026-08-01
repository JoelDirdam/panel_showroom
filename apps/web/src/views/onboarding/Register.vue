<template>
  <FullScreenLayout>
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div class="relative flex flex-col justify-center w-full min-h-screen lg:flex-row dark:bg-gray-900">
        <div class="flex flex-col flex-1 w-full lg:w-1/2">
          <div class="w-full max-w-md pt-10 mx-auto">
            <router-link
              to="/planes"
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
                    Teléfono (opcional)
                  </label>
                  <input
                    v-model="phone"
                    type="tel"
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
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                    Firma (nombre completo)<span class="text-error-500">*</span>
                  </label>
                  <input
                    v-model="signedName"
                    type="text"
                    required
                    placeholder="Escribe tu nombre completo como firma"
                    class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  />
                  <p class="mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                    Esta firma queda registrada como tu aceptación de los términos vigentes.
                  </p>
                </div>

                <div>
                  <label class="flex items-start text-sm font-normal text-gray-700 cursor-pointer select-none dark:text-gray-400">
                    <div class="relative">
                      <input v-model="agreeToTerms" type="checkbox" required class="sr-only" />
                      <div
                        :class="agreeToTerms ? 'border-brand-500 bg-brand-500' : 'bg-transparent border-gray-300 dark:border-gray-700'"
                        class="mr-3 flex h-5 w-5 items-center justify-center rounded-md border-[1.25px]"
                      >
                        <CheckIcon v-if="agreeToTerms" class="h-3.5 w-3.5 text-white" />
                      </div>
                    </div>
                    <p class="inline-block font-normal text-gray-500 dark:text-gray-400">
                      Acepto los
                      <router-link to="/terms" target="_blank" class="text-brand-500 hover:text-brand-600">
                        Términos y Condiciones{{ terms ? ` (v${terms.version})` : '' }}
                      </router-link>
                    </p>
                  </label>
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

        <div class="relative items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid">
          <div class="flex items-center justify-center z-1">
            <common-grid-shape />
            <div class="flex flex-col items-center max-w-xs">
              <p class="text-center text-lg font-medium text-white">
                Prueba gratis 15 días — hasta 30 con código promocional
              </p>
              <p class="mt-3 text-center text-gray-300 dark:text-white/60">
                Marcas, productos, stock, ventas, caja y agenda en un solo panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CheckIcon } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import CommonGridShape from '@/components/common/CommonGridShape.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const email = ref('')
const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const signedName = ref('')
const agreeToTerms = ref(false)
const validationError = ref<string | null>(null)

const terms = computed(() => auth.terms)

onMounted(async () => {
  try {
    await auth.fetchTerms()
  } catch {
    // Si no hay términos publicados, el registro sigue funcionando (ver registerSchema en la API).
  }
})

async function handleSubmit() {
  validationError.value = null
  auth.error = null

  if (password.value !== confirmPassword.value) {
    validationError.value = 'Las contraseñas no coinciden'
    return
  }
  if (!agreeToTerms.value) {
    validationError.value = 'Debes aceptar los Términos y Condiciones'
    return
  }

  const ok = await auth.register({
    name: name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim() || undefined,
    password: password.value,
    signedName: signedName.value.trim(),
    termsVersion: auth.terms?.version ?? '',
  })

  if (ok) {
    router.push('/onboarding/verify-email')
  }
}
</script>
