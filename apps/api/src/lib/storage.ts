import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Abstracción de almacenamiento de archivos (logos, adjuntos, etc.). La interfaz
 * está pensada para poder implementar un adapter de Cloudflare R2 (u otro storage
 * en la nube) sin cambiar el código de las rutas que la consumen.
 */

export interface StoredFile {
  /** Ruta relativa dentro del storage (para persistir en DB). */
  path: string
  /** URL pública/relativa para servir el archivo. */
  url: string
}

export interface StorageProvider {
  save(buffer: Buffer, originalName: string, folder?: string): Promise<StoredFile>
  /** Borra un archivo por su URL pública (`/uploads/...`). No falla si ya no existe. */
  remove(url: string): Promise<void>
}

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads')

/**
 * Adapter local: guarda en el filesystem bajo `uploads/<folder>/` y sirve el
 * archivo vía `/uploads/<folder>/<archivo>` (ver static en index.ts).
 */
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

export class LocalStorageAdapter implements StorageProvider {
  async save(buffer: Buffer, originalName: string, folder = 'misc'): Promise<StoredFile> {
    let ext = path.extname(originalName || '').toLowerCase().slice(0, 10)
    if (!IMAGE_EXTS.has(ext)) {
      ext = '.bin'
    }
    if (ext === '.jpeg') ext = '.jpg'
    const filename = `${randomUUID()}${ext}`
    const dir = path.join(UPLOADS_ROOT, folder)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), buffer)

    const relativePath = [folder, filename].join('/')
    return { path: relativePath, url: `/uploads/${relativePath}` }
  }

  async remove(url: string): Promise<void> {
    if (!url.startsWith('/uploads/')) return
    const target = path.resolve(UPLOADS_ROOT, url.slice('/uploads/'.length))
    // Nunca fuera de la carpeta de uploads.
    if (!target.startsWith(UPLOADS_ROOT + path.sep)) return
    await unlink(target).catch(() => undefined)
  }
}

export const storage: StorageProvider = new LocalStorageAdapter()
