<template>
  <div
    v-if="isMobileOpen"
    class="fixed inset-0 z-[99998] bg-gray-900/40 backdrop-blur-[2px] lg:hidden"
    aria-hidden="true"
    @click="toggleMobileSidebar"
  ></div>
</template>

<script setup lang="ts">
import { useSidebar } from '@/composables/useSidebar'
const { toggleMobileSidebar, isMobileOpen } = useSidebar()
</script>
