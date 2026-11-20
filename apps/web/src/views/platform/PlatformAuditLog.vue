<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Bitácora de acciones</h1>
    <p class="mb-5 mt-1 text-sm text-gray-500 dark:text-gray-400">
      Todo lo que se hace desde este panel queda registrado: quién, qué, sobre qué y cuándo. No se puede editar ni borrar
      desde aquí (se conserva 5 años).
    </p>

    <form class="mb-4 flex flex-wrap items-end gap-3" role="search" @submit.prevent="search">
      <div>
        <label for="audit-action" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de acción</label>
        <select id="audit-action" v-model="action" :class="inputCls">
          <option value="">Todas</option>
          <option value="tenant.">Negocios</option>
          <option value="promo.">Códigos de promoción</option>
          <option value="terms.">Términos</option>
          <option value="settings.">Integraciones</option>
          <option value="copyright_claim.">Derechos de autor</option>
          <option value="auth.">Inicios de sesión</option>
          <option value="account.">Seguridad de la cuenta</option>
        </select>
      </div>
      <div>
        <label for="audit-q" class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Buscar</label>
        <input id="audit-q" v-model="q" type="search" placeholder="Negocio, código o correo" :class="inputCls" />
      </div>
      <button type="submit" :class="secondaryBtn">Filtrar</button>
    </form>

    <p v-if="error" role="alert" class="mb-4 text-sm text-error-500">{{ error }}</p>

    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Acciones del administrador de la plataforma</caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" :class="thCls">Fecha y hora</th>
              <th scope="col" :class="thCls">Acción</th>
              <th scope="col" :class="thCls">Sobre</th>
              <th scope="col" :class="thCls">Detalle</th>
              <th scope="col" :class="thCls">Quién</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in items" :key="e.id" class="border-b border-gray-100 align-top last:border-0 dark:border-gray-800">
              <td :class="[tdCls, 'whitespace-nowrap']">{{ formatDateTime(e.createdAt) }}</td>
              <td :class="tdCls">{{ AUDIT_ACTION_LABELS[e.action] ?? e.action }}</td>
              <td :class="tdCls">
                <router-link
                  v-if="e.targetType === 'tenant' && e.targetId && e.action !== 'tenant.delete'"
                  :to="`/platform/tenants/${e.targetId}`"
                  class="text-brand-600 underline dark:text-brand-400"
                >
                  {{ e.targetLabel }}
                </router-link>
                <span v-else>{{ e.targetLabel || '—' }}</span>
              </td>
              <td :class="[tdCls, 'max-w-md']">{{ describe(e) }}</td>
              <td :class="tdCls">
                {{ e.actorEmail }}
                <span v-if="e.ip" class="block font-mono text-xs text-gray-400">{{ e.ip }}</span>
              </td>
            </tr>
            <tr v-if="!loading && items.length === 0">
              <td colspan="5" class="px-4 py-8 text-center text-gray-500">Sin registros.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="5" class="px-4 py-8 text-center text-gray-500">Cargando…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
      <span>{{ total }} registros</span>
      <span class="flex gap-2">
        <button type="button" :class="secondaryBtn" :disabled="offset === 0" @click="page(-1)">Anteriores</button>
        <button type="button" :class="secondaryBtn" :disabled="offset + PAGE >= total" @click="page(1)">Siguientes</button>
      </span>
    </div>
  </platform-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import { extractApiError } from '@/services/api'
import { AUDIT_ACTION_LABELS, fetchAuditLog, formatDateTime, type AuditEntry } from '@/services/compliance'

const PAGE = 50
const inputCls =
  'rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const secondaryBtn =
  'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'
const thCls = 'px-4 py-3 font-medium text-gray-500 dark:text-gray-400'
const tdCls = 'px-4 py-3 text-gray-600 dark:text-gray-300'

const items = ref<AuditEntry[]>([])
const total = ref(0)
const offset = ref(0)
const loading = ref(true)
const error = ref<string | null>(null)
const action = ref('')
const q = ref('')

const date = (v: unknown) => (typeof v === 'string' ? new Date(v).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—')

/** Resumen legible de los detalles de cada acción. */
function describe(e: AuditEntry): string {
  const d = (e.details ?? {}) as Record<string, unknown>
  switch (e.action) {
    case 'tenant.extend_trial':
      return `+${d.days} días: prueba hasta el ${date(d.newTrialEndsAt)}${d.stripeUpdated ? ' (también en Stripe)' : ''}${d.reason ? `. Motivo: ${d.reason}` : ''}`
    case 'tenant.suspend':
      return `Motivo: ${d.reason}.${d.billingPaused ? ' Cobro pausado en Stripe.' : ''} Avisos enviados: ${d.notified ?? 0}.`
    case 'tenant.reactivate':
      return `${d.billingResumed ? 'Cobro reanudado en Stripe. ' : ''}Avisos enviados: ${d.notified ?? 0}.`
    case 'promo.create':
      return `${d.trialDays ?? (d.extraTrialDays !== undefined ? Number(d.extraTrialDays) + 15 : '?')} días de prueba${d.maxUses ? `, máx. ${d.maxUses} usos` : ''}${d.expiresAt ? `, vence ${date(d.expiresAt)}` : ''}`
    case 'promo.delete':
      return `Se había usado ${d.usedCount ?? 0} veces`
    case 'copyright_claim.update':
      return `${d.from} → ${d.to}`
    case 'terms.publish':
      return `Antes: v${d.previousVersion ?? '—'}. ${d.notify === 'real' || d.notifyUsers ? `Avisos por correo: ${d.queued}.` : d.notify === 'test' ? `Aviso solo a cuentas de prueba: ${d.queued}.` : 'Sin aviso por correo.'}`
    case 'auth.login':
      return d.usedRecoveryCode ? 'Con código de recuperación' : 'Con app de autenticación'
    default:
      return ''
  }
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await fetchAuditLog({ offset: offset.value, limit: PAGE, action: action.value, q: q.value.trim() })
    items.value = data.items
    total.value = data.total
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo cargar la bitácora')
  } finally {
    loading.value = false
  }
}

onMounted(load)

function search() {
  offset.value = 0
  void load()
}

function page(direction: 1 | -1) {
  offset.value = Math.max(0, offset.value + direction * PAGE)
  void load()
}
</script>
