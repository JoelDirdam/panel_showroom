<template>
  <admin-layout>
    <page-breadcrumb page-title="Propietario y accesos" />

    <component-card v-if="brand" :title="`Propietario y accesos · ${brand.name}`">
      <div class="space-y-6">
        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm text-gray-500 dark:text-gray-400">Estado del dueño</p>
          <p class="mt-1 text-base font-medium" :class="brand.owner ? 'text-success-500' : 'text-warning-500'">
            {{ brand.owner ? `Vinculado a ${brand.owner.name} (${brand.owner.email})` : 'Sin vincular' }}
          </p>
          <button
            v-if="brand.owner"
            type="button"
            class="mt-3 text-sm text-error-500 hover:underline"
            :disabled="unlinking"
            @click="onUnlinkOwner"
          >
            {{ unlinking ? 'Procesando…' : 'Desvincular propietario' }}
          </button>
        </div>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm font-medium text-gray-800 dark:text-white">Código de invitación</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Genera un código temporal (válido 48 horas) para que el propietario de la marca reclame su acceso.
          </p>

          <button
            data-tour="brand-generate-code"
            type="button"
            class="mt-3 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            :disabled="generating"
            @click="onGenerateCode"
          >
            {{ generating ? 'Generando…' : 'Generar código' }}
          </button>

          <div v-if="invite" class="mt-4 space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
            <p class="text-xs text-gray-500 dark:text-gray-400">Código (válido hasta {{ formatDate(invite.expiresAt) }})</p>
            <div class="flex items-center gap-3">
              <span class="font-mono text-lg font-semibold tracking-widest text-gray-800 dark:text-white">
                {{ invite.code }}
              </span>
              <button
                type="button"
                class="rounded-lg border px-3 py-1.5 text-sm transition-colors duration-200"
                :class="
                  copied
                    ? 'border-success-500 bg-success-50 text-success-700 dark:border-success-400 dark:bg-success-500/10 dark:text-success-400'
                    : 'border-gray-300 dark:border-gray-600'
                "
                @click="copyCode"
              >
                {{ copied ? '¡Copiado!' : 'Copiar' }}
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <p class="text-sm font-medium text-gray-800 dark:text-white">Contacto (opcional)</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Correo o teléfono para compartir el código con el propietario.
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Correo</label>
              <input v-model="contact.email" type="email" class="field" />
            </div>
            <div>
              <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Teléfono</label>
              <input v-model="contact.phone" type="tel" maxlength="30" class="field" />
            </div>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              :disabled="savingContact"
              @click="saveContact"
            >
              {{ savingContact ? 'Guardando…' : 'Guardar contacto' }}
            </button>
            <a
              v-if="invite && contact.phone"
              :href="whatsappUrl"
              target="_blank"
              rel="noopener"
              class="text-sm text-success-600 hover:underline dark:text-success-400"
            >
              Compartir por WhatsApp
            </a>
          </div>
        </div>

        <p v-if="error" class="text-sm text-error-500">{{ error }}</p>

        <div class="flex justify-end">
          <button type="button" class="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300" @click="router.push('/brands')">
            Volver al listado
          </button>
        </div>
      </div>
    </component-card>
  </admin-layout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import api, { type Brand, type BrandInviteCode, generateBrandInviteCode, unlinkBrandOwner } from '@/services/api'

const router = useRouter()
const route = useRoute()
const brandId = computed(() => route.params.id as string)

const brand = ref<Brand | null>(null)
const invite = ref<BrandInviteCode | null>(null)
const generating = ref(false)
const unlinking = ref(false)
const savingContact = ref(false)
const copied = ref(false)
const error = ref<string | null>(null)

const contact = reactive({ email: '', phone: '' })

const whatsappUrl = computed(() => {
  if (!invite.value || !contact.phone) return '#'
  const digits = contact.phone.replace(/\D/g, '')
  const message = `Hola, aquí está tu código de acceso a la marca: ${invite.value.code} (válido 48 horas).`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
})

async function load() {
  const { data } = await api.get<Brand>(`/brands/${brandId.value}`)
  brand.value = data
  contact.email = data.contactEmail || ''
  contact.phone = data.phone || ''
}

async function onGenerateCode() {
  generating.value = true
  error.value = null
  copied.value = false
  try {
    invite.value = await generateBrandInviteCode(brandId.value)
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo generar el código')
  } finally {
    generating.value = false
  }
}

async function onUnlinkOwner() {
  unlinking.value = true
  error.value = null
  try {
    await unlinkBrandOwner(brandId.value)
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo desvincular al propietario')
  } finally {
    unlinking.value = false
  }
}

async function saveContact() {
  savingContact.value = true
  error.value = null
  try {
    await api.patch(`/brands/${brandId.value}`, {
      contactEmail: contact.email.trim() || null,
      phone: contact.phone.trim() || null,
    })
    await load()
  } catch (e: unknown) {
    error.value = apiError(e, 'No se pudo guardar el contacto')
  } finally {
    savingContact.value = false
  }
}

async function copyCode() {
  if (!invite.value) return
  await navigator.clipboard.writeText(invite.value.code)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2500)
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function apiError(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { error?: string } } }).response?.data?.error || fallback
}

onMounted(load)
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
