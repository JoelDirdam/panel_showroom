<template>
  <platform-layout>
    <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Códigos de promoción</h1>
    <p class="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
      Sin código no hay prueba gratis: el negocio paga para empezar. Un código puede dar días de prueba gratis (sin
      tarjeta), un descuento en las mensualidades (se aplica al pagar con tarjeta) o ambas cosas.
    </p>

    <!-- Crear -->
    <form
      class="mb-6 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
      aria-labelledby="new-promo-title"
      @submit.prevent="create"
    >
      <h2 id="new-promo-title" class="text-base font-semibold text-gray-800 dark:text-white">Crear código</h2>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label for="promo-code" :class="labelCls">Código *</label>
          <input id="promo-code" v-model="form.code" type="text" required maxlength="30" placeholder="VERANO26" :class="[inputCls, 'uppercase']" />
        </div>
        <div>
          <label for="promo-days" :class="labelCls">Días de prueba gratis</label>
          <input id="promo-days" v-model.number="form.trialDays" type="number" min="0" max="365" required :class="inputCls" />
        </div>
        <div>
          <label for="promo-max" :class="labelCls">Usos máximos</label>
          <input id="promo-max" v-model="form.maxUses" type="number" min="1" placeholder="Sin límite" :class="inputCls" />
        </div>
        <div>
          <label for="promo-exp" :class="labelCls">Vence el</label>
          <input id="promo-exp" v-model="form.expiresAt" type="date" :class="inputCls" />
        </div>
        <div>
          <label for="promo-disc-type" :class="labelCls">Descuento</label>
          <select id="promo-disc-type" v-model="form.discountType" :class="inputCls">
            <option value="none">Sin descuento</option>
            <option value="percent">Porcentaje (%)</option>
            <option value="amount">Monto fijo ($ MXN)</option>
          </select>
        </div>
        <div v-if="form.discountType !== 'none'">
          <label for="promo-disc-value" :class="labelCls">{{ form.discountType === 'percent' ? '% de descuento *' : 'Pesos de descuento *' }}</label>
          <input
            id="promo-disc-value"
            v-model.number="form.discountValue"
            type="number"
            min="1"
            :max="form.discountType === 'percent' ? 100 : 100000"
            required
            :class="inputCls"
          />
        </div>
        <div v-if="form.discountType !== 'none'">
          <label for="promo-disc-months" :class="labelCls">Mensualidades con descuento *</label>
          <input id="promo-disc-months" v-model.number="form.discountMonths" type="number" min="1" max="36" required :class="inputCls" />
        </div>
        <fieldset class="sm:col-span-2">
          <legend :class="labelCls">Planes donde aplica (ninguno marcado = todos)</legend>
          <div class="flex flex-wrap gap-x-4 gap-y-2">
            <label v-for="p in PLAN_OPTIONS" :key="p.type" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input v-model="form.planTypes" type="checkbox" :value="p.type" class="h-4 w-4 rounded border-gray-300" />
              {{ p.name }}
            </label>
          </div>
        </fieldset>
        <div>
          <label for="promo-note" :class="labelCls">Nota interna</label>
          <input id="promo-note" v-model="form.note" type="text" maxlength="300" placeholder="Campaña, aliado…" :class="inputCls" />
        </div>
      </div>
      <p v-if="formError" role="alert" class="mt-3 text-sm text-error-500">{{ formError }}</p>
      <button type="submit" :disabled="saving" class="mt-4 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
        {{ saving ? 'Creando…' : 'Crear código' }}
      </button>
    </form>

    <p v-if="error" role="alert" class="mb-4 text-sm text-error-500">{{ error }}</p>
    <p v-if="message" role="status" class="mb-4 text-sm text-success-600 dark:text-success-400">{{ message }}</p>

    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <caption class="sr-only">Códigos de promoción existentes</caption>
          <thead>
            <tr class="border-b border-gray-100 dark:border-gray-800">
              <th scope="col" :class="thCls">Código</th>
              <th scope="col" :class="thCls">Beneficio</th>
              <th scope="col" :class="thCls">Planes</th>
              <th scope="col" :class="thCls">Usos</th>
              <th scope="col" :class="thCls">Vence</th>
              <th scope="col" :class="thCls">Estado</th>
              <th scope="col" :class="thCls">Nota</th>
              <th scope="col" :class="thCls"><span class="sr-only">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in codes" :key="c.id" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
              <th scope="row" class="px-4 py-3 font-mono font-semibold text-gray-800 dark:text-white">{{ c.code }}</th>
              <td :class="tdCls">{{ benefit(c) }}</td>
              <td :class="tdCls">{{ c.planTypes?.length ? c.planTypes.map(planName).join(', ') : 'Todos' }}</td>
              <td :class="tdCls">{{ c.usedCount }}{{ c.maxUses !== null ? ` / ${c.maxUses}` : '' }}</td>
              <td :class="tdCls">{{ c.expiresAt ? formatDate(c.expiresAt) : 'Sin vencimiento' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium" :class="state(c).cls">{{ state(c).label }}</span>
              </td>
              <td :class="tdCls">{{ c.note || '—' }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" class="mr-3 text-sm font-medium text-brand-600 underline dark:text-brand-400" :disabled="busyId === c.id" @click="toggle(c)">
                  {{ c.active ? 'Desactivar' : 'Activar' }}
                </button>
                <button
                  v-if="confirmDeleteId !== c.id"
                  type="button"
                  class="text-sm font-medium text-error-600 underline dark:text-error-400"
                  @click="confirmDeleteId = c.id"
                >
                  Quitar
                </button>
                <span v-else class="inline-flex items-center gap-2">
                  <button type="button" class="text-sm font-semibold text-error-600 underline dark:text-error-400" :disabled="busyId === c.id" @click="remove(c)">
                    Sí, quitar {{ c.code }}
                  </button>
                  <button type="button" class="text-sm text-gray-600 underline dark:text-gray-300" @click="confirmDeleteId = null">No</button>
                </span>
              </td>
            </tr>
            <tr v-if="!loading && codes.length === 0">
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">Aún no hay códigos.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="8" class="px-4 py-8 text-center text-gray-500">Cargando…</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
      Desactivar o quitar un código no cambia las pruebas ni los descuentos que ya se otorgaron con él. Los códigos de
      recomendación de cada negocio se generan solos y dan 50% de descuento en la primera mensualidad.
    </p>
  </platform-layout>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import PlatformLayout from '@/components/layout/PlatformLayout.vue'
import { extractApiError } from '@/services/api'
import { planInfo } from '@/lib/plans'
import {
  createPromoCode,
  deletePromoCode,
  fetchPromoCodes,
  updatePromoCode,
  type PromoCode,
  type PromoPlanType,
} from '@/services/compliance'

const PLAN_OPTIONS: { type: PromoPlanType; name: string }[] = (
  ['CITAS_PANEL', 'CITAS_IA', 'NEGOCIO', 'CITAS_RECORDATORIOS'] as PromoPlanType[]
).map((type) => ({ type, name: planInfo(type)?.name ?? type }))

function planName(type: PromoPlanType): string {
  return planInfo(type)?.name ?? type
}

function benefit(c: PromoCode): string {
  const parts: string[] = []
  if (c.discountPercent || c.discountAmountMxn) {
    const what = c.discountPercent ? `${c.discountPercent}%` : `$${c.discountAmountMxn}`
    const months = c.discountMonths ?? 1
    parts.push(`${what} de descuento × ${months} ${months === 1 ? 'mes' : 'meses'}`)
  }
  if (c.trialDays > 0) parts.push(`${c.trialDays} días de prueba gratis`)
  return parts.join(' · ') || '—'
}

const labelCls = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300'
const inputCls =
  'w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90'
const thCls = 'px-4 py-3 font-medium text-gray-500 dark:text-gray-400'
const tdCls = 'px-4 py-3 text-gray-600 dark:text-gray-300'

const codes = ref<PromoCode[]>([])
const loading = ref(true)
const saving = ref(false)
const busyId = ref<string | null>(null)
const confirmDeleteId = ref<string | null>(null)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const message = ref<string | null>(null)
const emptyForm = () => ({
  code: '',
  trialDays: 15,
  maxUses: '' as string | number,
  expiresAt: '',
  note: '',
  discountType: 'none' as 'none' | 'percent' | 'amount',
  discountValue: 10,
  discountMonths: 1,
  planTypes: [] as PromoPlanType[],
})
const form = reactive(emptyForm())

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
}

function state(c: PromoCode): { label: string; cls: string } {
  const off = 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
  if (!c.active) return { label: 'Inactivo', cls: off }
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: 'Vencido', cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' }
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return { label: 'Agotado', cls: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400' }
  return { label: 'Activo', cls: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' }
}

async function load() {
  try {
    codes.value = await fetchPromoCodes()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudieron cargar los códigos')
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function create() {
  formError.value = null
  message.value = null
  const code = form.code.trim()
  if (!/^[A-Za-z0-9_-]{3,30}$/.test(code)) {
    formError.value = 'El código debe tener de 3 a 30 letras, números, guion o guion bajo (sin espacios).'
    return
  }
  const maxUses = form.maxUses === '' ? null : Number(form.maxUses)
  const hasDiscount = form.discountType !== 'none'
  if (!hasDiscount && Number(form.trialDays) === 0) {
    formError.value = 'El código debe dar días extra de prueba o un descuento.'
    return
  }
  saving.value = true
  try {
    const created = await createPromoCode({
      code,
      trialDays: Number(form.trialDays),
      maxUses,
      // Vence al final del día elegido (hora del centro de México).
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59-06:00`).toISOString() : null,
      note: form.note.trim() || null,
      discountPercent: form.discountType === 'percent' ? Number(form.discountValue) : null,
      discountAmountMxn: form.discountType === 'amount' ? Number(form.discountValue) : null,
      discountMonths: hasDiscount ? Number(form.discountMonths) : null,
      planTypes: [...form.planTypes],
    })
    codes.value = [created, ...codes.value]
    message.value = `Código ${created.code} creado.`
    Object.assign(form, emptyForm())
  } catch (e) {
    formError.value = extractApiError(e, 'No se pudo crear el código')
  } finally {
    saving.value = false
  }
}

async function toggle(c: PromoCode) {
  error.value = null
  message.value = null
  busyId.value = c.id
  try {
    const updated = await updatePromoCode(c.id, { active: !c.active })
    codes.value = codes.value.map((x) => (x.id === c.id ? updated : x))
    message.value = `Código ${updated.code} ${updated.active ? 'activado' : 'desactivado'}.`
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo actualizar el código')
  } finally {
    busyId.value = null
  }
}

async function remove(c: PromoCode) {
  error.value = null
  message.value = null
  busyId.value = c.id
  try {
    await deletePromoCode(c.id)
    codes.value = codes.value.filter((x) => x.id !== c.id)
    message.value = `Código ${c.code} eliminado.`
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo quitar el código')
  } finally {
    busyId.value = null
    confirmDeleteId.value = null
  }
}
</script>
