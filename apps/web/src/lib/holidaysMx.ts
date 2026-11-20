/**
 * Días de descanso obligatorio en México (Ley Federal del Trabajo, art. 74).
 * Algunos se recorren al lunes. No incluye días que cambian cada año por
 * decisión local (Semana Santa, elecciones): esos se agregan a mano.
 */
export interface Holiday {
  date: string
  name: string
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** n-ésimo lunes del mes (n = 1, 2, 3...). */
function nthMonday(y: number, m: number, n: number): number {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay() // 0 = domingo
  const firstMonday = 1 + ((8 - first) % 7)
  return firstMonday + (n - 1) * 7
}

export function mexicanHolidays(year: number): Holiday[] {
  const list: Holiday[] = [
    { date: iso(year, 1, 1), name: 'Año Nuevo' },
    { date: iso(year, 2, nthMonday(year, 2, 1)), name: 'Día de la Constitución' },
    { date: iso(year, 3, nthMonday(year, 3, 3)), name: 'Natalicio de Benito Juárez' },
    { date: iso(year, 5, 1), name: 'Día del Trabajo' },
    { date: iso(year, 9, 16), name: 'Día de la Independencia' },
    { date: iso(year, 11, nthMonday(year, 11, 3)), name: 'Día de la Revolución' },
    { date: iso(year, 12, 25), name: 'Navidad' },
  ]
  // Transmisión del Poder Ejecutivo Federal: cada seis años (2024, 2030...).
  if ((year - 2024) % 6 === 0) list.push({ date: iso(year, 10, 1), name: 'Cambio de gobierno federal' })
  return list.sort((a, b) => a.date.localeCompare(b.date))
}

/** Próximos días festivos a partir de `today` (YYYY-MM-DD), máximo `limit`. */
export function upcomingHolidays(today: string, limit = 4): Holiday[] {
  const year = Number(today.slice(0, 4))
  return [...mexicanHolidays(year), ...mexicanHolidays(year + 1)].filter((h) => h.date >= today).slice(0, limit)
}
