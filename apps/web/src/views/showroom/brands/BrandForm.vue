<template>
  <admin-layout>
    <page-breadcrumb
      :page-title="isEditing ? 'Editar marca' : 'Nueva marca'"
      :items="[{ label: 'Marcas', to: '/brands' }]"
    />

    <component-card :title="isEditing ? 'Editar marca' : 'Datos de la marca'">
      <form data-tour="brand-form" class="space-y-5" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <div data-tour="brand-name">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Nombre <span class="text-error-500">*</span>
            </label>
            <input v-model="form.name" required class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Renta mensual <span class="text-error-500">*</span>
            </label>
            <input v-model.number="form.monthlyRent" required type="number" min="0" step="0.01" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Espacio asignado</label>
            <input v-model="form.assignedSpace" placeholder="Ej. Pasillo A - Local 3" class="field" />
          </div>
          <div>
            <PhoneField v-model="form.phone" label="Celular" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Días de corte <span class="text-error-500">*</span>
            </label>
            <CutoffDaySlotsPicker
              v-model="form.cutoffDaySlots"
              :max-selectable="2"
              :disabled="cutoffLocked"
              :hint="cutoffHint"
            />
            <p v-if="cutoffLocked" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Definido en
              <router-link to="/preferences" class="text-brand-500 underline">Preferencias</router-link>.
              Al cambiarlo ahí se alinean todas las marcas.
            </p>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              % Comisión <span class="text-error-500">*</span>
            </label>
            <input v-model.number="form.commissionPercent" required type="number" min="0" max="100" step="0.01" class="field" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              ¿Quién paga la comisión de tarjeta? <span class="text-error-500">*</span>
            </label>
            <select v-model="form.cardFeePayer" required class="field">
              <option value="BRAND">Marca</option>
              <option value="CLIENT">Cliente</option>
              <option value="BUSINESS">Negocio</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              ¿Quién paga la comisión de transferencia? <span class="text-error-500">*</span>
            </label>
            <select v-model="form.transferFeePayer" required class="field">
              <option value="BRAND">Marca</option>
              <option value="CLIENT">Cliente</option>
              <option value="BUSINESS">Negocio</option>
            </select>
          </div>
        </div>

        <label v-if="isEditing" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input v-model="form.active" type="checkbox" />
          Marca activa
        </label>

        <p v-if="formError" class="text-sm text-error-500">{{ formError }}</p>

        <div class="flex justify-end gap-2">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300" @click="router.push('/brands')">
            Cancelar
          </button>
          <button
            data-tour="brand-save"
            type="submit"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </button>
        </div>
      </form>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import PhoneField from '@/components/forms/PhoneField.vue'
import CutoffDaySlotsPicker from '@/components/brands/CutoffDaySlotsPicker.vue'
import api, { fetchPreferences, type Brand, type CommissionFeePayer } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { formatCutoffSlotsPreview } from '@/utils/cutoffDays'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const brandId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const isEditing = computed(() => !!brandId.value)

const saving = ref(false)
const formError = ref<string | null>(null)
const cutoffLocked = ref(false)

const form = reactive({
  name: '',
  monthlyRent: 0 as number | null,
  assignedSpace: '',
  phone: '',
  cutoffDaySlots: [] as number[],
  commissionPercent: 0 as number | null,
  cardFeePayer: 'BRAND' as CommissionFeePayer,
  transferFeePayer: 'BRAND' as CommissionFeePayer,
  active: true,
})

const cutoffHint = computed(() => {
  const preview = formatCutoffSlotsPreview(form.cutoffDaySlots)
  const base =
    'Elige 1 o 2 días del mes. Si marcas 29, 30 o 31 en un mes más corto, el corte se recorre al último día real.'
  return preview ? `${base} Este mes: día(s) ${preview}.` : base
})

async function loadPrefs() {
  try {
    const prefs = await fetchPreferences()
    if (prefs.cutoffType === 'MONTHLY_FIXED' && prefs.cutoffDaySlots.length > 0) {
      cutoffLocked.value = true
      form.cutoffDaySlots = [...prefs.cutoffDaySlots].sort((a, b) => a - b)
    }
  } catch {
    cutoffLocked.value = false
  }
}

async function loadBrand() {
  if (!brandId.value) {
    if (route.query.house === '1') {
      router.replace('/brands/mine')
    }
    return
  }
  const { data } = await api.get<Brand>(`/brands/${brandId.value}`)
  form.name = data.name
  form.monthlyRent = Number(data.monthlyRent)
  form.assignedSpace = data.assignedSpace || ''
  form.phone = data.phone || ''
  if (!cutoffLocked.value) {
    form.cutoffDaySlots = [...(data.cutoffDaySlots || [])].sort((a, b) => a - b)
  }
  form.commissionPercent = Number(data.commissionPercent)
  form.cardFeePayer = data.cardFeePayer
  form.transferFeePayer = data.transferFeePayer
  form.active = data.active
}

function validate(): string | null {
  if (!form.name.trim()) return 'El nombre es obligatorio'
  if (form.monthlyRent == null || Number.isNaN(form.monthlyRent) || form.monthlyRent < 0) {
    return 'La renta mensual es obligatoria'
  }
  if (!cutoffLocked.value && form.cutoffDaySlots.length === 0) {
    return 'Elige al menos un día de corte'
  }
  if (form.cutoffDaySlots.length > 2) return 'Máximo 2 días de corte'
  if (form.commissionPercent == null || Number.isNaN(form.commissionPercent)) {
    return 'El porcentaje de comisión es obligatorio'
  }
  return null
}

async function save() {
  formError.value = null
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }

  const payload = {
    name: form.name.trim(),
    monthlyRent: form.monthlyRent,
    assignedSpace: form.assignedSpace.trim() || null,
    phone: form.phone.trim() || null,
    cutoffDaySlots: form.cutoffDaySlots,
    commissionPercent: form.commissionPercent,
    cardFeePayer: form.cardFeePayer,
    transferFeePayer: form.transferFeePayer,
    ...(isEditing.value ? { active: form.active } : {}),
  }

  saving.value = true
  try {
    if (isEditing.value && brandId.value) {
      await api.patch(`/brands/${brandId.value}`, payload)
      router.push('/brands')
    } else {
      const { data } = await api.post<Brand>('/brands', payload)
      await auth.fetchMe()
      router.push(`/brands/${data.id}/owner`)
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo guardar la marca'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await loadPrefs()
  await loadBrand()
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
