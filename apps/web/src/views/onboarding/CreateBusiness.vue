<template>
  <FullScreenLayout>
    <div class="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
      <div class="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-6 text-center">
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Cuéntanos de tu negocio</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Último paso antes de entrar a tu panel.
          </p>
        </div>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div class="flex items-center gap-4">
            <div
              class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-white/5"
            >
              <img v-if="logoPreview" :src="logoPreview" alt="Logo" class="h-full w-full object-cover" />
              <ImageIcon v-else class="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <label
                class="inline-flex cursor-pointer items-center rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/5 dark:text-white/90 dark:hover:bg-white/10"
              >
                {{ logoFile ? 'Cambiar logo' : 'Subir logo (opcional)' }}
                <input type="file" accept="image/*" class="hidden" @change="onLogoChange" />
              </label>
              <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">PNG o JPG, máx. 5MB</p>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nombre del negocio<span class="text-error-500">*</span>
            </label>
            <input
              v-model="name"
              type="text"
              required
              placeholder="Nombre comercial"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">RFC (opcional)</label>
              <input
                v-model="rfc"
                type="text"
                placeholder="RFC"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Red social (opcional)</label>
              <input
                v-model="socialUrl"
                type="text"
                placeholder="https://instagram.com/tu-negocio"
                class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Dirección (opcional)</label>
            <input
              v-model="address"
              type="text"
              placeholder="Calle, número, ciudad"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            />
          </div>

          <p v-if="auth.error" class="text-sm text-error-500">{{ auth.error }}</p>

          <button
            type="submit"
            :disabled="auth.loading"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
          >
            <Loader2 v-if="auth.loading" class="h-4 w-4 animate-spin" />
            {{ auth.loading ? 'Creando negocio...' : 'Finalizar y entrar a mi panel' }}
          </button>
        </form>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ImageIcon, Loader2 } from 'lucide-vue-next'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const name = ref('')
const rfc = ref('')
const socialUrl = ref('')
const address = ref('')
const logoFile = ref<File | null>(null)
const logoPreview = ref<string | null>(null)

function onLogoChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0] ?? null
  logoFile.value = file
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
  logoPreview.value = file ? URL.createObjectURL(file) : null
}

onBeforeUnmount(() => {
  if (logoPreview.value) URL.revokeObjectURL(logoPreview.value)
})

async function handleSubmit() {
  const ok = await auth.createBusiness({
    name: name.value.trim(),
    rfc: rfc.value.trim() || null,
    socialUrl: socialUrl.value.trim() || null,
    address: address.value.trim() || null,
    logo: logoFile.value,
  })
  if (ok) {
    router.push('/onboarding/hub')
  }
}
</script>
