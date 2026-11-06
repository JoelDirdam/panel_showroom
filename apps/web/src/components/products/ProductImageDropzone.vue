<template>
  <div
    class="group relative flex h-36 w-36 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-3 text-center transition-colors sm:h-40 sm:w-40"
    :class="
      dragging
        ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
        : 'border-gray-300 bg-gray-50 hover:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-500'
    "
    @dragenter.prevent="onDragEnter"
    @dragover.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <img
      v-if="previewUrl"
      :src="previewUrl"
      alt="Vista previa"
      class="absolute inset-0 z-0 h-full w-full object-cover"
    />

    <div
      v-if="previewUrl"
      class="absolute inset-0 z-10 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40"
    >
      <button
        type="button"
        class="rounded-lg bg-white/90 px-2 py-1 text-xs font-medium text-gray-800 opacity-0 transition-opacity group-hover:opacity-100"
        :class="{ 'opacity-100': uploading }"
        :disabled="uploading"
        @click="inputRef?.click()"
      >
        {{ uploading ? 'Subiendo…' : 'Cambiar imagen' }}
      </button>
    </div>

    <template v-if="!previewUrl">
      <div class="mb-2 flex justify-center">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          <svg class="fill-current" width="20" height="20" viewBox="0 0 29 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
              fill=""
            />
          </svg>
        </div>
      </div>

      <p class="mb-1 text-xs font-medium text-gray-800 dark:text-white/90">
        {{ uploading ? 'Subiendo…' : 'Arrastra imagen' }}
      </p>
      <p class="mb-2 text-[10px] text-gray-500 dark:text-gray-400">JPG, PNG, WebP</p>

      <button
        type="button"
        class="text-xs font-medium text-brand-500 underline disabled:opacity-50"
        :disabled="uploading"
        @click="inputRef?.click()"
      >
        Elegir imagen
      </button>
    </template>

    <div
      v-if="previewUrl && uploading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-black/50 text-xs font-medium text-white"
    >
      Subiendo…
    </div>

    <input
      ref="inputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onInputChange"
    />

    <p v-if="localError" class="absolute bottom-1 left-1 right-1 text-[10px] text-error-500">
      {{ localError }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  previewUrl: string | null
  uploading?: boolean
}>()

const emit = defineEmits<{
  file: [file: File]
  error: [message: string]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const localError = ref<string | null>(null)
let dragDepth = 0

function onDragEnter() {
  dragDepth += 1
  dragging.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}

function handleFile(file: File | undefined) {
  localError.value = null
  if (!file) return

  if (!file.type.startsWith('image/')) {
    const message = 'Solo se aceptan archivos de imagen'
    localError.value = message
    emit('error', message)
    return
  }

  emit('file', file)
  dragging.value = false
  dragDepth = 0
}

function onDrop(event: DragEvent) {
  dragging.value = false
  dragDepth = 0
  handleFile(event.dataTransfer?.files?.[0])
}

function onInputChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  handleFile(file)
}
</script>
