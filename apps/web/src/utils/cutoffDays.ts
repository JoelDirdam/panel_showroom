/**
 * Resolve a configured day-of-month against a real calendar month
 * (e.g. 30/31 → last day of February).
 */
export function resolveCutoffDayForMonth(day: number, year: number, monthIndex0: number): number {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate()
  return Math.min(day, daysInMonth)
}

export function formatCutoffSlotsPreview(slots: number[], now = new Date()): string | null {
  if (!slots.length) return null
  const resolved = [
    ...new Set(slots.map((d) => resolveCutoffDayForMonth(d, now.getFullYear(), now.getMonth()))),
  ].sort((a, b) => a - b)
  return resolved.join(', ')
}

export function parseCutoffSlotsCsv(value: string): number[] {
  if (!value.trim()) return []
  const days = value
    .split(/[,;\s]+/)
    .map((p) => parseInt(p.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 31)
  return [...new Set(days)].sort((a, b) => a - b).slice(0, 2)
}

export function serializeCutoffSlots(slots: number[]): string {
  return [...new Set(slots.filter((n) => n >= 1 && n <= 31))]
    .sort((a, b) => a - b)
    .slice(0, 2)
    .join(',')
}
