<template>
  <div class="relative" ref="dropdownRef">
    <button
      class="flex items-center text-gray-700 dark:text-gray-400"
      @click.prevent="toggleDropdown"
    >
      <span
        class="mr-3 flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
      >
        <UserCircleIcon class="h-7 w-7" />
      </span>

      <span class="block mr-1 font-medium text-theme-sm">{{ auth.user?.name || 'Usuario' }}</span>

      <ChevronDownIcon :class="{ 'rotate-180': dropdownOpen }" />
    </button>

    <div
      v-if="dropdownOpen"
      class="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
    >
      <div>
        <span class="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
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
        class="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        @click="closeDropdown"
      >
        <SettingsIcon
          class="text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
        />
        Preferencias
      </router-link>

      <button
        type="button"
        @click="signOut"
        class="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
        :class="showPreferences ? 'mt-1' : 'mt-3'"
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
const dropdownRef = ref(null)

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
