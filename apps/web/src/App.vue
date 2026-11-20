<template>
  <ThemeProvider>
    <SidebarProvider>
      <!-- Navegación con teclado: primer foco de la página, salta menús y va al contenido. -->
      <a href="#contenido" class="skip-link" @click.prevent="skipToContent">Saltar al contenido</a>
      <RouterView />
      <TourHost />
      <CookieBanner />
      <ToastHost />
      <ConfirmHost />
    </SidebarProvider>
  </ThemeProvider>
</template>

<script setup lang="ts">
import ThemeProvider from './components/layout/ThemeProvider.vue'
import SidebarProvider from './components/layout/SidebarProvider.vue'
import TourHost from './tours/TourHost.vue'
import CookieBanner from './components/common/CookieBanner.vue'
import ToastHost from './components/ui/ToastHost.vue'
import ConfirmHost from './components/ui/ConfirmHost.vue'

function skipToContent() {
  const target =
    document.getElementById('contenido') ?? document.querySelector<HTMLElement>('main') ?? document.body
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus()
  target.scrollIntoView()
}
</script>
