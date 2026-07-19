/** Convert a wall-clock local time in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone)
  let result = new Date(utcGuess.getTime() - offset)
  const offset2 = getTimeZoneOffsetMs(result, timeZone)
  if (offset2 !== offset) {
    result = new Date(Date.UTC(year, month - 1, day, hour, minute, 0) - offset2)
  }
  return result
}

/** Offset of `timeZone` relative to UTC at the given instant (ms). */
function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>

  const hour = parts.hour === '24' ? 0 : Number(parts.hour)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - date.getTime()
}

/** Calendar Y/M/D of an instant in the given timezone. */
export function utcToZonedParts(date: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  }
}

/** ISO weekday 1=Mon … 7=Sun for a calendar date in a timezone. */
export function zonedIsoWeekday(year: number, month: number, day: number, timeZone: string): number {
  // Noon UTC-ish avoids DST edge when reading weekday for the calendar day
  const noon = zonedLocalToUtc(year, month, day, 12, 0, timeZone)
  const jsDay = noon.getUTCDay() // 0=Sun … 6=Sat
  return jsDay === 0 ? 7 : jsDay
}

export function parseTimeHm(value: string): { hour: number; minute: number } | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null
  const [hour, minute] = value.split(':').map(Number)
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return { hour, minute }
}
