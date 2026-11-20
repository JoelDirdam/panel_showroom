<template>
  <UiModal
    :open="confirmState.open"
    :title="confirmState.options.title"
    :description="confirmState.options.description"
    size="sm"
    @close="settleConfirm(false)"
  >
    <template #footer>
      <UiButton variant="secondary" @click="settleConfirm(false)">
        {{ confirmState.options.cancelText ?? 'Cancelar' }}
      </UiButton>
      <UiButton
        :variant="confirmState.options.danger ? 'destructive' : 'primary'"
        @click="settleConfirm(true)"
      >
        {{ confirmState.options.confirmText ?? 'Confirmar' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import UiModal from './UiModal.vue'
import UiButton from './UiButton.vue'
import { confirmState, settleConfirm } from '@/composables/useConfirm'
</script>
