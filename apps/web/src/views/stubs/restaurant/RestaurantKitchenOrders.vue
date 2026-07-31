<template>
  <StubModulePage
    title="Comandas de cocina"
    description="Tablero de comandas en tiempo real para cocina."
    helper-text="Aquí vivirá el tablero de comandas (KDS) para cocina: estatus por platillo, tiempos y notificaciones. Depende de los flags 'ordersKitchen', 'ai' y 'sms'. Ver contrato en docs/plans-contracts.md."
    plan="RESTAURANTE"
  />
</template>

<script setup lang="ts">
import StubModulePage from '@/views/stubs/StubModulePage.vue'
</script>
