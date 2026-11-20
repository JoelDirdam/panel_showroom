<template>
  <admin-layout>
    <page-breadcrumb page-title="Mi cuenta" />

    <div class="space-y-6">
      <TwoFactorCard />

      <!-- Privacidad y datos -->
      <section
        class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6"
        aria-labelledby="privacy-title"
      >
        <h2 id="privacy-title" class="text-lg font-semibold text-gray-800 dark:text-white">Privacidad y datos</h2>
        <p v-if="loading" class="mt-3 text-sm text-gray-500">Cargando…</p>
        <p v-if="loadError" role="alert" class="mt-3 text-sm text-error-500">{{ loadError }}</p>

        <template v-if="privacy">
          <!-- Marketing -->
          <div class="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Correos de novedades y promociones</h3>
            <div class="mt-2">
              <FormCheckbox :model-value="privacy.marketingOptIn" :disabled="savingMarketing" @update:model-value="toggleMarketing">
                Quiero recibir novedades, consejos y promociones de COSDI por correo.
              </FormCheckbox>
            </div>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Es opcional y no afecta tu servicio. Los avisos necesarios de tu cuenta (códigos, cobros, seguridad) se
              envían siempre.
              <span v-if="privacy.marketingOptIn && privacy.marketingOptInAt">
                Aceptado el {{ formatDateTime(privacy.marketingOptInAt) }}.
              </span>
              <span v-else-if="privacy.marketingOptOutAt">
                Retirado el {{ formatDateTime(privacy.marketingOptOutAt) }}.
              </span>
            </p>
            <p v-if="marketingMsg" role="status" class="mt-2 text-sm text-success-600 dark:text-success-400">{{ marketingMsg }}</p>
          </div>

          <!-- Términos aceptados -->
          <div class="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Términos y condiciones que aceptaste</h3>
            <ul v-if="privacy.termsAcceptances.length" class="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <li v-for="a in privacy.termsAcceptances" :key="a.version">
                Versión <strong>{{ a.version }}</strong> · {{ formatDateTime(a.acceptedAt) }} · firmado como {{ a.signedName }}
              </li>
            </ul>
            <p v-else class="mt-2 text-sm text-gray-500">Sin registros.</p>
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <router-link to="/terminos" class="text-brand-500 underline">Términos vigentes</router-link> ·
              <router-link to="/privacidad" class="text-brand-500 underline">Aviso de privacidad</router-link> ·
              <router-link to="/conservacion-de-datos" class="text-brand-500 underline">Conservación de datos</router-link>
            </p>
          </div>

          <!-- Descargar -->
          <div class="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-gray-800 dark:text-white">Descargar mis datos</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Descarga una copia de {{ privacy.deletionScope === 'business' ? 'toda la información de tu negocio' : 'tus datos' }}
              en un archivo JSON (formato estándar que puede abrirse o importarse en otros sistemas). No incluye
              contraseñas.
            </p>
            <p v-if="exportError" role="alert" class="mt-2 text-sm text-error-500">{{ exportError }}</p>
            <button type="button" :class="[secondaryBtn, 'mt-3']" :disabled="exporting" @click="exportData">
              {{ exporting ? 'Preparando archivo…' : 'Descargar mis datos' }}
            </button>
          </div>

          <!-- Eliminar -->
          <div v-if="privacy.deletionScope !== 'none'" class="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
            <h3 class="text-sm font-semibold text-error-600 dark:text-error-400">Eliminar mi cuenta</h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              <template v-if="privacy.deletionScope === 'business'">
                Se eliminan de forma <strong>definitiva e inmediata</strong> tu negocio y todo lo que contiene: usuarios,
                marcas, productos, ventas, clientes, citas, conversaciones y archivos. Si tienes una suscripción, se
                cancela y no se te vuelve a cobrar. <strong>No se puede deshacer.</strong>
              </template>
              <template v-else>
                Se eliminan tus datos personales y ya no podrás entrar. Los registros operativos del negocio se conservan
                sin datos que te identifiquen. <strong>No se puede deshacer.</strong>
              </template>
            </p>

            <button v-if="!deleting" type="button" :class="[dangerOutlineBtn, 'mt-3']" @click="deleting = true">
              Eliminar mi cuenta…
            </button>

            <form v-else class="mt-4 space-y-3 rounded-xl border border-error-200 p-4 dark:border-error-500/30" @submit.prevent="confirmDelete">
              <p class="text-sm text-gray-700 dark:text-gray-300">
                Te recomendamos <button type="button" class="text-brand-500 underline" @click="exportData">descargar tus datos</button> antes de continuar.
              </p>
              <div>
                <label for="del-pw" :class="labelCls">Contraseña</label>
                <input id="del-pw" v-model="del.password" type="password" required autocomplete="current-password" :class="inputCls" />
              </div>
              <div v-if="privacy.twoFactorEnabled">
                <label for="del-code" :class="labelCls">Código de tu app de autenticación</label>
                <input id="del-code" v-model="del.code" type="text" inputmode="numeric" autocomplete="one-time-code" required :class="inputCls" />
              </div>
              <div>
                <label for="del-confirm" :class="labelCls">Escribe ELIMINAR para confirmar</label>
                <input id="del-confirm" v-model="del.confirm" type="text" required autocomplete="off" :class="inputCls" />
              </div>
              <p v-if="deleteError" role="alert" class="text-sm text-error-500">{{ deleteError }}</p>
              <div class="flex flex-wrap gap-2">
                <button type="submit" :class="dangerBtn" :disabled="deleteBusy || del.confirm !== 'ELIMINAR'">
                  {{ deleteBusy ? 'Eliminando…' : 'Eliminar definitivamente' }}
                </button>
                <button type="button" :class="secondaryBtn" @click="cancelDelete">Cancelar</button>
              </div>
            </form>
          </div>
        </template>
      </section>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import TwoFactorCard from '@/components/account/TwoFactorCard.vue'
import { extractApiError } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import {
  deleteMyAccount,
  downloadMyData,
  fetchPrivacy,
  formatDateTime,
  setMarketingOptIn,
  type PrivacyStatus,
} from '@/services/compliance'

const auth = useAuthStore()
const router = useRouter()

const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const inputCls =
  'w-full max-w-sm rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const secondaryBtn =
  'rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'
const dangerBtn =
  'rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50'
const dangerOutlineBtn =
  'rounded-lg border border-error-300 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-500/40 dark:text-error-400 dark:hover:bg-error-500/10'

const privacy = ref<PrivacyStatus | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const savingMarketing = ref(false)
const marketingMsg = ref<string | null>(null)
const exporting = ref(false)
const exportError = ref<string | null>(null)
const deleting = ref(false)
const deleteBusy = ref(false)
const deleteError = ref<string | null>(null)
const del = reactive({ password: '', code: '', confirm: '' })

async function load() {
  try {
    privacy.value = await fetchPrivacy()
  } catch (e) {
    loadError.value = extractApiError(e, 'No se pudo cargar tu información de privacidad')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function toggleMarketing(value: boolean) {
  if (!privacy.value) return
  savingMarketing.value = true
  marketingMsg.value = null
  try {
    const result = await setMarketingOptIn(value)
    auth.user = result.user
    await load()
    marketingMsg.value = value ? 'Listo: recibirás nuestras novedades.' : 'Listo: ya no recibirás correos de marketing.'
  } catch (e) {
    loadError.value = extractApiError(e, 'No se pudo guardar tu preferencia')
  } finally {
    savingMarketing.value = false
  }
}

async function exportData() {
  exportError.value = null
  exporting.value = true
  try {
    await downloadMyData()
  } catch {
    exportError.value = 'No se pudo generar el archivo. Intenta de nuevo en unos minutos.'
  } finally {
    exporting.value = false
  }
}

function cancelDelete() {
  deleting.value = false
  deleteError.value = null
  del.password = ''
  del.code = ''
  del.confirm = ''
}

async function confirmDelete() {
  deleteError.value = null
  deleteBusy.value = true
  try {
    await deleteMyAccount({
      password: del.password,
      confirm: del.confirm,
      code: del.code.trim() || undefined,
    })
    auth.logout()
    await router.replace({ path: '/login', query: { cuenta: 'eliminada' } })
  } catch (e) {
    deleteError.value = extractApiError(e, 'No se pudo eliminar la cuenta')
  } finally {
    deleteBusy.value = false
  }
}
</script>
