<template>
  <div class="w-fit max-w-full rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="w-[17.25rem]">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2 class="text-sm font-semibold text-gray-800 dark:text-white">Calendario del mes</h2>
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700"
            @click="shiftMonth(-1)"
          >
            ‹
          </button>
          <span class="min-w-[6.5rem] text-center text-xs font-medium capitalize text-gray-700 dark:text-gray-200">
            {{ monthLabel }}
          </span>
          <button
            type="button"
            class="rounded-lg border border-gray-300 px-2 py-1 text-sm dark:border-gray-700"
            @click="shiftMonth(1)"
          >
            ›
          </button>
        </div>
      </div>

      <div class="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-gray-500 dark:text-gray-400">
        <span v-for="d in weekDays" :key="d">{{ d }}</span>
      </div>

      <div class="inline-grid grid-cols-7 gap-1">
        <div
          v-for="blank in leadingBlanks"
          :key="`b-${blank}`"
          class="h-9 w-9"
          aria-hidden="true"
        />
        <button
          v-for="day in daysInMonth"
          :key="day.date"
          type="button"
          class="flex h-9 w-9 flex-col items-center justify-center rounded-md border text-center transition hover:border-brand-300 dark:border-gray-800"
          :class="
            selectedDate === day.date
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
              : 'border-transparent bg-gray-50 dark:bg-white/[0.02]'
          "
          @click="selectedDate = day.date"
        >
          <span class="text-xs font-medium leading-none text-gray-800 dark:text-white">{{ day.dayNum }}</span>
          <div v-if="day.hasCutoff || day.hasRent" class="mt-0.5 flex items-center gap-0.5">
            <span v-if="day.hasCutoff" class="h-1.5 w-1.5 rounded-full bg-brand-500" title="Corte" />
            <span v-if="day.hasRent" class="h-1.5 w-1.5 rounded-full bg-amber-500" title="Renta pendiente" />
          </div>
        </button>
      </div>

      <div class="mt-3 flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-brand-500" /> Corte de marca</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-amber-500" /> Renta pendiente</span>
      </div>

      <div v-if="selectedDayDetail" class="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p class="text-sm font-medium text-gray-800 dark:text-white">
          {{ formatSelectedDate }}
        </p>
        <div v-if="selectedDayDetail.cutoffs.length" class="mt-2">
          <p class="text-xs font-semibold uppercase text-gray-500">Cortes</p>
          <ul class="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li v-for="name in selectedDayDetail.cutoffs" :key="name">{{ name }}</li>
          </ul>
        </div>
        <div v-if="selectedDayDetail.rentsDue.length" class="mt-3">
          <p class="text-xs font-semibold uppercase text-gray-500">Rentas pendientes</p>
          <ul class="mt-1 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            <li v-for="rent in selectedDayDetail.rentsDue" :key="rent.paymentId">
              {{ rent.brandName }} — ${{ formatMoney(rent.amount) }}
            </li>
          </ul>
        </div>
        <p v-if="!selectedDayDetail.cutoffs.length && !selectedDayDetail.rentsDue.length" class="mt-2 text-sm text-gray-500">
          Sin eventos este día.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { HomeCalendar } from '@/services/api'
import { formatMoney } from '@/composables/useCajaSession'

const props = defineProps<{
  calendar: HomeCalendar | null
}>()

const emit = defineEmits<{
  'change-month': [year: number, month: number]
}>()

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth() + 1)
const selectedDate = ref<string | null>(null)

watch(
  () => props.calendar,
  (cal) => {
    if (!cal) return
    viewYear.value = cal.year
    viewMonth.value = cal.month
    if (!selectedDate.value) {
      selectedDate.value = new Date().toISOString().slice(0, 10)
    }
  },
  { immediate: true },
)

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value - 1, 1).toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  }),
)

const dayMap = computed(() => {
  const map = new Map<string, { cutoffs: string[]; rentsDue: HomeCalendar['calendarDays'][0]['rentsDue'] }>()
  for (const day of props.calendar?.calendarDays ?? []) {
    map.set(day.date, { cutoffs: day.cutoffs, rentsDue: day.rentsDue })
  }
  return map
})

const daysInMonth = computed(() => {
  const year = viewYear.value
  const monthIndex0 = viewMonth.value - 1
  const total = new Date(year, monthIndex0 + 1, 0).getDate()
  const items = []
  for (let d = 1; d <= total; d++) {
    const date = new Date(year, monthIndex0, d).toISOString().slice(0, 10)
    const detail = dayMap.value.get(date)
    items.push({
      date,
      dayNum: d,
      hasCutoff: (detail?.cutoffs.length ?? 0) > 0,
      hasRent: (detail?.rentsDue.length ?? 0) > 0,
    })
  }
  return items
})

const leadingBlanks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value - 1, 1).getDay()
  const offset = first === 0 ? 6 : first - 1
  return Array.from({ length: offset }, (_, i) => i)
})

const selectedDayDetail = computed(() => {
  if (!selectedDate.value) return null
  return dayMap.value.get(selectedDate.value) ?? { cutoffs: [], rentsDue: [] }
})

const formatSelectedDate = computed(() => {
  if (!selectedDate.value) return ''
  return new Date(selectedDate.value + 'T12:00:00').toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
})

function shiftMonth(delta: number) {
  let m = viewMonth.value + delta
  let y = viewYear.value
  if (m < 1) {
    m = 12
    y -= 1
  } else if (m > 12) {
    m = 1
    y += 1
  }
  viewMonth.value = m
  viewYear.value = y
  emit('change-month', y, m)
}
</script>
