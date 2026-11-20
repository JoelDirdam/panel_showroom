<template>
  <div class="relative" ref="dropdownRef" @keydown.esc="closeAndRefocus">
    <button
      ref="triggerRef"
      type="button"
      class="flex min-h-11 items-center gap-2 rounded-xl px-1 text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5 sm:pr-2"
      aria-haspopup="true"
      :aria-expanded="dropdownOpen"
      aria-label="Menú de la cuenta"
      @click.prevent="toggleDropdown"
    >
      <span
        class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
      >
        {{ userInitial }}
      </span>

      <span class="hidden max-w-40 truncate text-sm font-medium sm:block">{{ auth.user?.name || 'Usuario' }}</span>

      <ChevronDownIcon class="hidden sm:block" :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-2 flex w-[272px] flex-col rounded-2xl border border-gray-200 bg-white p-2 shadow-pop dark:border-gray-800 dark:bg-gray-dark"
    >
      <div class="border-b border-gray-100 px-3 pb-3 pt-2 dark:border-gray-800">
        <span class="block text-sm font-semibold text-gray-900 dark:text-white">
          {{ auth.user?.name }}
        </span>
        <span class="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
          {{ auth.user?.email }}
        </span>
        <span v-if="auth.user?.brand" class="mt-0.5 block text-theme-xs text-brand-500">
          {{ auth.user.brand.name }}
        </span>
      </div>

      <router-link
        v-if="showPreferences"
        to="/preferences"
        data-tour="user-menu-preferences"
        class="flex items-center gap-3 min-h-11 px-3 py-2 mt-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        @click="closeDropdown"
      >
        <SettingsIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Preferencias
      </router-link>

      <router-link
        to="/cuenta"
        class="flex min-h-11 items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        :class="showPreferences ? 'mt-1' : 'mt-2'"
        @click="closeDropdown"
      >
        <UserCircleIcon
          class="h-6 w-6 text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Mi cuenta: seguridad y datos
      </router-link>

      <button
        type="button"
        @click="signOut"
        class="mt-1 flex min-h-11 items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
      >
        <LogoutIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Cerrar sesión
      </button>
    </div>
  </div>
</template>

<script setup>
import { ChevronDownIcon, LogoutIcon, SettingsIcon, UserCircleIcon } from '@/icons'
import { useRouter } from 'vue-router'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const dropdownOpen = ref(false)
const userInitial = computed(() => (auth.user?.name || 'U').trim().charAt(0).toUpperCase())
const dropdownRef = ref(null)
const triggerRef = ref(null)

// Esc cierra el menú y devuelve el foco al botón que lo abrió.
const closeAndRefocus = () => {
  if (!dropdownOpen.value) return
  dropdownOpen.value = false
  triggerRef.value?.focus()
}

// Misma regla que el ítem previo del sidebar y la ruta `/preferences`
// (`adminOnly` + módulo `preferences` por entitlements).
const showPreferences = computed(
  () => auth.isAdmin && auth.canAccess('preferences'),
)

const toggleDropdown = () => {
  dropdownOpen.value = !dropdownOpen.value
}

const closeDropdown = () => {
  dropdownOpen.value = false
}

const signOut = () => {
  auth.logout()
  closeDropdown()
  router.push('/login')
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  if (auth.isAuthenticated && !auth.user) {
    auth.fetchMe()
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
