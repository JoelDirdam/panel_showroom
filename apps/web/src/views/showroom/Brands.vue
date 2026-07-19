<template>
  <admin-layout>
    <page-breadcrumb page-title="Marcas" />

    <component-card title="Gestión de marcas">
      <div class="mb-4 flex justify-end">
        <button
          data-tour="brands-create"
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          Nueva marca
        </button>
      </div>

      <p
        v-if="deleteResult"
        class="mb-4 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400"
        role="status"
      >
        {{ deleteResult }}
      </p>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">Slug</th>
              <th class="py-3 pr-4">Email</th>
              <th class="py-3 pr-4">WhatsApp</th>
              <th class="py-3 pr-4">Productos</th>
              <th class="py-3 pr-4">Tipo</th>
              <th class="py-3 pr-4">Estado</th>
              <th class="py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="brand in brands"
              :key="brand.id"
              class="border-b border-gray-100 dark:border-gray-800"
            >
              <td class="py-3 pr-4 font-medium text-gray-800 dark:text-white">{{ brand.name }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ brand.slug }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ brand.contactEmail || '—' }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">{{ brand.whatsapp || '—' }}</td>
              <td class="py-3 pr-4 text-gray-800 dark:text-white">{{ brand._count?.products ?? 0 }}</td>
              <td class="py-3 pr-4 text-gray-600 dark:text-gray-300">
                {{ brand.isHouseBrand ? 'Propio' : 'Externa' }}
              </td>
              <td class="py-3 pr-4">
                <span :class="brand.active ? 'text-success-500' : 'text-gray-400 dark:text-gray-500'">
                  {{ brand.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="py-3 space-x-3">
                <button class="text-brand-500 hover:underline" @click="openEdit(brand)">Editar</button>
                <button
                  v-if="!brand.isHouseBrand"
                  class="text-error-500 hover:underline"
                  @click="openDeleteModal(brand)"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <div v-if="showModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div data-tour="brands-modal" class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {{ editing ? 'Editar marca' : 'Nueva marca' }}
        </h3>
        <form class="space-y-4" @submit.prevent="save">
          <div data-tour="brand-name">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input
              v-model="form.name"
              required
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              @input="onNameInput"
            />
            <p v-if="form.slug" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Identificador: <span class="font-mono">{{ form.slug }}</span>
            </p>
          </div>
          <div data-tour="brand-email">
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Email contacto</label>
            <input v-model="form.contactEmail" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">WhatsApp (opcional)</label>
            <input
              v-model="form.whatsapp"
              type="tel"
              maxlength="30"
              placeholder="Ej. 5215512345678"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input v-model="form.active" type="checkbox" />
            Marca activa
          </label>
          <template v-if="!editing">
            <label data-tour="brand-create-user" class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input v-model="form.createUser" type="checkbox" />
              Crear usuario de acceso
            </label>
            <div v-if="form.createUser" data-tour="brand-password" class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Se usará el email de contacto y el nombre de la marca. Copia la contraseña al guardar (no se envía correo automático todavía).
              </p>
              <div>
                <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Contraseña temporal</label>
                <input
                  v-model="form.password"
                  type="text"
                  required
                  minlength="8"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </template>
          <p v-if="formError" class="text-sm text-error-500">{{ formError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" @click="showModal = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white" :disabled="saving">
              {{ saving ? 'Guardando…' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="deleteTarget" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div
        class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-brand-title"
      >
        <h3 id="delete-brand-title" class="text-lg font-semibold text-gray-800 dark:text-white">
          Eliminar marca
        </h3>
        <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
          Si estás seguro de eliminar la marca, escribe
          <strong class="font-mono text-gray-800 dark:text-white">'{{ deleteTarget.slug }}'</strong>
          para confirmar.
        </p>
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Si la marca tiene productos o ventas, se marcará como inactiva en lugar de eliminarse.
        </p>
        <input
          v-model="deleteConfirmation"
          type="text"
          autocomplete="off"
          :placeholder="deleteTarget.slug"
          class="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-gray-800 outline-none focus:border-error-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          @input="deleteError = null"
          @keyup.enter="removeBrand"
        />
        <p v-if="deleteError" class="mt-2 text-sm text-error-500" role="alert">{{ deleteError }}</p>
        <div class="mt-5 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            :disabled="deleting"
            @click="closeDeleteModal"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="deleting || deleteConfirmation !== deleteTarget.slug"
            @click="removeBrand"
          >
            {{ deleting ? 'Procesando…' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="credentials" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white">Credenciales de acceso</h3>
        <p class="mb-4 text-sm text-gray-600 dark:text-gray-300">
          Copia y envía estos datos a la marca. La contraseña no se volverá a mostrar.
        </p>
        <div class="space-y-2 rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-800">
          <p><span class="text-gray-500">Email:</span> <strong class="text-gray-800 dark:text-white">{{ credentials.email }}</strong></p>
          <p><span class="text-gray-500">Contraseña:</span> <strong class="text-gray-800 dark:text-white">{{ credentials.password }}</strong></p>
        </div>
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-1"
        >
          <p
            v-if="copied"
            class="mt-3 flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400"
            role="status"
          >
            <svg class="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Guardado en el portapapeles
          </p>
        </Transition>
        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border px-4 py-2 text-sm transition-colors duration-200"
            :class="
              copied
                ? 'border-success-500 bg-success-50 text-success-700 dark:border-success-400 dark:bg-success-500/10 dark:text-success-400'
                : 'border-gray-300 dark:border-gray-600'
            "
            @click="copyCredentials"
          >
            {{ copied ? '¡Copiado!' : 'Copiar' }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white"
            @click="closeCredentials"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand } from '@/services/api'
import {
  TOUR_CLOSE_MODALS,
  TOUR_OPEN_BRANDS_MODAL,
} from '@/tours/tourEvents'

const brands = ref<Brand[]>([])
const showModal = ref(false)
const editing = ref<Brand | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const credentials = ref<{ email: string; password: string } | null>(null)
const copied = ref(false)
const deleteTarget = ref<Brand | null>(null)
const deleteConfirmation = ref('')
const deleteError = ref<string | null>(null)
const deleteResult = ref<string | null>(null)
const deleting = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const form = reactive({
  name: '',
  slug: '',
  contactEmail: '',
  whatsapp: '',
  active: true,
  createUser: false,
  password: '',
})

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueSlug(base: string, excludeBrandId?: string) {
  const taken = new Set(
    brands.value
      .filter((b) => b.id !== excludeBrandId)
      .map((b) => b.slug),
  )
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function syncSlugFromName() {
  if (editing.value) return
  const base = slugify(form.name)
  form.slug = base ? uniqueSlug(base) : ''
}

function onNameInput() {
  syncSlugFromName()
}

async function load() {
  const { data } = await api.get<Brand[]>('/brands')
  brands.value = data
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.slug = ''
  form.contactEmail = ''
  form.whatsapp = ''
  form.active = true
  form.createUser = false
  form.password = ''
  formError.value = null
  showModal.value = true
}

function openCreateForTour() {
  openCreate()
  form.createUser = true
}

function onTourCloseModals() {
  showModal.value = false
}

onMounted(() => {
  load()
  window.addEventListener(TOUR_OPEN_BRANDS_MODAL, openCreateForTour)
  window.addEventListener(TOUR_CLOSE_MODALS, onTourCloseModals)
})

onUnmounted(() => {
  window.removeEventListener(TOUR_OPEN_BRANDS_MODAL, openCreateForTour)
  window.removeEventListener(TOUR_CLOSE_MODALS, onTourCloseModals)
  if (copiedTimer) clearTimeout(copiedTimer)
})


function openEdit(brand: Brand) {
  editing.value = brand
  form.name = brand.name
  form.slug = brand.slug
  form.contactEmail = brand.contactEmail || ''
  form.whatsapp = brand.whatsapp || ''
  form.active = brand.active
  form.createUser = false
  form.password = ''
  formError.value = null
  showModal.value = true
}

async function save() {
  formError.value = null

  if (!editing.value) {
    syncSlugFromName()
  }
  if (!form.slug) {
    formError.value = 'El nombre debe incluir letras o números para generar el identificador'
    return
  }

  if (form.createUser && !editing.value) {
    if (!form.contactEmail) {
      formError.value = 'Email de contacto requerido para crear usuario'
      return
    }
    if (form.password.length < 8) {
      formError.value = 'Contraseña mínimo 8 caracteres'
      return
    }
  }

  saving.value = true
  try {
    if (editing.value) {
      await api.patch(`/brands/${editing.value.id}`, {
        name: form.name,
        slug: form.slug,
        contactEmail: form.contactEmail || null,
        whatsapp: form.whatsapp || null,
        active: form.active,
      })
    } else {
      const payload: Record<string, unknown> = {
        name: form.name,
        slug: form.slug,
        contactEmail: form.contactEmail || null,
        whatsapp: form.whatsapp || null,
        active: form.active,
      }
      if (form.createUser) {
        payload.createUser = true
        payload.password = form.password
      }
      const { data } = await api.post<Brand & { temporaryPassword?: string }>('/brands', payload)
      if (data.temporaryPassword && form.contactEmail) {
        copied.value = false
        credentials.value = { email: form.contactEmail, password: data.temporaryPassword }
      }
    }
    showModal.value = false
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    formError.value = err.response?.data?.error || 'No se pudo guardar'
  } finally {
    saving.value = false
  }
}

function openDeleteModal(brand: Brand) {
  if (brand.isHouseBrand) return
  deleteTarget.value = brand
  deleteConfirmation.value = ''
  deleteError.value = null
}

function closeDeleteModal() {
  if (deleting.value) return
  deleteTarget.value = null
  deleteConfirmation.value = ''
  deleteError.value = null
}

async function removeBrand() {
  const brand = deleteTarget.value
  if (!brand || deleting.value) return
  if (deleteConfirmation.value !== brand.slug) {
    deleteError.value = `Escribe '${brand.slug}' exactamente para confirmar`
    return
  }

  deleting.value = true
  deleteError.value = null
  try {
    const { data } = await api.delete<{ action: 'deleted' | 'deactivated'; message: string }>(
      `/brands/${brand.id}`,
      { data: { slug: deleteConfirmation.value } },
    )
    deleteResult.value = data.message
    deleteTarget.value = null
    deleteConfirmation.value = ''
    await load()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    deleteError.value = err.response?.data?.error || 'No se pudo eliminar la marca'
  } finally {
    deleting.value = false
  }
}

async function copyCredentials() {
  if (!credentials.value) return
  const text = `Email: ${credentials.value.email}\nContraseña: ${credentials.value.password}`
  await navigator.clipboard.writeText(text)
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
    copiedTimer = null
  }, 2500)
}

function closeCredentials() {
  if (copiedTimer) {
    clearTimeout(copiedTimer)
    copiedTimer = null
  }
  copied.value = false
  credentials.value = null
}
</script>
