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
    rollUrl: 'https://listado.mercadolibre.com.mx/etiquetas-termicas-58x13',
  },
  {
    id: '38x25',
    widthMm: 38,
    heightMm: 25,
    label: '38 × 25 mm',
    description: 'Etiqueta chica: solo código de barras + precio.',
    minimal: true,
    rollUrl: 'https://listado.mercadolibre.com.mx/etiquetas-termicas-38x25',
  },
  {
    id: '27x13',
    widthMm: 27,
    heightMm: 13,
    label: '27 × 13 mm',
    description: 'Etiqueta mini (joyería / accesorios): solo código de barras + precio.',
    minimal: true,
    rollUrl: 'https://listado.mercadolibre.com.mx/etiquetas-termicas-27x13',
  },
]

const PT_TO_MM = 25.4 / 72
const PRINT_DPI = 300

type PageOrientation = 'landscape' | 'portrait'

function pageOrientation(size: LabelSizeOption): PageOrientation {
  return size.widthMm >= size.heightMm ? 'landscape' : 'portrait'
}

function pageFormat(size: LabelSizeOption): [number, number] {
  return [size.widthMm, size.heightMm]
}

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

function fontHeightMm(fontSizePt: number): number {
  return fontSizePt * PT_TO_MM
}

function mmToPx(mm: number): number {
  return Math.max(1, Math.round((mm / 25.4) * PRINT_DPI))
}

function barcodeDataUrl(sku: string, destWidthMm: number, destHeightMm: number): string {
  const value = sku.trim() || '-'
  const targetW = mmToPx(destWidthMm)
  const targetH = mmToPx(destHeightMm)
  const quiet = Math.max(4, Math.round(targetW * 0.04))
  const baseOptions = {
    format: 'CODE128' as const,
    displayValue: false,
    background: '#ffffff',
    lineColor: '#000000',
  }

  const render = (text: string, width: number) => {
    const canvas = document.createElement('canvas')
    JsBarcode(canvas, text, {
      ...baseOptions,
      width,
      height: Math.max(8, targetH - 2),
      margin: 0,
      marginLeft: quiet,
      marginRight: quiet,
      marginTop: 1,
      marginBottom: 1,
    })
    return canvas
  }

  let canvas: HTMLCanvasElement
  try {
    const probe = document.createElement('canvas')
    JsBarcode(probe, value, { ...baseOptions, margin: 0, width: 1, height: 10 })
    const modules = Math.max(1, probe.width)
    const usable = Math.max(1, targetW - quiet * 2)
    const moduleWidth = Math.max(1, Math.floor(usable / modules))
    canvas = render(value, moduleWidth)
  } catch {
    canvas = render('-', 2)
  }

  if (canvas.width === targetW && canvas.height === targetH) {
    return canvas.toDataURL('image/png')
  }

  const fitted = document.createElement('canvas')
  fitted.width = targetW
  fitted.height = targetH
  const ctx = fitted.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetW, targetH)
  ctx.drawImage(canvas, 0, 0, targetW, targetH)
  return fitted.toDataURL('image/png')
}

function truncateForWidth(doc: jsPDF, text: string, maxWidthMm: number): string {
  if (!text) return ''
  if (doc.getTextWidth(text) <= maxWidthMm) return text
  let truncated = text
  while (truncated.length > 1 && doc.getTextWidth(`${truncated}…`) > maxWidthMm) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated}…`
}

function addBarcodeImage(doc: jsPDF, dataUrl: string, x: number, y: number, w: number, h: number) {
  doc.addImage(dataUrl, 'PNG', x, y, w, h, undefined, 'NONE')
}

function renderLabel(doc: jsPDF, item: LabelPrintItem, size: LabelSizeOption) {
  const pageW = size.widthMm
  const pageH = size.heightMm
  const pad = pageH <= 14 ? 0.5 : 0.8
  const innerW = pageW - pad * 2
  const price = formatPrice(item.price)
  const sku = item.sku || ''

  if (size.minimal) {
    const pricePt = pageH <= 14 ? 5 : Math.min(8, pageW / 5)
    const priceH = price ? fontHeightMm(pricePt) + 0.15 : 0
    const gap = price ? 0.3 : 0
    const barcodeH = Math.max(2.5, pageH - pad * 2 - priceH - gap)
    const barcode = barcodeDataUrl(sku, innerW, barcodeH)
    addBarcodeImage(doc, barcode, pad, pad, innerW, barcodeH)
    if (price) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(pricePt)
      doc.text(truncateForWidth(doc, price, innerW), pageW / 2, pageH - pad, {
        align: 'center',
        baseline: 'bottom',
      })
    }
    return
  }

  const namePt = 4.5
  const footerPt = 5.5
  const nameH = fontHeightMm(namePt) + 0.15
  const footerH = fontHeightMm(footerPt) + 0.15
  const gap = 0.25
  const barcodeH = Math.max(3, pageH - pad * 2 - nameH - footerH - gap * 2)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(namePt)
  doc.text(truncateForWidth(doc, item.name || '', innerW), pageW / 2, pad, {
    align: 'center',
    baseline: 'top',
  })

  const barcodeY = pad + nameH + gap
  const barcode = barcodeDataUrl(sku, innerW, barcodeH)
  addBarcodeImage(doc, barcode, pad, barcodeY, innerW, barcodeH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(footerPt)
  const priceW = price ? doc.getTextWidth(price) + 1.2 : 0
  const skuMax = Math.max(4, innerW - priceW)
  doc.text(truncateForWidth(doc, sku, skuMax), pad, pageH - pad, { baseline: 'bottom' })
  if (price) {
    doc.text(price, pageW - pad, pageH - pad, { align: 'right', baseline: 'bottom' })
  }
}

/** Genera un PDF con una página por etiqueta (multiplicada por `quantity`). */
export function generateLabelsPdf(items: LabelPrintItem[], sizeId: LabelSizeId): Blob {
  const size = findLabelSize(sizeId)
  const format = pageFormat(size)
  const orientation = pageOrientation(size)
  const doc = new jsPDF({ unit: 'mm', format, orientation, compress: false })

  const expanded: LabelPrintItem[] = []
  for (const item of items) {
    const copies = Math.max(1, Math.round(item.quantity ?? 1))
    for (let i = 0; i < copies; i += 1) expanded.push(item)
  }
  if (expanded.length === 0) expanded.push({ sku: '', name: '', price: null })

  expanded.forEach((item, index) => {
    if (index > 0) doc.addPage(format, orientation)
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
  iframe.style.width = '1px'
  iframe.style.height = '1px'
  iframe.style.opacity = '0'
  iframe.style.pointerEvents = 'none'
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
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
