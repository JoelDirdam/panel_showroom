<template>
  <admin-layout>
    <page-breadcrumb page-title="Preferencias" />

    <div class="space-y-6">
      <!-- Resumen -->
      <component-card title="Resumen de la cuenta" desc="Estado general de tu negocio y tu perfil.">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">Correo</p>
            <p class="mt-1 truncate text-sm font-medium text-gray-800 dark:text-white">{{ auth.user?.email }}</p>
            <span
              class="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="emailVerified ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'"
            >
              {{ emailVerified ? 'Verificado' : 'No verificado' }}
            </span>
            <button
              v-if="!emailVerified"
              type="button"
              class="ml-2 text-xs text-brand-500 hover:underline"
              :disabled="emailSending"
              @click="sendEmailCode"
            >
              {{ emailSending ? 'Enviando…' : 'Reenviar código' }}
            </button>
            <p v-if="emailMsg" class="mt-1 text-xs text-success-600 dark:text-success-400">{{ emailMsg }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">Teléfono</p>
            <p class="mt-1 text-sm font-medium text-gray-800 dark:text-white">{{ auth.user?.phone || 'Sin registrar' }}</p>
            <span
              class="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="phoneVerified ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'"
            >
              {{ phoneVerified ? 'Verificado' : 'No verificado' }}
            </span>
            <button
              v-if="!phoneVerified"
              type="button"
              class="ml-2 text-xs text-brand-500 hover:underline"
              :disabled="phoneSending"
              @click="sendPhoneCode"
            >
              {{ phoneSending ? 'Enviando…' : 'Verificar por SMS' }}
            </button>

            <div v-if="showPhoneCodeInput" class="mt-3 flex items-center gap-2">
              <input
                v-model="phoneCode"
                maxlength="6"
                placeholder="Código de 6 dígitos"
                class="field !w-32 text-sm"
              />
              <button
                type="button"
                class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                :disabled="phoneVerifying || phoneCode.trim().length !== 6"
                @click="submitPhoneCode"
              >
                {{ phoneVerifying ? 'Verificando…' : 'Verificar' }}
              </button>
            </div>
            <p v-if="phoneMsg" class="mt-1 text-xs text-success-600 dark:text-success-400">{{ phoneMsg }}</p>
            <p v-if="phoneErr" class="mt-1 text-xs text-error-500">{{ phoneErr }}</p>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">Módulos disponibles</p>
            <p v-if="!availableModules" class="mt-1 text-sm font-medium text-gray-800 dark:text-white">Todos (sin restricción de plan)</p>
            <div v-else class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="label in availableModules"
                :key="label"
                class="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              >
                {{ label }}
              </span>
            </div>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">Negocio</p>
            <p class="mt-1 text-sm font-medium text-gray-800 dark:text-white">{{ auth.user?.tenant?.name }}</p>
            <span
              class="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="businessConfigured ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'"
            >
              {{ businessConfigured ? 'Configurado' : 'Pendiente' }}
            </span>
          </div>

          <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">Marcas</p>
            <p class="mt-1 text-sm font-medium text-gray-800 dark:text-white">
              {{ brandStats ? `${brandStats.total} registrada(s)` : '—' }}
            </p>
            <span
              class="mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
              :class="brandsConfigured ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400'"
            >
              {{ brandsConfigured ? 'Configuradas' : 'Pendiente' }}
            </span>
            <router-link to="/brands" class="ml-2 text-xs text-brand-500 hover:underline">
              {{ brandsConfigured ? 'Ver marcas →' : 'Registrar marcas →' }}
            </router-link>
          </div>
        </div>
      </component-card>

      <!-- Información general -->
      <component-card title="Información general" desc="Tus datos de contacto y acceso.">
        <form class="space-y-4" @submit.prevent="saveProfile">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
              <input v-model="profileForm.name" required class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Correo</label>
              <input v-model="profileForm.email" type="email" required class="field" />
              <p class="mt-1 text-xs text-gray-400">Cambiar el correo requiere volver a verificarlo.</p>
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Teléfono</label>
              <input v-model="profileForm.phone" type="tel" maxlength="30" placeholder="Ej. 5215512345678" class="field" />
              <p class="mt-1 text-xs text-gray-400">Cambiar el teléfono requiere volver a verificarlo por SMS.</p>
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Zona horaria</label>
              <input v-model="profileForm.timezone" list="tz-options" class="field" />
              <datalist id="tz-options">
                <option value="America/Mexico_City" />
                <option value="America/Cancun" />
                <option value="America/Merida" />
                <option value="America/Monterrey" />
                <option value="America/Chihuahua" />
                <option value="America/Hermosillo" />
                <option value="America/Mazatlan" />
                <option value="America/Tijuana" />
                <option value="America/Bahia_Banderas" />
              </datalist>
            </div>
          </div>

          <p v-if="profileMsg" class="text-sm text-success-600 dark:text-success-400">{{ profileMsg }}</p>
          <p v-if="profileError" class="text-sm text-error-500">{{ profileError }}</p>

          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="profileSaving"
            >
              {{ profileSaving ? 'Guardando…' : 'Guardar información' }}
            </button>
          </div>
        </form>
      </component-card>

      <!-- Preferencias del negocio -->
      <component-card title="Preferencias del negocio" desc="Comisiones, operación diaria y corte de caja.">
        <div v-if="prefsLoading" class="text-sm text-gray-500 dark:text-gray-400">Cargando…</div>
        <form v-else class="space-y-8" @submit.prevent="savePreferences">
          <div>
            <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Comisiones</h4>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Terminal primaria (%)</label>
                <input v-model="prefsForm.primaryTerminalCommission" type="number" min="0" max="100" step="0.01" class="field" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Terminal secundaria (%)</label>
                <input v-model="prefsForm.secondaryTerminalCommission" type="number" min="0" max="100" step="0.01" class="field" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Transferencia (%)</label>
                <input v-model="prefsForm.transferCommission" type="number" min="0" max="100" step="0.01" class="field" />
              </div>
            </div>
          </div>

          <div>
            <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Operaciones diarias</h4>
            <div class="grid gap-4 sm:grid-cols-3">
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Días para vencimiento de apartados</label>
                <input v-model.number="prefsForm.layawayDueDays" type="number" min="1" max="365" required class="field" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Ancho de etiqueta (mm)</label>
                <input v-model="prefsForm.labelWidthMm" type="number" min="1" class="field" />
              </div>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Alto de etiqueta (mm)</label>
                <input v-model="prefsForm.labelHeightMm" type="number" min="1" class="field" />
              </div>
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input v-model="prefsForm.flexibleInventory" type="checkbox" />
                Inventario flexible (permite vender sin stock exacto)
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input v-model="prefsForm.printTickets" type="checkbox" />
                Imprimir tickets automáticamente
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <input v-model="prefsForm.chargeIva" type="checkbox" />
                Cobrar IVA por defecto
              </label>
            </div>
            <div class="mt-4">
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
                Comentarios fijos en tickets
              </label>
              <p class="mb-2 text-xs text-gray-500">
                Este texto se incluye siempre en los tickets (aparte del comentario único de cada venta en Caja).
              </p>
              <textarea
                v-model="prefsForm.ticketFixedComment"
                maxlength="1000"
                rows="3"
                placeholder="Ej. Gracias por su compra · Políticas de cambio…"
                class="field w-full"
              />
            </div>
          </div>

          <div>
            <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Dólares (USD)</h4>
            <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input v-model="prefsForm.usdEnabled" type="checkbox" />
              Aceptar pagos en dólares
            </label>
            <div v-if="prefsForm.usdEnabled" class="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Tipo de cambio</label>
                <select v-model="prefsForm.usdRateMode" class="field">
                  <option value="">Sin definir</option>
                  <option value="FIXED">Fijo</option>
                  <option value="AUTOMATIC">Automático</option>
                </select>
              </div>
              <div v-if="prefsForm.usdRateMode === 'FIXED'">
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Tipo de cambio fijo (MXN por USD)</label>
                <input v-model="prefsForm.usdFixedRate" type="number" min="0" step="0.0001" class="field" />
              </div>
            </div>
          </div>

          <div>
            <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">Corte de caja</h4>
            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium"
                :class="prefsForm.cutoffType === 'WEEKLY' ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'"
                @click="prefsForm.cutoffType = 'WEEKLY'"
              >
                Semanal
              </button>
              <button
                type="button"
                class="rounded-lg px-4 py-2 text-sm font-medium"
                :class="prefsForm.cutoffType === 'MONTHLY_FIXED' ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'"
                @click="prefsForm.cutoffType = 'MONTHLY_FIXED'"
              >
                Días fijos del mes
              </button>
            </div>

            <div v-if="prefsForm.cutoffType === 'WEEKLY'" class="mt-4">
              <p class="mb-2 text-sm text-gray-600 dark:text-gray-300">Día de la semana para el corte</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="opt in weekdayOptions"
                  :key="opt.value"
                  type="button"
                  class="rounded-lg px-3 py-1.5 text-sm"
                  :class="prefsForm.cutoffWeekday === opt.value ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'"
                  @click="prefsForm.cutoffWeekday = opt.value"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div v-else class="mt-4">
              <p class="mb-2 text-sm text-gray-600 dark:text-gray-300">Días del mes para el corte (puedes elegir varios)</p>
              <div class="space-y-2">
                <div v-for="range in cutoffDayRanges" :key="range.label">
                  <p class="mb-1 text-xs uppercase text-gray-400">{{ range.label }}</p>
                  <div class="flex flex-wrap gap-1.5">
                    <button
                      v-for="day in range.days"
                      :key="day"
                      type="button"
                      class="h-8 w-8 rounded-lg text-sm"
                      :class="prefsForm.cutoffDaySlots.includes(day) ? 'bg-brand-500 text-white' : 'border border-gray-300 text-gray-600 dark:border-gray-700 dark:text-gray-300'"
                      @click="toggleCutoffDay(day)"
                    >
                      {{ day }}
                    </button>
                  </div>
                </div>
              </div>
              <p class="mt-2 text-xs text-gray-400">
                Si eliges el día 30 o 31 en un mes más corto (p. ej. febrero), el corte se recorre automáticamente al
                último día real del mes.
                <template v-if="cutoffPreview"> Este mes correspondería a: día(s) {{ cutoffPreview }}.</template>
              </p>
            </div>
          </div>

          <p v-if="prefsMsg" class="text-sm text-success-600 dark:text-success-400">{{ prefsMsg }}</p>
          <p v-if="prefsError" class="text-sm text-error-500">{{ prefsError }}</p>

          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="prefsSaving"
            >
              {{ prefsSaving ? 'Guardando…' : 'Guardar preferencias' }}
            </button>
          </div>
        </form>
      </component-card>

      <!-- Seguridad -->
      <component-card title="Seguridad" desc="Actualiza tu contraseña de acceso.">
        <form class="max-w-md space-y-4" @submit.prevent="savePassword">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Contraseña actual</label>
            <input v-model="pwForm.current" type="password" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nueva contraseña</label>
            <input v-model="pwForm.next" type="password" minlength="8" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Confirmar nueva contraseña</label>
            <input v-model="pwForm.confirm" type="password" minlength="8" required class="field" />
          </div>

          <p v-if="pwMsg" class="text-sm text-success-600 dark:text-success-400">{{ pwMsg }}</p>
          <p v-if="pwError" class="text-sm text-error-500">{{ pwError }}</p>

          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="pwSaving"
            >
              {{ pwSaving ? 'Guardando…' : 'Cambiar contraseña' }}
            </button>
          </div>
        </form>
      </component-card>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { useAuthStore } from '@/stores/auth'
import type { EntitlementModule } from '@/lib/entitlements'
import {
  changePassword,
  fetchBrandStats,
  fetchPreferences,
  resendEmailVerification,
  resendPhoneVerification,
  updatePreferences,
  updateProfile,
  verifyPhoneCode,
  type BrandStats,
  type BusinessPreferences,
  type CutoffType,
  type UpdateBusinessPreferencesPayload,
  type UpdateProfilePayload,
  type UsdRateMode,
} from '@/services/api'

const auth = useAuthStore()

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

function numOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function intOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Los días 30/31 no existen en todos los meses (p. ej. febrero). Cuando el
 * corte mensual usa uno de esos días en un mes más corto, se recorre al
 * último día real del mes — este helper documenta y calcula esa regla
 * tanto para la previsualización en esta vista como para quien construya
 * el job de corte en el backend.
 */
function resolveCutoffDayForMonth(day: number, year: number, monthIndex0: number): number {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  return Math.min(day, daysInMonth)
}

// ---------------------------------------------------------------------------
// Resumen
// ---------------------------------------------------------------------------
const MODULE_LABELS: Partial<Record<EntitlementModule, string>> = {
  dashboard: 'Dashboard',
  brands: 'Marcas',
  products: 'Productos',
  stock: 'Stock',
  productRequests: 'Órdenes',
  agenda: 'Agenda',
  caja: 'Caja',
  sales: 'Ventas',
  customers: 'Clientes',
  giftCards: 'Tarjetas de regalo',
  layaways: 'Apartados',
  users: 'Usuarios',
  preferences: 'Preferencias',
  business: 'Negocio',
  employees: 'Empleados',
  expenses: 'Gastos',
  commissions: 'Comisiones',
  discounts: 'Descuentos',
  cashRegisters: 'Cajas registradoras',
  inventory: 'Inventario',
  orders: 'Comandas',
  cortes: 'Cortes',
  mensualidad: 'Mensualidad',
}

const emailVerified = computed(() => !!auth.user?.emailVerifiedAt)
const phoneVerified = computed(() => !!auth.user?.phoneVerifiedAt)
const businessConfigured = computed(() => !!auth.user?.tenant?.onboardingComplete)

const availableModules = computed(() => {
  const mods = auth.user?.entitlements
  if (!mods || mods.length === 0) return null
  return mods.map((m) => MODULE_LABELS[m] ?? m)
})

const brandStats = ref<BrandStats | null>(null)
// Todo tenant tiene siempre su "marca casa" (ver apps/api/src/lib/houseBrand.ts),
// así que `total <= 1` significa que aún no registran marcas propias.
const brandsConfigured = computed(() => (brandStats.value?.total ?? 0) > 1)

async function loadBrandStats() {
  try {
    brandStats.value = await fetchBrandStats()
  } catch {
    brandStats.value = null
  }
}

const emailSending = ref(false)
const emailMsg = ref<string | null>(null)

async function sendEmailCode() {
  emailMsg.value = null
  emailSending.value = true
  try {
    const { devCode } = await resendEmailVerification()
    emailMsg.value = devCode ? `Código enviado (dev: ${devCode})` : 'Código enviado a tu correo'
  } catch (e) {
    emailMsg.value = apiError(e, 'No se pudo reenviar el código')
  } finally {
    emailSending.value = false
  }
}

const phoneCode = ref('')
const phoneSending = ref(false)
const phoneVerifying = ref(false)
const phoneMsg = ref<string | null>(null)
const phoneErr = ref<string | null>(null)
const showPhoneCodeInput = ref(false)

async function sendPhoneCode() {
  phoneErr.value = null
  phoneMsg.value = null
  if (!auth.user?.phone) {
    phoneErr.value = 'Agrega un teléfono en Información general y guarda antes de verificar'
    return
  }
  phoneSending.value = true
  try {
    const { devCode } = await resendPhoneVerification()
    showPhoneCodeInput.value = true
    phoneMsg.value = devCode ? `Código enviado (dev: ${devCode})` : 'Código enviado por SMS'
  } catch (e) {
    phoneErr.value = apiError(e, 'No se pudo enviar el código')
  } finally {
    phoneSending.value = false
  }
}

async function submitPhoneCode() {
  phoneErr.value = null
  phoneVerifying.value = true
  try {
    await verifyPhoneCode(phoneCode.value.trim())
    phoneMsg.value = 'Teléfono verificado'
    showPhoneCodeInput.value = false
    phoneCode.value = ''
    await auth.fetchMe()
  } catch (e) {
    phoneErr.value = apiError(e, 'Código incorrecto')
  } finally {
    phoneVerifying.value = false
  }
}

// ---------------------------------------------------------------------------
// Información general
// ---------------------------------------------------------------------------
const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
  timezone: 'America/Mexico_City',
})
const profileSaving = ref(false)
const profileError = ref<string | null>(null)
const profileMsg = ref<string | null>(null)

function applyProfileFromAuth() {
  profileForm.name = auth.user?.name ?? ''
  profileForm.email = auth.user?.email ?? ''
  profileForm.phone = auth.user?.phone ?? ''
  profileForm.timezone = auth.user?.timezone || 'America/Mexico_City'
}

async function saveProfile() {
  profileError.value = null
  profileMsg.value = null
  profileSaving.value = true
  try {
    const payload: UpdateProfilePayload = {
      name: profileForm.name.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone.trim() || null,
      timezone: profileForm.timezone.trim() || undefined,
    }
    const result = await updateProfile(payload)
    let msg = 'Información guardada'
    if (result.devEmailCode) msg += ` · código correo (dev): ${result.devEmailCode}`
    if (result.devPhoneCode) msg += ` · código SMS (dev): ${result.devPhoneCode}`
    profileMsg.value = msg
    await auth.fetchMe()
    applyProfileFromAuth()
  } catch (e) {
    profileError.value = apiError(e, 'No se pudo guardar la información')
  } finally {
    profileSaving.value = false
  }
}

// ---------------------------------------------------------------------------
// Preferencias del negocio
// ---------------------------------------------------------------------------
const prefsLoading = ref(true)
const prefsSaving = ref(false)
const prefsError = ref<string | null>(null)
const prefsMsg = ref<string | null>(null)

const prefsForm = reactive({
  primaryTerminalCommission: '',
  secondaryTerminalCommission: '',
  transferCommission: '',
  layawayDueDays: 15,
  labelWidthMm: '',
  labelHeightMm: '',
  flexibleInventory: false,
  printTickets: true,
  ticketFixedComment: '',
  chargeIva: false,
  usdEnabled: false,
  usdRateMode: '' as '' | UsdRateMode,
  usdFixedRate: '',
  cutoffType: 'MONTHLY_FIXED' as CutoffType,
  cutoffWeekday: null as number | null,
  cutoffDaySlots: [] as number[],
})

const weekdayOptions = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
]

const cutoffDayRanges = [
  { label: '1–6', days: [1, 2, 3, 4, 5, 6] },
  { label: '7–12', days: [7, 8, 9, 10, 11, 12] },
  { label: '13–18', days: [13, 14, 15, 16, 17, 18] },
  { label: '19–24', days: [19, 20, 21, 22, 23, 24] },
  { label: '25–31', days: [25, 26, 27, 28, 29, 30, 31] },
]

const cutoffPreview = computed(() => {
  if (prefsForm.cutoffType !== 'MONTHLY_FIXED' || prefsForm.cutoffDaySlots.length === 0) return null
  const now = new Date()
  const resolved = Array.from(
    new Set(prefsForm.cutoffDaySlots.map((d) => resolveCutoffDayForMonth(d, now.getFullYear(), now.getMonth()))),
  ).sort((a, b) => a - b)
  return resolved.join(', ')
})

function toggleCutoffDay(day: number) {
  const idx = prefsForm.cutoffDaySlots.indexOf(day)
  if (idx >= 0) prefsForm.cutoffDaySlots.splice(idx, 1)
  else prefsForm.cutoffDaySlots.push(day)
  prefsForm.cutoffDaySlots.sort((a, b) => a - b)
}

function applyPreferences(data: BusinessPreferences) {
  prefsForm.primaryTerminalCommission = data.primaryTerminalCommission ?? ''
  prefsForm.secondaryTerminalCommission = data.secondaryTerminalCommission ?? ''
  prefsForm.transferCommission = data.transferCommission ?? ''
  prefsForm.layawayDueDays = data.layawayDueDays
  prefsForm.labelWidthMm = data.labelWidthMm != null ? String(data.labelWidthMm) : ''
  prefsForm.labelHeightMm = data.labelHeightMm != null ? String(data.labelHeightMm) : ''
  prefsForm.flexibleInventory = data.flexibleInventory
  prefsForm.printTickets = data.printTickets
  prefsForm.ticketFixedComment = data.ticketFixedComment || ''
  prefsForm.chargeIva = data.chargeIva
  prefsForm.usdEnabled = data.usdEnabled
  prefsForm.usdRateMode = data.usdRateMode ?? ''
  prefsForm.usdFixedRate = data.usdFixedRate ?? ''
  prefsForm.cutoffType = data.cutoffType
  prefsForm.cutoffWeekday = data.cutoffWeekday
  prefsForm.cutoffDaySlots = [...data.cutoffDaySlots].sort((a, b) => a - b)
}

async function loadPreferences() {
  prefsLoading.value = true
  try {
    const data = await fetchPreferences()
    applyPreferences(data)
  } catch (e) {
    prefsError.value = apiError(e, 'No se pudieron cargar las preferencias')
  } finally {
    prefsLoading.value = false
  }
}

function validatePrefs(): string | null {
  if (!prefsForm.layawayDueDays || prefsForm.layawayDueDays < 1) {
    return 'Los días para vencimiento de apartados deben ser al menos 1'
  }
  if (prefsForm.cutoffType === 'WEEKLY' && !prefsForm.cutoffWeekday) {
    return 'Selecciona el día de la semana para el corte'
  }
  if (prefsForm.cutoffType === 'MONTHLY_FIXED' && prefsForm.cutoffDaySlots.length === 0) {
    return 'Selecciona al menos un día del mes para el corte'
  }
  if (prefsForm.usdEnabled && prefsForm.usdRateMode === 'FIXED' && numOrNull(prefsForm.usdFixedRate) == null) {
    return 'Define el tipo de cambio fijo'
  }
  return null
}

async function savePreferences() {
  prefsError.value = null
  prefsMsg.value = null
  const validationError = validatePrefs()
  if (validationError) {
    prefsError.value = validationError
    return
  }

  prefsSaving.value = true
  try {
    const payload: UpdateBusinessPreferencesPayload = {
      primaryTerminalCommission: numOrNull(prefsForm.primaryTerminalCommission),
      secondaryTerminalCommission: numOrNull(prefsForm.secondaryTerminalCommission),
      transferCommission: numOrNull(prefsForm.transferCommission),
      layawayDueDays: prefsForm.layawayDueDays,
      labelWidthMm: intOrNull(prefsForm.labelWidthMm),
      labelHeightMm: intOrNull(prefsForm.labelHeightMm),
      flexibleInventory: prefsForm.flexibleInventory,
      printTickets: prefsForm.printTickets,
      ticketFixedComment: prefsForm.ticketFixedComment?.trim() || null,
      chargeIva: prefsForm.chargeIva,
      usdEnabled: prefsForm.usdEnabled,
      usdRateMode: prefsForm.usdRateMode || null,
      usdFixedRate:
        prefsForm.usdEnabled && prefsForm.usdRateMode === 'FIXED' ? numOrNull(prefsForm.usdFixedRate) : null,
      cutoffType: prefsForm.cutoffType,
      cutoffWeekday: prefsForm.cutoffType === 'WEEKLY' ? prefsForm.cutoffWeekday : null,
      cutoffDaySlots: prefsForm.cutoffType === 'MONTHLY_FIXED' ? prefsForm.cutoffDaySlots : [],
    }
    const data = await updatePreferences(payload)
    applyPreferences(data)
    prefsMsg.value = 'Preferencias guardadas'
    // Refresca `auth.user.preferences` para que otras vistas (p. ej. apartados
    // de marca) reflejen de inmediato el nuevo `layawayDueDays`.
    await auth.fetchMe()
  } catch (e) {
    prefsError.value = apiError(e, 'No se pudieron guardar las preferencias')
  } finally {
    prefsSaving.value = false
  }
}

// ---------------------------------------------------------------------------
// Seguridad
// ---------------------------------------------------------------------------
const pwForm = reactive({ current: '', next: '', confirm: '' })
const pwSaving = ref(false)
const pwError = ref<string | null>(null)
const pwMsg = ref<string | null>(null)

async function savePassword() {
  pwError.value = null
  pwMsg.value = null
  if (pwForm.next !== pwForm.confirm) {
    pwError.value = 'Las contraseñas nuevas no coinciden'
    return
  }
  if (pwForm.next.length < 8) {
    pwError.value = 'La nueva contraseña debe tener al menos 8 caracteres'
    return
  }

  pwSaving.value = true
  try {
    await changePassword(pwForm.current, pwForm.next)
    pwMsg.value = 'Contraseña actualizada'
    pwForm.current = ''
    pwForm.next = ''
    pwForm.confirm = ''
  } catch (e) {
    pwError.value = apiError(e, 'No se pudo cambiar la contraseña')
  } finally {
    pwSaving.value = false
  }
}

onMounted(async () => {
  await auth.fetchMe()
  applyProfileFromAuth()
  await Promise.all([loadPreferences(), loadBrandStats()])
})
</script>

<style scoped>
.field {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}
</style>
