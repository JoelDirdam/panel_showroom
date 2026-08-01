import { randomInt } from 'node:crypto'
import { prisma } from './prisma.js'

const SKU_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSuffix(length = 5): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += SKU_CHARS[randomInt(SKU_CHARS.length)]
  }
  return out
}

function baseFromName(name: string): string {
  const base = name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6)
  return base || 'PROD'
}

/**
 * Genera un SKU único para una marca cuando el usuario deja el campo vacío.
 * Revisa productos existentes y solicitudes pendientes de la misma marca para
 * evitar colisiones (no es 100% atómico, pero suficiente dado el volumen esperado).
 */
export async function generateUniqueSku(brandId: string, name: string): Promise<string> {
  const base = baseFromName(name)
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = `${base}-${randomSuffix(attempt < 5 ? 4 : 6)}`
    const [existingProduct, existingRequest] = await Promise.all([
      prisma.product.findFirst({ where: { brandId, sku: candidate }, select: { id: true } }),
      prisma.productRequest.findFirst({
        where: { brandId, sku: candidate, type: 'CREATE_PRODUCT', status: 'PENDING' },
        select: { id: true },
      }),
    ])
    if (!existingProduct && !existingRequest) return candidate
  }
  return `${base}-${Date.now().toString(36).toUpperCase()}`
}
