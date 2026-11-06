import type { ImportColumn } from '../composables/useXlsxImport'
import { parseCutoffSlotsCsv } from './cutoffDays'

export type ImportCellErrors = Record<string, string>

export interface ImportFieldError {
  rowIndex: number
  key: string
  label: string
  message: string
}

export interface ImportValidationResult {
  cellErrors: ImportCellErrors
  firstError: ImportFieldError | null
  errorRowCount: number
}

export function cellErrorKey(rowIndex: number, key: string): string {
  return `${rowIndex}:${key}`
}

function isEmptyValue(col: ImportColumn, value: string | undefined): boolean {
  if (col.type === 'day-slots') {
    return parseCutoffSlotsCsv(value || '').length === 0
  }
  return !String(value ?? '').trim()
}

function parseLocaleNumber(raw: string): number {
  return Number(raw.replace(',', '.'))
}

function validateKind(col: ImportColumn, raw: string): string | null {
  if (col.kind === 'number') {
    const n = parseLocaleNumber(raw)
    if (!Number.isFinite(n) || n < 0) return 'Debe ser un número mayor o igual a 0'
    return null
  }
  if (col.kind === 'integer') {
    const n = parseLocaleNumber(raw)
    if (!Number.isInteger(n) || n < 0) return 'Debe ser un entero mayor o igual a 0'
    return null
  }
  if (col.kind === 'percent') {
    const n = parseLocaleNumber(raw)
    if (!Number.isFinite(n) || n < 0 || n > 100) return 'Debe ser un número entre 0 y 100'
    return null
  }
  if (col.kind === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Email no es válido'
    return null
  }
  return null
}

export function validateImportCell(col: ImportColumn, value: string | undefined): string | null {
  if (isEmptyValue(col, value)) {
    if (!col.required) return null
    if (col.type === 'select') return `Selecciona ${col.label}`
    if (col.type === 'day-slots') return 'Selecciona al menos un día de corte'
    return `${col.label} es obligatorio`
  }
  return validateKind(col, String(value ?? '').trim())
}

export function validateImportRows(
  rows: Record<string, string>[],
  columns: ImportColumn[],
): ImportValidationResult {
  const cellErrors: ImportCellErrors = {}
  let firstError: ImportFieldError | null = null
  const errorRows = new Set<number>()

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    for (const col of columns) {
      const message = validateImportCell(col, rows[rowIndex][col.key])
      if (!message) continue
      cellErrors[cellErrorKey(rowIndex, col.key)] = message
      errorRows.add(rowIndex)
      if (!firstError) {
        firstError = { rowIndex, key: col.key, label: col.label, message }
      }
    }
  }

  return {
    cellErrors,
    firstError,
    errorRowCount: errorRows.size,
  }
}
