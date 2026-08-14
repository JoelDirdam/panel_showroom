<template>
  <admin-layout>
    <page-breadcrumb page-title="Empleados" />

    <component-card title="Personal del negocio">
      <div class="mb-4 flex justify-end">
        <button
          type="button"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          + Nuevo empleado
        </button>
      </div>

      <p v-if="error" class="mb-3 text-sm text-error-500">{{ error }}</p>
      <p v-if="success" class="mb-3 text-sm text-success-600">{{ success }}</p>

      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-gray-500 dark:border-gray-800">
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">Email</th>
              <th class="py-3 pr-4">Teléfono</th>
              <th class="py-3 pr-4">Estado</th>
              <th class="py-3 pr-4">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="emp in employees"
              :key="emp.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ emp.name }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ emp.email || '—' }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ emp.phone || '—' }}</td>
              <td class="py-3 pr-4">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="
                    emp.active
                      ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800'
                  "
                >
                  {{ emp.active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="py-3 pr-4">
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="text-sm text-brand-600 hover:underline"
                    @click="openEdit(emp)"
                  >
                    Editar
                  </button>
                  <button
                    v-if="emp.active"
                    type="button"
                    class="text-sm text-error-500 hover:underline"
                    @click="deactivate(emp)"
                  >
                    Desactivar
                  </button>
                  <button
                    v-else
                    type="button"
                    class="text-sm text-success-600 hover:underline"
                    @click="reactivate(emp)"
                  >
                    Reactivar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && employees.length === 0">
              <td colspan="5" class="py-8 text-center text-gray-500">
                Aún no hay empleados. Crea el primero para usarlo en Caja.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <div
      v-if="modalOpen"
      class="fixed inset-0 z-99999 flex items-center justify-center bg-black/40 p-4"
      @click.self="modalOpen = false"
    >
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {{ editingId ? 'Editar empleado' : 'Nuevo empleado' }}
        </h3>
        <form class="space-y-3" @submit.prevent="save">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input
              v-model="form.name"
              required
              maxlength="200"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Email (opcional)</label>
            <input
              v-model="form.email"
              type="email"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Teléfono (opcional)</label>
            <input
              v-model="form.phone"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              @click="modalOpen = false"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white disabled:opacity-50"
              :disabled="saving"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  createEmployee,
  deactivateEmployee,
  extractApiError,
  fetchEmployees,
  updateEmployee,
  type Employee,
} from '@/services/api'

const employees = ref<Employee[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const success = ref('')
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const form = ref({ name: '', email: '', phone: '' })

async function load() {
  loading.value = true
  error.value = ''
  try {
    employees.value = await fetchEmployees(false)
  } catch (e) {
    error.value = extractApiError(e, 'No se pudieron cargar empleados')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = null
  form.value = { name: '', email: '', phone: '' }
  modalOpen.value = true
}

function openEdit(emp: Employee) {
  editingId.value = emp.id
  form.value = {
    name: emp.name,
    email: emp.email || '',
    phone: emp.phone || '',
  }
  modalOpen.value = true
}

async function save() {
  saving.value = true
  error.value = ''
  success.value = ''
  try {
    const payload = {
      name: form.value.name.trim(),
      email: form.value.email.trim() || null,
      phone: form.value.phone.trim() || null,
    }
    if (editingId.value) {
      await updateEmployee(editingId.value, payload)
      success.value = 'Empleado actualizado'
    } else {
      await createEmployee(payload)
      success.value = 'Empleado creado'
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}

async function deactivate(emp: Employee) {
  error.value = ''
  try {
    await deactivateEmployee(emp.id)
    success.value = `${emp.name} desactivado`
    await load()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo desactivar')
  }
}

async function reactivate(emp: Employee) {
  error.value = ''
  try {
    await updateEmployee(emp.id, { active: true })
    success.value = `${emp.name} reactivado`
    await load()
  } catch (e) {
    error.value = extractApiError(e, 'No se pudo reactivar')
  }
}

onMounted(() => {
  void load()
})
</script>
