<template>
  <div class="relative">
    <input
      ref="inputRef"
      v-model="inputText"
      type="text"
      class="field"
      placeholder="Buscar o crear categoría"
      autocomplete="off"
      @focus="onFocus"
      @blur="onBlur"
      @input="onInput"
      @keydown.down.prevent="moveHighlight(1)"
      @keydown.up.prevent="moveHighlight(-1)"
      @keydown.enter.prevent="selectHighlighted"
      @keydown.escape="closeSuggestions"
    />
    <ul
      v-if="showSuggestions && filteredCategories.length > 0"
      class="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
    >
      <li
        v-for="(category, index) in filteredCategories"
        :key="category.id"
        class="cursor-pointer px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
        :class="
          index === highlightIndex
            ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
        "
        @mousedown.prevent="selectCategory(category)"
      >
        {{ category.name }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { createCategory, type Category } from '@/services/api'

const props = defineProps<{
  categories: Category[]
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'category-created': [category: Category]
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const inputText = ref('')
const showSuggestions = ref(false)
const highlightIndex = ref(0)
let blurTimeout: ReturnType<typeof setTimeout> | null = null

const filteredCategories = computed(() => {
  const query = inputText.value.trim().toLowerCase()
  if (!query) return props.categories.slice(0, 8)
  return props.categories
    .filter((c) => c.name.toLowerCase().includes(query))
    .slice(0, 8)
})

function findByName(name: string): Category | undefined {
  const normalized = name.trim().toLowerCase()
  return props.categories.find((c) => c.name.toLowerCase() === normalized)
}

function syncInputFromModel() {
  if (!props.modelValue) {
    if (!inputText.value) inputText.value = ''
    return
  }
  const match = props.categories.find((c) => c.id === props.modelValue)
  if (match) inputText.value = match.name
}

watch(
  () => props.modelValue,
  () => syncInputFromModel(),
)

watch(
  () => props.categories,
  () => syncInputFromModel(),
  { deep: true },
)

function onFocus() {
  if (blurTimeout) clearTimeout(blurTimeout)
  showSuggestions.value = true
  highlightIndex.value = 0
}

function onBlur() {
  blurTimeout = setTimeout(() => {
    showSuggestions.value = false
  }, 150)
}

function onInput() {
  const exact = findByName(inputText.value)
  emit('update:modelValue', exact?.id ?? '')
  showSuggestions.value = true
  highlightIndex.value = 0
}

function selectCategory(category: Category) {
  inputText.value = category.name
  emit('update:modelValue', category.id)
  closeSuggestions()
}

function closeSuggestions() {
  showSuggestions.value = false
}

function moveHighlight(delta: number) {
  if (!showSuggestions.value || filteredCategories.value.length === 0) return
  const len = filteredCategories.value.length
  highlightIndex.value = (highlightIndex.value + delta + len) % len
}

function selectHighlighted() {
  const category = filteredCategories.value[highlightIndex.value]
  if (category) selectCategory(category)
}

async function resolveCategoryId(): Promise<string | null> {
  const trimmed = inputText.value.trim()
  if (!trimmed) {
    emit('update:modelValue', '')
    return null
  }

  const existing = findByName(trimmed)
  if (existing) {
    emit('update:modelValue', existing.id)
    return existing.id
  }

  const category = await createCategory(trimmed)
  emit('update:modelValue', category.id)
  emit('category-created', category)
  return category.id
}

defineExpose({ resolveCategoryId })
</script>

<style scoped>
@reference "../../assets/main.css";

.field {
  @apply ui-input;
}

</style>
