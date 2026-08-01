<template>
  <div />
</template>

<script setup lang="ts">
// Reemplazado por el flujo real de registro (ver views/onboarding/Register.vue,
// enrutado en /register). Este archivo se mantiene solo para redirigir
// cualquier referencia antigua al template de Tailwind Admin.
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(() => {
  router.replace('/register')
})
</script>
