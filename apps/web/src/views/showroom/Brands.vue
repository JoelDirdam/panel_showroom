<template>
  <admin-layout>
    <page-breadcrumb page-title="Marcas" />

    <component-card title="Gestión de marcas">
      <div class="mb-4 flex justify-end">
        <button
          class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          @click="openCreate"
        >
          Nueva marca
        </button>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-left text-gray-500 dark:border-gray-800">
              <th class="py-3 pr-4">Nombre</th>
              <th class="py-3 pr-4">Slug</th>
              <th class="py-3 pr-4">Email</th>
              <th class="py-3 pr-4">Productos</th>
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
              <td class="py-3 pr-4">{{ brand._count?.products ?? 0 }}</td>
              <td class="py-3 pr-4">
                <span :class="brand.active ? 'text-success-500' : 'text-gray-400'">
                  {{ brand.active ? 'Activa' : 'Inactiva' }}
                </span>
              </td>
              <td class="py-3">
                <button class="text-brand-500 hover:underline" @click="openEdit(brand)">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </component-card>

    <div v-if="showModal" class="fixed inset-0 z-99999 flex items-center justify-center bg-black/50 p-4">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 dark:bg-gray-900">
        <h3 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white">
          {{ editing ? 'Editar marca' : 'Nueva marca' }}
        </h3>
        <form class="space-y-4" @submit.prevent="save">
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
            <input v-model="form.name" required class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Slug</label>
            <input v-model="form.slug" required pattern="[a-z0-9-]+" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Email contacto</label>
            <input v-model="form.contactEmail" type="email" class="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </div>
          <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input v-model="form.active" type="checkbox" />
            Marca activa
          </label>
          <div class="flex justify-end gap-2">
            <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600" @click="showModal = false">Cancelar</button>
            <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand } from '@/services/api'

const brands = ref<Brand[]>([])
const showModal = ref(false)
const editing = ref<Brand | null>(null)
const form = reactive({
  name: '',
  slug: '',
  contactEmail: '',
  active: true,
})

async function load() {
  const { data } = await api.get<Brand[]>('/brands')
  brands.value = data
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.slug = ''
  form.contactEmail = ''
  form.active = true
  showModal.value = true
}

function openEdit(brand: Brand) {
  editing.value = brand
  form.name = brand.name
  form.slug = brand.slug
  form.contactEmail = brand.contactEmail || ''
  form.active = brand.active
  showModal.value = true
}

async function save() {
  const payload = {
    name: form.name,
    slug: form.slug,
    contactEmail: form.contactEmail || null,
    active: form.active,
  }
  if (editing.value) {
    await api.patch(`/brands/${editing.value.id}`, payload)
  } else {
    await api.post('/brands', payload)
  }
  showModal.value = false
  await load()
}

onMounted(load)
</script>
