<template>
  <ThemeProvider>
    <SidebarProvider>
      <RouterView />
      <TourHost />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import TourHost from './tours/TourHost.vue'
</script>
