<template>
  <div class="min-h-screen bg-gray-50 lg:flex dark:bg-gray-950">
    <app-sidebar />
    <Backdrop />
    <div
      class="min-w-0 flex-1 transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[272px]' : 'lg:ml-[84px]']"
    >
      <app-header />
      <main
        id="contenido"
        tabindex="-1"
        class="mx-auto max-w-(--breakpoint-2xl) px-4 pb-28 pt-5 md:px-6 md:pb-10 md:pt-8 xl:px-10"
      >
        <slot></slot>
      </main>
    </div>
    <MobileTabBar />
  </div>
</template>

<script setup>
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import MobileTabBar from './MobileTabBar.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'
const { isExpanded, isHovered } = useSidebar()
</script>
