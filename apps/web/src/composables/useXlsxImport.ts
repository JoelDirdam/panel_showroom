export interface ImportColumnOption {
  value: string
  label: string
}

export interface ImportColumn {
  key: string
  label: string
  required?: boolean
  /** When set to `select`, the preview renders a dropdown with `options`. */
  type?: 'text' | 'select'
  options?: ImportColumnOption[]
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

function parseCsvText(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => normalizeHeader(h.replace(/^"|"$/g, '')))
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((key, idx) => {
      row[key] = cells[idx] ?? ''
    })
    return row
  })
  return { headers, rows }
}

async function parseXlsxBuffer(buffer: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const sheet = workbook.worksheets[0]
  if (!sheet) return { headers: [], rows: [] }

  const headerRow = sheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = normalizeHeader(String(cell.value ?? ''))
  })

  const rows: Record<string, string>[] = []
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return
    const record: Record<string, string> = {}
    headers.forEach((key, idx) => {
      const cell = row.getCell(idx + 1)
      const raw = cell.value
      record[key] =
        raw == null
          ? ''
          : typeof raw === 'object' && 'text' in raw
            ? String((raw as { text: string }).text)
            : String(raw)
    })
    if (Object.values(record).some((v) => v.trim())) rows.push(record)
  })
  return { headers, rows }
}

export async function parseSpreadsheetFile(
  file: File,
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.csv') || file.type.includes('csv')) {
    return parseCsvText(await file.text())
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsxBuffer(await file.arrayBuffer())
  }
  // Try xlsx first, fall back to csv text
  try {
    return await parseXlsxBuffer(await file.arrayBuffer())
  } catch {
    return parseCsvText(await file.text())
  }
}
