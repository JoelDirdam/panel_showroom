<template>
  <admin-layout>
    <page-breadcrumb
      page-title="Mi marca"
      :items="[{ label: 'Marcas', to: '/brands' }]"
    />

    <component-card title="Datos de tu marca propia">
      <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Registra la marca de tu negocio para vender productos propios (showroom, boutique, cafetería, etc.).
      </p>

      <form data-tour="house-brand-form" class="space-y-5" @submit.prevent="save">
        <div class="grid gap-4 sm:grid-cols-2">
          <div data-tour="brand-name" class="sm:col-span-2">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Nombre de la marca <span class="text-error-500">*</span>
            </label>
            <input
              v-model="form.name"
              required
              class="field"
              placeholder="Ej. el nombre de tu negocio"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Recomendamos ingresar el nombre de tu negocio
              <template v-if="businessName"> ({{ businessName }})</template>.
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Espacio asignado
              <span class="font-normal text-gray-400">(opcional)</span>
            </label>
            <input
              v-model="form.assignedSpace"
              placeholder="Ej. Pasillo A - Local 3"
              class="field"
            />
          </div>

          <div>
            <PhoneField
              v-model="form.phone"
              label="Celular"
              :disabled="useAccountPhone"
              :hint="useAccountPhone ? 'Usando el celular de tu cuenta' : undefined"
            />
            <FormCheckbox
              v-if="accountPhone"
              v-model="useAccountPhone"
              class="mt-2"
              align="center"
            >
              Usar el mismo celular de mi cuenta
            </FormCheckbox>
            <p v-else class="mt-1 text-xs text-gray-400">
              No hay celular en tu cuenta; puedes capturarlo aquí.
            </p>
          </div>

          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Fecha de corte
            </label>
            <FormCheckbox v-model="noCutoffDate" class="mb-2" align="center">
              Sin fecha de corte (marca propia)
            </FormCheckbox>
            <input
              v-if="!noCutoffDate"
              v-model="form.cutoffDate"
              type="date"
              class="field"
            />
          </div>

          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              % Comisión
            </label>
            <FormCheckbox v-model="noCommission" class="mb-2" align="center">
              Sin comisión (marca propia)
            </FormCheckbox>
            <input
              v-if="!noCommission"
              v-model.number="form.commissionPercent"
              type="number"
              min="0"
              max="100"
              step="0.01"
              class="field"
            />
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

        <p v-if="formError" class="text-sm text-error-500">{{ formError }}</p>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300"
            @click="router.push('/brands')"
          >
            Cancelar
          </button>
          <button
            data-tour="house-brand-save"
            type="submit"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="saving"
          >
            {{ saving ? 'Guardando…' : 'Registrar mi marca' }}
          </button>
        </div>
      </form>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import PhoneField from '@/components/forms/PhoneField.vue'
import FormCheckbox from '@/components/forms/FormCheckbox.vue'
import api, { type Brand, type CommissionFeePayer } from '@/services/api'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const businessName = computed(() => auth.user?.tenant?.name?.trim() || '')
const accountPhone = computed(() => auth.user?.phone?.trim() || '')
const alreadyHasHouseBrand = computed(() => !!auth.user?.setupStatus?.hasHouseBrand)

const saving = ref(false)
const formError = ref<string | null>(null)
const useAccountPhone = ref(false)
const noCutoffDate = ref(true)
const noCommission = ref(true)

const form = reactive({
  name: '',
  assignedSpace: '',
  phone: '',
  cutoffDate: '',
  commissionPercent: 0 as number | null,
  cardFeePayer: 'BUSINESS' as CommissionFeePayer,
  transferFeePayer: 'BUSINESS' as CommissionFeePayer,
})

watch(useAccountPhone, (enabled) => {
  if (enabled && accountPhone.value) {
    form.phone = accountPhone.value
  }
})

function validate(): string | null {
  if (!form.name.trim()) return 'El nombre de la marca es obligatorio'
  if (!noCutoffDate.value && !form.cutoffDate) {
    return 'Indica la fecha de corte o marca “Sin fecha de corte”'
  }
  if (
    !noCommission.value &&
    (form.commissionPercent == null || Number.isNaN(form.commissionPercent))
  ) {
    return 'Indica el porcentaje de comisión o marca “Sin comisión”'
  }
  return null
}

async function save() {
  formError.value = null
  if (alreadyHasHouseBrand.value) {
    formError.value = 'Ya tienes una marca propia registrada'
    return
  }

  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }

  const payload = {
    name: form.name.trim(),
    monthlyRent: 0,
    assignedSpace: form.assignedSpace.trim() || null,
    phone: form.phone.trim() || null,
    cutoffDate: noCutoffDate.value ? null : form.cutoffDate,
    commissionPercent: noCommission.value ? 0 : form.commissionPercent,
    cardFeePayer: form.cardFeePayer,
    transferFeePayer: form.transferFeePayer,
    isHouseBrand: true,
  }

  saving.value = true
  try {
    const { data } = await api.post<Brand>('/brands', payload)
    await auth.fetchMe()
    router.push(`/brands/${data.id}`)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo registrar tu marca'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (alreadyHasHouseBrand.value) {
    const houseBrandId = auth.user?.setupStatus?.houseBrandId
    router.replace(houseBrandId ? `/brands/${houseBrandId}` : '/brands')
    return
  }

  if (businessName.value) {
    form.name = businessName.value
  }
  if (accountPhone.value) {
    useAccountPhone.value = true
    form.phone = accountPhone.value
  }
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
