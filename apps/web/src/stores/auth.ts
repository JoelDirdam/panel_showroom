import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, {
  extractApiError,
  fetchCurrentTerms,
  registerUser,
  verifyEmailCode as verifyEmailCodeRequest,
  changeEmail as changeEmailRequest,
  acceptTerms as acceptTermsRequest,
  selectPlan as selectPlanRequest,
  createBusiness as createBusinessRequest,
  type User,
  type TermsDocument,
  type RegisterPayload,
  type CreateBusinessPayload,
} from '@/services/api'
import { canAccessModule, hasFeatureFlag, type EntitlementModule, type FeatureFlag, type PlanType } from '@/lib/entitlements'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const terms = ref<TermsDocument | null>(null)
  /** Código de verificación devuelto solo en dev (`NODE_ENV !== 'production'`) para probar sin correo real. */
  const devCode = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value)
  const isBusiness = computed(() => user.value?.role === 'BUSINESS')
  /** Alias de `isBusiness` — se mantiene para no romper templates existentes que usan `isAdmin`. */
  const isAdmin = isBusiness
  const isSuperAdmin = computed(() => user.value?.role === 'SUPER_ADMIN')
  const mustChangePassword = computed(() => !!user.value?.mustChangePassword)
  const onboardingStep = computed(() => user.value?.onboardingStep ?? 'DONE')
  /** `true` si no hay términos vigentes pendientes de aceptar (nada publicado, o ya aceptados). */
  const termsAccepted = computed(() => {
    const t = user.value?.terms
    if (!t || !t.currentVersion) return true
    return t.accepted
  })

  /**
   * `user.entitlements` viene de `/auth/me` (array de módulos permitidos
   * por el plan del tenant). Si es `undefined` (p. ej. justo tras
   * `/auth/login`, que todavía no lo incluye) se permite acceso a todo
   * para no romper el showroom actual — ver `lib/entitlements.ts`.
   */
  function canAccess(moduleId: EntitlementModule): boolean {
    return canAccessModule(user.value?.entitlements, moduleId)
  }

  function hasFlag(flag: FeatureFlag): boolean {
    return hasFeatureFlag(user.value?.featureFlags, flag)
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/login', { email, password })
      token.value = data.token
      user.value = data.user
      localStorage.setItem('token', data.token)
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'Error al iniciar sesión')
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const { data } = await api.get('/auth/me')
      user.value = data
    } catch {
      logout()
    }
  }

  async function fetchTerms() {
    const data = await fetchCurrentTerms()
    terms.value = data
    return data
  }

  async function register(payload: RegisterPayload) {
    loading.value = true
    error.value = null
    try {
      const data = await registerUser(payload)
      token.value = data.token
      user.value = data.user
      devCode.value = data.devCode ?? null
      localStorage.setItem('token', data.token)
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudo completar el registro')
      return false
    } finally {
      loading.value = false
    }
  }

  async function verifyEmailCode(code: string) {
    loading.value = true
    error.value = null
    try {
      const data = await verifyEmailCodeRequest(code)
      user.value = data.user
      devCode.value = null
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'Código incorrecto')
      return false
    } finally {
      loading.value = false
    }
  }

  async function resendEmailCode() {
    loading.value = true
    error.value = null
    try {
      const { data } = await api.post('/auth/resend-email-code')
      devCode.value = data.devCode ?? null
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudo reenviar el código')
      return false
    } finally {
      loading.value = false
    }
  }

  async function changeEmail(email: string) {
    loading.value = true
    error.value = null
    try {
      const data = await changeEmailRequest(email)
      user.value = data.user
      devCode.value = data.devCode ?? null
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudo cambiar el correo')
      return false
    } finally {
      loading.value = false
    }
  }

  async function acceptTerms(signedName: string, termsVersion: string) {
    loading.value = true
    error.value = null
    try {
      const data = await acceptTermsRequest(signedName, termsVersion)
      user.value = data.user
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudieron aceptar los términos')
      return false
    } finally {
      loading.value = false
    }
  }

  async function selectPlan(planType: PlanType, promoCode?: string) {
    loading.value = true
    error.value = null
    try {
      const data = await selectPlanRequest(planType, promoCode)
      user.value = data.user
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudo seleccionar el plan')
      return false
    } finally {
      loading.value = false
    }
  }

  async function createBusiness(payload: CreateBusinessPayload) {
    loading.value = true
    error.value = null
    try {
      const data = await createBusinessRequest(payload)
      user.value = data.user
      return true
    } catch (e: unknown) {
      error.value = extractApiError(e, 'No se pudo crear el negocio')
      return false
    } finally {
      loading.value = false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    devCode.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    user,
    loading,
    error,
    terms,
    devCode,
    isAuthenticated,
    isBusiness,
    isAdmin,
    isSuperAdmin,
    mustChangePassword,
    onboardingStep,
    termsAccepted,
    canAccess,
    hasFlag,
    login,
    fetchMe,
    fetchTerms,
    register,
    verifyEmailCode,
    resendEmailCode,
    changeEmail,
    acceptTerms,
    selectPlan,
    createBusiness,
    logout,
  }
})
