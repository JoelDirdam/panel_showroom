<template>
  <component
    :is="tag"
    v-bind="linkAttrs"
    :class="[
      'ui-btn',
      variantClass,
      size === 'sm' && 'ui-btn-sm',
      block && 'w-full',
      (loading || disabled) && tag !== 'button' && 'pointer-events-none opacity-50',
    ]"
    :disabled="tag === 'button' ? disabled || loading : undefined"
    :aria-busy="loading || undefined"
  >
    <svg v-if="loading" class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.25" stroke-width="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    <slot v-else name="icon" />
    <span v-if="loading && loadingText">{{ loadingText }}</span>
    <span v-else-if="$slots.default"><slot /></span>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

/**
 * Botón único del sistema. El texto debe decir qué hace ("Guardar cambios",
 * "Agregar servicio"), no solo "Aceptar" o "Agregar".
 */
const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive' | 'wa'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit' | 'reset'
    to?: RouteLocationRaw
    href?: string
    target?: string
    block?: boolean
    loading?: boolean
    loadingText?: string
    disabled?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
)

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))

const linkAttrs = computed(() => {
  if (props.to) return { to: props.to }
  if (props.href)
    return {
      href: props.href,
      target: props.target,
      rel: props.target === '_blank' ? 'noopener noreferrer' : undefined,
    }
  return { type: props.type }
})

const variantClass = computed(
  () =>
    ({
      primary: 'ui-btn-primary',
      secondary: 'ui-btn-secondary',
      ghost: 'ui-btn-ghost',
      danger: 'ui-btn-danger',
      destructive: 'ui-btn-destructive',
      wa: 'ui-btn-wa',
    })[props.variant],
)
</script>
