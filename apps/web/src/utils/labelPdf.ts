import { jsPDF } from 'jspdf'
import JsBarcode from 'jsbarcode'

export interface LabelPrintItem {
  sku: string
  name: string
  price?: string | number | null
  /** Número de copias de esta etiqueta a imprimir (por defecto 1). */
  quantity?: number
}

export type LabelSizeId = '58x13' | '38x25' | '27x13'

export interface LabelSizeOption {
  id: LabelSizeId
  widthMm: number
  heightMm: number
  label: string
  description: string
  /** Etiquetas "chicas": solo código de barras + precio (sin nombre/SKU en texto). */
  minimal: boolean
  rollUrl: string
}

export const LABEL_SIZE_OPTIONS: LabelSizeOption[] = [
  {
    id: '58x13',
    widthMm: 58,
    heightMm: 13,
    label: '58 × 13 mm',
    description: 'Rollo estándar de góndola: código de barras + SKU + nombre + precio.',
    minimal: false,
    rollUrl: 'https://ejemplo.com/rollos-etiquetas/58x13',
  },
  {
    id: '38x25',
    widthMm: 38,
    heightMm: 25,
    label: '38 × 25 mm',
    description: 'Etiqueta chica: solo código de barras + precio.',
    minimal: true,
    rollUrl: 'https://ejemplo.com/rollos-etiquetas/38x25',
  },
  {
    id: '27x13',
    widthMm: 27,
    heightMm: 13,
    label: '27 × 13 mm',
    description: 'Etiqueta mini (joyería / accesorios): solo código de barras + precio.',
    minimal: true,
    rollUrl: 'https://ejemplo.com/rollos-etiquetas/27x13',
  },
]

export function findLabelSize(id: LabelSizeId): LabelSizeOption {
  return LABEL_SIZE_OPTIONS.find((option) => option.id === id) ?? LABEL_SIZE_OPTIONS[0]
}

/** Empareja las medidas guardadas en BusinessPreferences con una opción conocida. */
export function matchLabelSizeFromMm(widthMm?: number | null, heightMm?: number | null): LabelSizeId | null {
  if (!widthMm || !heightMm) return null
  const match = LABEL_SIZE_OPTIONS.find((option) => option.widthMm === widthMm && option.heightMm === heightMm)
  return match?.id ?? null
}

function formatPrice(price?: string | number | null): string {
  if (price === null || price === undefined || price === '') return ''
  const value = typeof price === 'string' ? Number(price) : price
  if (Number.isNaN(value)) return ''
  return `$${value.toFixed(2)}`
}

function barcodeDataUrl(sku: string): string {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, sku || ' ', {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    height: 120,
    width: 2,
  })
  return canvas.toDataURL('image/png')
}

function truncateForWidth(doc: jsPDF, text: string, maxWidthMm: number): string {
  if (doc.getTextWidth(text) <= maxWidthMm) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidthMm) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

function renderLabel(doc: jsPDF, item: LabelPrintItem, size: LabelSizeOption) {
  const margin = 1
  const price = formatPrice(item.price)
  const barcode = barcodeDataUrl(item.sku)

  if (size.minimal) {
    const barcodeW = size.widthMm - margin * 2
    const barcodeH = size.heightMm * (price ? 0.6 : 0.8)
    doc.addImage(barcode, 'PNG', margin, margin, barcodeW, barcodeH)
    if (price) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(Math.max(6, Math.min(9, size.widthMm / 4.5)))
      doc.text(price, size.widthMm / 2, size.heightMm - margin * 0.4, {
        align: 'center',
        baseline: 'bottom',
      })
    }
    return
  }

  let y = margin + 1.8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  const name = truncateForWidth(doc, item.name || '', size.widthMm - margin * 2)
  doc.text(name, size.widthMm / 2, y, { align: 'center' })

  y += 0.6
  const barcodeW = size.widthMm - margin * 2
  const barcodeH = size.heightMm * 0.42
  doc.addImage(barcode, 'PNG', margin, y, barcodeW, barcodeH)
  y += barcodeH + 2.4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.text(item.sku || '', margin, y)
  if (price) {
    doc.text(price, size.widthMm - margin, y, { align: 'right' })
  }
}

/** Genera un PDF con una página por etiqueta (multiplicada por `quantity`). */
export function generateLabelsPdf(items: LabelPrintItem[], sizeId: LabelSizeId): Blob {
  const size = findLabelSize(sizeId)
  const format: [number, number] = [size.widthMm, size.heightMm]
  const doc = new jsPDF({ unit: 'mm', format })

  const expanded: LabelPrintItem[] = []
  for (const item of items) {
    const copies = Math.max(1, Math.round(item.quantity ?? 1))
    for (let i = 0; i < copies; i += 1) expanded.push(item)
  }
  if (expanded.length === 0) expanded.push({ sku: '', name: '', price: null })

  expanded.forEach((item, index) => {
    if (index > 0) doc.addPage(format)
    renderLabel(doc, item, size)
  })

  return doc.output('blob')
}

/** Abre el PDF generado en un iframe oculto y dispara el diálogo de impresión. */
export function printPdfBlob(blob: Blob) {
  const url = URL.createObjectURL(blob)
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  iframe.src = url
  document.body.appendChild(iframe)
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      // Si el navegador bloquea el print automático, queda disponible para descarga.
    }
  }
  setTimeout(() => {
    iframe.remove()
    URL.revokeObjectURL(url)
  }, 60000)
}

export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
