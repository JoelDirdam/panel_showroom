<template>
  <div class="space-y-6">
    <!-- Normal Textarea -->
    <div>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        Description
      </label>
      <textarea
        v-model="normalDescription"
        placeholder="Enter a description..."
        rows="6"
        class="ui-input w-full"
      ></textarea>
    </div>

    <!-- Disabled Textarea -->
    <div>
      <label class="mb-1.5 block text-sm font-medium text-gray-300 dark:text-white/15">
        Description
      </label>
      <textarea
        v-model="disabledDescription"
        placeholder="Enter a description..."
        rows="6"
        disabled
        class="ui-input w-full"
      ></textarea>
    </div>

    <!-- Error State Textarea -->
    <div>
      <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
        Description
      </label>
      <textarea
        v-model="errorDescription"
        placeholder="Enter a description..."
        rows="6"
        class="ui-input w-full"
      ></textarea>
      <p class="mt-1.5 text-theme-xs text-error-500">Please enter a message in the textarea.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const normalDescription = ref('')
const disabledDescription = ref('This textarea is disabled')
const errorDescription = ref('')
</script>
