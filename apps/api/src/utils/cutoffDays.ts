/** Resolve a configured day-of-month against a real calendar month. */
export function resolveCutoffDayForMonth(day: number, year: number, monthIndex0: number): number {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  return Math.min(day, daysInMonth)
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function daysBetweenCalendar(a: Date, b: Date): number {
  const da = startOfDay(a).getTime()
  const db = startOfDay(b).getTime()
  return Math.round((db - da) / (24 * 60 * 60 * 1000))
}

export type CutoffPrefs = {
  cutoffType: 'WEEKLY' | 'MONTHLY_FIXED'
  cutoffWeekday: number | null
  cutoffDaySlots: number[]
}

export type BrandCutoffConfig = {
  id: string
  name: string
  cutoffDaySlots: number[]
}

/** Resolved cutoff calendar date on or after `from` (local). */
export function nextCutoffDate(
  prefs: CutoffPrefs,
  brand: BrandCutoffConfig,
  from: Date = new Date(),
): Date | null {
  const base = startOfDay(from)

  if (prefs.cutoffType === 'WEEKLY') {
    const target = prefs.cutoffWeekday ?? 5 // Friday default
    const day = base.getDay()
    let diff = target - day
    if (diff < 0) diff += 7
    if (diff === 0) return base
    return startOfDay(addDays(base, diff))
  }

  const slots =
    brand.cutoffDaySlots.length > 0
      ? [...brand.cutoffDaySlots]
      : prefs.cutoffDaySlots.length > 0
        ? [...prefs.cutoffDaySlots]
        : [15]

  const unique = [...new Set(slots.filter((d) => d >= 1 && d <= 31))].sort((a, b) => a - b)
  if (!unique.length) return null

  const y = base.getFullYear()
  const m = base.getMonth()

  for (const slot of unique) {
    const resolved = resolveCutoffDayForMonth(slot, y, m)
    const candidate = new Date(y, m, resolved)
    if (candidate >= base) return startOfDay(candidate)
  }

  const nextMonth = m + 1
  const ny = nextMonth > 11 ? y + 1 : y
  const nm = nextMonth % 12
  const resolved = resolveCutoffDayForMonth(unique[0], ny, nm)
  return startOfDay(new Date(ny, nm, resolved))
}

/** Previous cutoff date strictly before `before` (local). */
export function previousCutoffDate(
  prefs: CutoffPrefs,
  brand: BrandCutoffConfig,
  before: Date,
): Date {
  const probe = startOfDay(addDays(before, -1))
  let prev = nextCutoffDate(prefs, brand, new Date(probe.getFullYear(), probe.getMonth(), 1))
  let last: Date | null = null
  const guard = 400
  for (let i = 0; i < guard; i++) {
    if (!prev || prev >= startOfDay(before)) break
    last = prev
    prev = nextCutoffDate(prefs, brand, addDays(prev, 1))
  }
  if (last) return last
  return startOfDay(new Date(probe.getFullYear(), probe.getMonth(), 1))
}

export function openCutoffPeriod(
  prefs: CutoffPrefs,
  brand: BrandCutoffConfig,
  now: Date = new Date(),
): { periodFrom: Date; periodTo: Date; cutoffDate: Date } {
  const cutoffDate = nextCutoffDate(prefs, brand, now) ?? startOfDay(now)
  const prevCutoff = previousCutoffDate(prefs, brand, cutoffDate)
  const periodFrom = startOfDay(addDays(prevCutoff, 1))
  const periodTo = endOfDay(cutoffDate)
  return { periodFrom, periodTo, cutoffDate }
}

/** All cutoff dates in a calendar month for calendar UI. */
export function cutoffDatesInMonth(
  prefs: CutoffPrefs,
  brands: BrandCutoffConfig[],
  year: number,
  monthIndex0: number,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()

  if (prefs.cutoffType === 'WEEKLY') {
    const target = prefs.cutoffWeekday ?? 5
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, monthIndex0, d)
      if (date.getDay() === target) {
        const key = date.toISOString().slice(0, 10)
        map.set(key, brands.map((b) => b.name))
      }
    }
    return map
  }

  for (const brand of brands) {
    const slots =
      brand.cutoffDaySlots.length > 0
        ? brand.cutoffDaySlots
        : prefs.cutoffDaySlots.length > 0
          ? prefs.cutoffDaySlots
          : [15]
    for (const slot of [...new Set(slots)]) {
      const resolved = resolveCutoffDayForMonth(slot, year, monthIndex0)
      const key = new Date(year, monthIndex0, resolved).toISOString().slice(0, 10)
      const list = map.get(key) ?? []
      list.push(brand.name)
      map.set(key, list)
    }
  }
  return map
}
