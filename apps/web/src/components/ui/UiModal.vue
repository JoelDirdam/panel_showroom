<template>
  <dialog
    ref="dialogEl"
    :aria-labelledby="titleId"
    :aria-describedby="description ? descId : undefined"
    class="m-auto w-[calc(100%-2rem)] max-w-lg rounded-[20px] border-0 bg-white p-0 text-gray-800 shadow-pop backdrop:bg-gray-900/40 backdrop:backdrop-blur-sm dark:bg-gray-900 dark:text-gray-100"
    :class="sizeClass"
    @cancel.prevent="$emit('close')"
    @click="onBackdropClick"
  >
    <div class="flex max-h-[calc(100dvh-2rem)] flex-col">
      <header class="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6 sm:pt-6">
        <div>
          <h2 :id="titleId" class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h2>
          <p v-if="description" :id="descId" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ description }}
          </p>
        </div>
        <button
          type="button"
          class="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          aria-label="Cerrar"
          @click="$emit('close')"
        >
          <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.3 5.3a1 1 0 0 1 1.4 0L10 8.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 10l3.3 3.3a1 1 0 0 1-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 10 5.3 6.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      </header>
      <div class="overflow-y-auto px-5 py-5 sm:px-6">
        <slot />
      </div>
      <footer
        v-if="$slots.footer"
        class="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800 sm:flex-row sm:justify-end sm:px-6"
      >
        <slot name="footer" />
      </footer>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

/** Modal accesible sobre <dialog>: atrapa el foco, Esc cierra y devuelve el foco al cerrar. */
const props = withDefaults(
  defineProps<{ open: boolean; title: string; description?: string; size?: 'sm' | 'md' | 'lg' }>(),
  { size: 'md' },
)
const emit = defineEmits<{ close: [] }>()

const dialogEl = ref<HTMLDialogElement | null>(null)
const uid = useId()
const titleId = `modal-${uid}-t`
const descId = `modal-${uid}-d`
const sizeClass = computed(() => ({ sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' })[props.size])

function sync(open: boolean) {
  const el = dialogEl.value
  if (!el) return
  if (open && !el.open) el.showModal()
  else if (!open && el.open) el.close()
}

function onBackdropClick(e: MouseEvent) {
  if (e.target === dialogEl.value) emit('close')
}

watch(() => props.open, sync)
onMounted(() => sync(props.open))
onBeforeUnmount(() => dialogEl.value?.open && dialogEl.value.close())
</script>
