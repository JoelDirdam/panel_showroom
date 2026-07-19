<template>
  <!-- Host invisible: controla autoarranque del tutorial -->
</template>

<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSidebar } from '@/composables/useSidebar'
import { setTourRouter, setTourSidebar, maybeAutoStart } from './useTour'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const sidebar = useSidebar()

setTourRouter(router)
setTourSidebar(() => {
  if (window.innerWidth < 1024) {
    if (!sidebar.isMobileOpen.value) sidebar.toggleMobileSidebar()
  } else if (!sidebar.isExpanded.value) {
    sidebar.toggleSidebar()
  }
})

async function tryAutoStart() {
  if (!auth.user || auth.mustChangePassword) return
  if (route.path !== '/') return
  await maybeAutoStart()
}

onMounted(() => {
  tryAutoStart()
})

watch(
  () => [auth.user?.id, auth.mustChangePassword, route.path] as const,
  () => {
    tryAutoStart()
  },
)
</script>
