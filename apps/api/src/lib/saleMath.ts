import { Prisma } from '@prisma/client'

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2))
}

export type TaxOptions = {
  applyTax: boolean
  taxRate: number
  /** Los precios ya traen el IVA: se desglosa del total en vez de sumarse. */
  pricesIncludeTax?: boolean
}

export type SaleTotals = {
  /** Importe antes de IVA. */
  subtotal: number
  taxAmount: number
  /** Lo que paga el cliente (antes de tarjeta de regalo). */
  due: number
}

/**
 * Calcula subtotal, IVA y total a partir de la suma de las líneas (ya con
 * descuentos). Con `pricesIncludeTax` el cliente paga exactamente la suma de
 * las líneas y el IVA se desglosa hacia atrás; sin él, el IVA se suma encima.
 */
export function computeTotals(linesTotal: number, opts: TaxOptions): SaleTotals {
  const gross = round2(linesTotal)
  if (!opts.applyTax || opts.taxRate <= 0) {
    return { subtotal: gross, taxAmount: 0, due: gross }
  }
  if (opts.pricesIncludeTax) {
    const subtotal = round2(gross / (1 + opts.taxRate))
    return { subtotal, taxAmount: round2(gross - subtotal), due: gross }
  }
  const taxAmount = round2(gross * opts.taxRate)
  return { subtotal: gross, taxAmount, due: round2(gross + taxAmount) }
}

/** Interpreta un parámetro de fecha de la URL; `null` si no es una fecha válida. */
export function parseDateParam(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function parsePage(query: Record<string, unknown>, defaultSize = 25, maxSize = 100) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const pageSize = Math.min(maxSize, Math.max(1, Math.floor(Number(query.pageSize)) || defaultSize))
  return { page, pageSize, skip: (page - 1) * pageSize }
}
