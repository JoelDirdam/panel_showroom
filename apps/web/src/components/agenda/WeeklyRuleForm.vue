<template>
  <div class="space-y-5">
    <div>
      <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Días de la semana</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="day in weekdayOptions"
          :key="day.value"
          type="button"
          class="rounded-lg border px-3 py-2 text-sm transition"
          :class="
            model.weekdays.includes(day.value)
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'
          "
          @click="toggleDay(day.value)"
        >
          {{ day.label }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Desde</label>
        <input v-model="model.startTime" type="time" step="900" class="field" @change="syncSharedHours" />
      </div>
      <div>
        <label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">Hasta</label>
        <input v-model="model.endTime" type="time" step="900" class="field" @change="syncSharedHours" />
      </div>
    </div>

    <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
      <input v-model="model.customizePerDay" type="checkbox" @change="onCustomizeToggle" />
      Personalizar horario por día
    </label>

    <div v-if="model.customizePerDay && model.weekdays.length > 0" class="space-y-3">
      <div
        v-for="weekday in model.weekdays"
        :key="weekday"
        class="grid grid-cols-[4rem_1fr_1fr] items-end gap-3"
      >
        <p class="pb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ weekdayLabel(weekday) }}
        </p>
        <div>
          <label class="mb-1 block text-xs text-gray-500">Desde</label>
          <input
            v-model="ensureDayHours(weekday).startTime"
            type="time"
            step="900"
            class="field"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs text-gray-500">Hasta</label>
          <input
            v-model="ensureDayHours(weekday).endTime"
            type="time"
            step="900"
            class="field"
          />
        </div>
      </div>
    </div>

    <div>
      <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Dividir en</p>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in intervalOptions"
          :key="option.value"
          type="button"
          class="rounded-lg border px-3 py-2 text-sm transition"
          :class="
            model.intervalMinutes === option.value
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 text-gray-700 hover:border-brand-300 dark:border-gray-700 dark:text-gray-300'
          "
          @click="model.intervalMinutes = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="summary" class="text-xs text-gray-500 dark:text-gray-400">{{ summary }}</p>

    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="primary-button"
        :disabled="saving || model.weekdays.length === 0"
        @click="$emit('save')"
      >
        Guardar horario semanal
      </button>
      <button
        type="button"
        class="secondary-button"
        :disabled="saving"
        @click="$emit('clear')"
      >
        Quitar configuración
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Weekday } from '@/services/api'

export interface WeeklyRuleFormModel {
  weekdays: Weekday[]
  startTime: string
  endTime: string
  customizePerDay: boolean
  dayHours: Partial<Record<Weekday, { startTime: string; endTime: string }>>
  intervalMinutes: 15 | 30 | 60
}

const model = defineModel<WeeklyRuleFormModel>({ required: true })
defineProps<{ saving?: boolean }>()
defineEmits<{ save: []; clear: [] }>()

const weekdayOptions: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
]

const intervalOptions = [
  { value: 60 as const, label: 'Cada hora' },
  { value: 30 as const, label: 'Cada 30 min' },
  { value: 15 as const, label: 'Cada 15 min' },
]

function weekdayLabel(weekday: Weekday) {
  return weekdayOptions.find((d) => d.value === weekday)?.label ?? String(weekday)
}

function ensureDayHours(weekday: Weekday) {
  if (!model.value.dayHours[weekday]) {
    model.value.dayHours[weekday] = {
      startTime: model.value.startTime,
      endTime: model.value.endTime,
    }
  }
  return model.value.dayHours[weekday]!
}

function toggleDay(weekday: Weekday) {
  const idx = model.value.weekdays.indexOf(weekday)
  if (idx >= 0) {
    model.value.weekdays.splice(idx, 1)
    delete model.value.dayHours[weekday]
  } else {
    model.value.weekdays.push(weekday)
    model.value.weekdays.sort((a, b) => a - b)
    model.value.dayHours[weekday] = {
      startTime: model.value.startTime,
      endTime: model.value.endTime,
    }
  }
}

function syncSharedHours() {
  if (model.value.customizePerDay) return
  for (const weekday of model.value.weekdays) {
    model.value.dayHours[weekday] = {
      startTime: model.value.startTime,
      endTime: model.value.endTime,
    }
  }
}

function onCustomizeToggle() {
  if (model.value.customizePerDay) {
    for (const weekday of model.value.weekdays) {
      if (!model.value.dayHours[weekday]) {
        model.value.dayHours[weekday] = {
          startTime: model.value.startTime,
          endTime: model.value.endTime,
        }
      }
    }
  } else {
    syncSharedHours()
  }
}

const summary = computed(() => {
  if (model.value.weekdays.length === 0) return ''
  const days = model.value.weekdays.map(weekdayLabel).join(', ')
  if (model.value.customizePerDay) {
    return `Se repetirá cada semana los ${days}, con horarios personalizados por día, cada ${model.value.intervalMinutes} min.`
  }
  return `Se repetirá cada semana los ${days} de ${model.value.startTime} a ${model.value.endTime}, cada ${model.value.intervalMinutes} min.`
})
</script>

<style scoped>
.field {
  width: 100%;
  border: 1px solid #d0d5dd;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}

.primary-button {
  border-radius: 0.5rem;
  background: #465fff;
  padding: 0.5rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 500;
}

.primary-button:disabled {
  opacity: 0.5;
}

.secondary-button {
  border-radius: 0.5rem;
  border: 1px solid #d0d5dd;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #344054;
}

:global(.dark) .field {
  border-color: #344054;
  background: #1d2939;
  color: white;
}

:global(.dark) .secondary-button {
  border-color: #344054;
  color: #d0d5dd;
}
</style>
