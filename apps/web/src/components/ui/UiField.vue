<template>
  <div :class="$attrs.class">
    <div v-if="label" class="flex items-baseline justify-between gap-2">
      <label :for="fieldId" class="ui-label">
        {{ label }}
        <span v-if="required" class="text-error-600" aria-hidden="true">*</span>
        <span v-if="optional" class="font-normal text-gray-500"> (opcional)</span>
      </label>
      <slot name="label-aside" />
    </div>
    <slot :id="fieldId" :described-by="describedBy" :invalid="!!error" />
    <p v-if="error" :id="`${fieldId}-error`" class="ui-error" role="alert">{{ error }}</p>
    <p v-else-if="help" :id="`${fieldId}-help`" class="ui-help">{{ help }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

/**
 * Campo con label visible y permanente, ayuda y error junto al control.
 * El slot recibe `id`, `describedBy` e `invalid` para conectarlos:
 *
 *   <UiField label="Precio ($ MXN)" help="Lo que verán tus clientes." v-slot="f">
 *     <input :id="f.id" :aria-describedby="f.describedBy" :aria-invalid="f.invalid" class="ui-input" />
 *   </UiField>
 */
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  label?: string
  help?: string
  error?: string
  id?: string
  required?: boolean
  optional?: boolean
}>()

const autoId = useId()
const fieldId = computed(() => props.id ?? `f-${autoId}`)
const describedBy = computed(() =>
  props.error ? `${fieldId.value}-error` : props.help ? `${fieldId.value}-help` : undefined,
)
</script>
