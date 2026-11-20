<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Legal y cumplimiento</h1>
    <p class="mb-5 mt-1 text-sm text-gray-500 dark:text-gray-400">
      Constancias de aceptación de términos, consentimientos, reclamos de derechos de autor y conservación de datos.
    </p>

    <div role="tablist" aria-label="Secciones legales" class="mb-5 flex flex-wrap gap-1" @keydown="onTabKey">
      <button
        v-for="t in tabs"
        :id="`tab-${t.id}`"
        :key="t.id"
        type="button"
        role="tab"
        :aria-selected="tab === t.id"
        :aria-controls="`panel-${t.id}`"
        :tabindex="tab === t.id ? 0 : -1"
        class="rounded-lg px-3 py-2 text-sm font-medium"
        :class="
          tab === t.id
            ? 'bg-brand-500 text-white'
            : 'bg-white text-gray-600 ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:bg-white/[0.03] dark:text-gray-300 dark:ring-gray-800'
        "
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </div>

    <p v-if="error" role="alert" class="mb-4 text-sm text-error-500">{{ error }}</p>

    <!-- Aceptaciones de términos -->
    <section v-show="tab === 'terms'" id="panel-terms" role="tabpanel" aria-labelledby="tab-terms" :class="cardCls">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-gray-800 dark:text-white">Quién aceptó los términos y cuándo</h2>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Versiones publicadas:
            <span v-for="(v, i) in versions" :key="v.version">
              <strong>{{ v.version }}</strong> ({{ formatDateTime(v.publishedAt) }}){{ i < versions.length - 1 ? ' · ' : '' }}
            </span>
          </p>
        </div>
        <form class="flex gap-2" role="search" @submit.prevent="searchAcceptances">
          <label for="acc-q" class="sr-only">Buscar por correo, nombre o versión</label>
          <input id="acc-q" v-model="q" type="search" placeholder="Correo, nombre o versión" :class="inputCls" />
          <button type="submit" :class="secondaryBtn">Buscar</button>
        </form>
      </div>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Aceptaciones de términos y condiciones</caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" :class="thCls">Correo</th>
              <th scope="col" :class="thCls">Firmó como</th>
              <th scope="col" :class="thCls">Versión</th>
              <th scope="col" :class="thCls">Fecha y hora</th>
              <th scope="col" :class="thCls">IP</th>
              <th scope="col" :class="thCls">Origen</th>
              <th scope="col" :class="thCls">Cuenta</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in acceptances" :key="a.id" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <td :class="tdCls">{{ a.email || a.user?.email || '—' }}</td>
              <td :class="tdCls">{{ a.signedName }}</td>
              <td :class="tdCls">
                {{ a.version }}
                <span v-if="a.contentHash" class="block font-mono text-[11px] text-gray-400" :title="`SHA-256 del texto aceptado: ${a.contentHash}`">
                  {{ a.contentHash.slice(0, 10) }}…
                </span>
              </td>
              <td :class="tdCls">{{ formatDateTime(a.acceptedAt) }}</td>
              <td :class="[tdCls, 'font-mono text-xs']">{{ a.ip || '—' }}</td>
              <td :class="tdCls">{{ a.source === 'register' ? 'Registro' : 'Nueva versión' }}</td>
              <td :class="tdCls">{{ a.user ? 'Activa' : `Eliminada ${a.userDeletedAt ? formatDateTime(a.userDeletedAt) : ''}` }}</td>
            </tr>
            <tr v-if="acceptances.length === 0">
              <td colspan="7" class="px-3 py-8 text-center text-gray-500">{{ loadingTab ? 'Cargando…' : 'Sin registros.' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{{ acceptanceTotal }} registros</span>
        <span class="flex gap-2">
          <button type="button" :class="secondaryBtn" :disabled="offset === 0" @click="page(-1)">Anteriores</button>
          <button type="button" :class="secondaryBtn" :disabled="offset + 25 >= acceptanceTotal" @click="page(1)">Siguientes</button>
        </span>
      </div>
    </section>

    <!-- Consentimientos de marketing -->
    <section v-show="tab === 'consents'" id="panel-consents" role="tabpanel" aria-labelledby="tab-consents" :class="cardCls">
      <h2 class="text-base font-semibold text-gray-800 dark:text-white">Consentimientos para correos de marketing</h2>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Cada vez que alguien acepta o retira su consentimiento queda un registro.</p>
      <div class="mt-4 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Bitácora de consentimientos de marketing</caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" :class="thCls">Correo</th>
              <th scope="col" :class="thCls">Decisión</th>
              <th scope="col" :class="thCls">Origen</th>
              <th scope="col" :class="thCls">Fecha y hora</th>
              <th scope="col" :class="thCls">IP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in consents" :key="c.id" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <td :class="tdCls">{{ c.email }}</td>
              <td :class="tdCls">{{ c.granted ? 'Aceptó' : 'Retiró' }}</td>
              <td :class="tdCls">{{ consentSource[c.source] ?? c.source }}</td>
              <td :class="tdCls">{{ formatDateTime(c.createdAt) }}</td>
              <td :class="[tdCls, 'font-mono text-xs']">{{ c.ip || '—' }}</td>
            </tr>
            <tr v-if="consents.length === 0">
              <td colspan="5" class="px-3 py-8 text-center text-gray-500">{{ loadingTab ? 'Cargando…' : 'Sin registros.' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Reclamos de derechos de autor -->
    <section v-show="tab === 'claims'" id="panel-claims" role="tabpanel" aria-labelledby="tab-claims" :class="cardCls">
      <h2 class="text-base font-semibold text-gray-800 dark:text-white">Reclamos de derechos de autor</h2>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Recibidos por <router-link to="/derechos-de-autor" class="underline">/derechos-de-autor</router-link>. Responde al
        reclamante por correo y registra aquí el resultado.
      </p>
      <p v-if="claims.length === 0" class="mt-6 text-center text-sm text-gray-500">{{ loadingTab ? 'Cargando…' : 'No hay reclamos.' }}</p>
      <ul class="mt-4 space-y-4">
        <li v-for="c in claims" :key="c.id" class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <p class="text-sm font-semibold text-gray-800 dark:text-white">
              {{ c.claimantName }}
              <a :href="`mailto:${c.claimantEmail}`" class="font-normal text-brand-600 underline dark:text-brand-400">{{ c.claimantEmail }}</a>
            </p>
            <span class="text-xs text-gray-500">{{ formatDateTime(c.createdAt) }} · folio {{ c.id }}</span>
          </div>
          <dl class="mt-2 grid gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-[9rem_1fr]">
            <dt class="font-medium text-gray-800 dark:text-gray-100">Titular</dt>
            <dd>{{ c.rightsHolder }}</dd>
            <dt class="font-medium text-gray-800 dark:text-gray-100">Obra</dt>
            <dd class="whitespace-pre-wrap">{{ c.workDescription }}</dd>
            <dt class="font-medium text-gray-800 dark:text-gray-100">Contenido señalado</dt>
            <dd class="whitespace-pre-wrap break-all">{{ c.infringingUrl }}</dd>
            <template v-if="c.details">
              <dt class="font-medium text-gray-800 dark:text-gray-100">Detalles</dt>
              <dd class="whitespace-pre-wrap">{{ c.details }}</dd>
            </template>
            <dt class="font-medium text-gray-800 dark:text-gray-100">Firma</dt>
            <dd>{{ c.signature }}</dd>
          </dl>
          <div class="mt-3 grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
            <div>
              <label :for="`claim-status-${c.id}`" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Estado</label>
              <select :id="`claim-status-${c.id}`" v-model="c.status" :class="inputCls">
                <option value="OPEN">Abierto</option>
                <option value="IN_REVIEW">En revisión</option>
                <option value="RESOLVED">Resuelto (contenido retirado)</option>
                <option value="REJECTED">No procede</option>
              </select>
            </div>
            <div>
              <label :for="`claim-note-${c.id}`" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nota interna</label>
              <input :id="`claim-note-${c.id}`" v-model="c.adminNote" type="text" :class="[inputCls, 'w-full']" />
            </div>
            <button type="button" :class="secondaryBtn" :disabled="savingClaim === c.id" @click="saveClaim(c)">
              {{ savingClaim === c.id ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </li>
      </ul>
    </section>

    <!-- Conservación -->
    <section v-show="tab === 'retention'" id="panel-retention" role="tabpanel" aria-labelledby="tab-retention" :class="cardCls">
      <h2 class="text-base font-semibold text-gray-800 dark:text-white">Conservación y eliminación de datos</h2>
      <template v-if="retention">
        <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>Cuentas sin suscripción vigente: se eliminan a los <strong>{{ retention.policy.inactiveAccountMonths }} meses</strong>, con aviso por correo {{ retention.policy.inactiveNoticeDays }} días antes.</li>
          <li>Registros que no verificaron su correo: <strong>{{ retention.policy.unverifiedSignupDays }} días</strong>.</li>
          <li>Evidencia legal tras eliminar una cuenta (términos, consentimientos, bitácora): <strong>{{ retention.policy.evidenceYears }} años</strong>.</li>
          <li>Aviso de renovación automática: <strong>{{ retention.policy.renewalNoticeDays }} días</strong> antes de cada cobro.</li>
          <li>Bitácora de acciones de plataforma: <strong>{{ retention.policy.adminAuditYears }} años</strong>.</li>
        </ul>
        <p class="mt-3 text-sm" :class="retention.purgeEnabled ? 'text-gray-600 dark:text-gray-300' : 'text-warning-700 dark:text-warning-400'">
          Eliminación automática: <strong>{{ retention.purgeEnabled ? 'activa' : 'apagada (RETENTION_PURGE_DISABLED)' }}</strong>.
          Correo: <strong>{{ retention.emailConfigured ? 'configurado' : 'NO configurado: no se envían avisos ni se elimina ninguna cuenta inactiva' }}</strong>.
        </p>

        <h3 class="mt-5 text-sm font-semibold text-gray-800 dark:text-white">Cuentas inactivas en proceso</h3>
        <p v-if="retention.inactiveTenants.length === 0" class="mt-2 text-sm text-gray-500">Ninguna por ahora.</p>
        <div v-else class="mt-2 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <caption class="sr-only">Cuentas inactivas próximas a eliminarse</caption>
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800">
                <th scope="col" :class="thCls">Negocio</th>
                <th scope="col" :class="thCls">Sin acceso desde</th>
                <th scope="col" :class="thCls">Aviso enviado</th>
                <th scope="col" :class="thCls">Se elimina a partir de</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in retention.inactiveTenants" :key="t.id" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td :class="tdCls"><router-link :to="`/platform/tenants/${t.id}`" class="text-brand-600 underline dark:text-brand-400">{{ t.name }}</router-link></td>
                <td :class="tdCls">{{ formatDateTime(t.accessEndedAt) }}</td>
                <td :class="tdCls">{{ t.noticeSentAt ? formatDateTime(t.noticeSentAt) : 'Pendiente' }}</td>
                <td :class="tdCls">{{ formatDateTime(t.deleteAfter) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <h3 class="mt-6 text-sm font-semibold text-gray-800 dark:text-white">Cuentas eliminadas</h3>
      <p v-if="deletions.length === 0" class="mt-2 text-sm text-gray-500">{{ loadingTab ? 'Cargando…' : 'Sin registros.' }}</p>
      <div v-else class="mt-2 overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Bitácora de cuentas eliminadas</caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" :class="thCls">Correo</th>
              <th scope="col" :class="thCls">Negocio</th>
              <th scope="col" :class="thCls">Motivo</th>
              <th scope="col" :class="thCls">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in deletions" :key="d.id" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <td :class="tdCls">{{ d.email || '—' }}</td>
              <td :class="tdCls">{{ d.tenantName || (d.scope === 'USER' ? 'Solo el usuario' : '—') }}</td>
              <td :class="tdCls">{{ deletionReason[d.reason] ?? d.reason }}</td>
              <td :class="tdCls">{{ formatDateTime(d.deletedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </platform-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import { extractApiError } from '@/services/api'
import {
  fetchAcceptances,
  fetchConsents,
  fetchCopyrightClaims,
  fetchDeletions,
  fetchRetention,
  formatDateTime,
  updateCopyrightClaim,
  type ConsentRow,
  type CopyrightClaimRow,
  type DeletionRow,
  type RetentionStatus,
  type TermsAcceptanceRow,
} from '@/services/compliance'

type TabId = 'terms' | 'consents' | 'claims' | 'retention'
const tabs: { id: TabId; label: string }[] = [
  { id: 'terms', label: 'Aceptación de términos' },
  { id: 'consents', label: 'Consentimientos de marketing' },
  { id: 'claims', label: 'Derechos de autor' },
  { id: 'retention', label: 'Conservación de datos' },
]

const cardCls = 'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]'
const thCls = 'px-3 py-2.5 font-medium text-gray-500 dark:text-gray-400'
const tdCls = 'px-3 py-2.5 align-top text-gray-600 dark:text-gray-300'
const inputCls =
  'rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const secondaryBtn =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'

const consentSource: Record<string, string> = {
  register: 'Registro',
  account: 'Mi cuenta',
  unsubscribe_link: 'Enlace de baja',
}
const deletionReason: Record<string, string> = {
  user_request: 'A petición del titular',
  super_admin: 'Eliminada desde plataforma',
  retention_inactive: 'Conservación: cuenta inactiva',
  retention_unverified: 'Conservación: registro sin verificar',
}

const tab = ref<TabId>('terms')
const error = ref<string | null>(null)
const loadingTab = ref(false)

const acceptances = ref<TermsAcceptanceRow[]>([])
const acceptanceTotal = ref(0)
const versions = ref<{ version: string; title: string; publishedAt: string }[]>([])
const q = ref('')
const offset = ref(0)
const consents = ref<ConsentRow[]>([])
const claims = ref<CopyrightClaimRow[]>([])
const savingClaim = ref<string | null>(null)
const retention = ref<RetentionStatus | null>(null)
const deletions = ref<DeletionRow[]>([])
const loaded = new Set<TabId>()

async function loadAcceptances() {
  const data = await fetchAcceptances(q.value.trim(), offset.value)
  acceptances.value = data.items
  acceptanceTotal.value = data.total
  versions.value = data.versions
}

async function loadTab(id: TabId, force = false) {
  if (loaded.has(id) && !force) return
  error.value = null
  loadingTab.value = true
  try {
    if (id === 'terms') await loadAcceptances()
    if (id === 'consents') consents.value = (await fetchConsents()).items
    if (id === 'claims') claims.value = (await fetchCopyrightClaims()).items
    if (id === 'retention') {
      ;[retention.value, deletions.value] = await Promise.all([
        fetchRetention(),
        fetchDeletions().then((d) => d.items),
      ])
    }
    loaded.add(id)
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar la información')
  } finally {
    loadingTab.value = false
  }
}

onMounted(() => loadTab('terms'))
watch(tab, (id) => loadTab(id))

function searchAcceptances() {
  offset.value = 0
  void loadTab('terms', true)
}

function page(direction: 1 | -1) {
  offset.value = Math.max(0, offset.value + direction * 25)
  void loadTab('terms', true)
}

/** Flechas izquierda/derecha entre pestañas (patrón de pestañas accesible). */
function onTabKey(event: KeyboardEvent) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  const index = tabs.findIndex((t) => t.id === tab.value)
  const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]
  tab.value = next.id
  document.getElementById(`tab-${next.id}`)?.focus()
  event.preventDefault()
}

async function saveClaim(c: CopyrightClaimRow) {
  error.value = null
  savingClaim.value = c.id
  try {
    const updated = await updateCopyrightClaim(c.id, { status: c.status, adminNote: c.adminNote })
    claims.value = claims.value.map((x) => (x.id === c.id ? updated : x))
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo guardar el reclamo')
  } finally {
    savingClaim.value = null
  }
}
</script>
