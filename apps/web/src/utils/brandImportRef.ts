/** Referencia de marca en plantillas de importación (nombre, # o id). */

export type BrandImportRef = {
  id: string
  name: string
  slug?: string | null
  isHouseBrand?: boolean
  createdAt?: Date | string
}

export function brandDisplayName(brand: BrandImportRef): string {
  return brand.isHouseBrand ? `Propio — ${brand.name}` : brand.name
}

export function brandDropdownLabel(index: number, brand: BrandImportRef): string {
  return `${index + 1} - ${brandDisplayName(brand)}`
}

export function sortBrandsForImport<T extends BrandImportRef>(brands: T[]): T[] {
  return [...brands].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    if (aTime !== bTime) return aTime - bTime
    return a.name.localeCompare(b.name, 'es')
  })
}

export function normalizeBrandRef(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
}

function matchBrandByLabel(value: string, brands: BrandImportRef[]): BrandImportRef | undefined {
  const norm = normalizeBrandRef(value)
  if (!norm) return undefined
  return brands.find((brand) => {
    const display = normalizeBrandRef(brandDisplayName(brand))
    const name = normalizeBrandRef(brand.name)
    const slug = normalizeBrandRef(brand.slug || '')
    return display === norm || name === norm || (slug !== '' && slug === norm)
  })
}

/**
 * Resuelve texto de la columna `marca` a un brand id.
 * Acepta: "1 - Acme", "1", "Acme", "Propio — Acme", slug o UUID.
 * El nombre gana sobre el número cuando ambos vienen en el valor.
 */
export function resolveBrandRef(
  raw: string | null | undefined,
  brands: BrandImportRef[],
): string | null {
  const value = String(raw ?? '').trim()
  if (!value) return null

  const byId = brands.find((brand) => brand.id === value)
  if (byId) return byId.id

  const numbered = value.match(/^(\d+)\s*[-–—]\s*(.+)$/)
  if (numbered) {
    const byName = matchBrandByLabel(numbered[2], brands)
    if (byName) return byName.id
  }

  const byLabel = matchBrandByLabel(value, brands)
  if (byLabel) return byLabel.id

  const indexRaw = numbered ? numbered[1] : /^\d+$/.test(value) ? value : null
  if (indexRaw) {
    const index = Number.parseInt(indexRaw, 10)
    if (index >= 1 && index <= brands.length) return brands[index - 1].id
  }

  return null
}
