import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
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
}

export const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads')

/**
 * Adapter local: guarda en el filesystem bajo `uploads/<folder>/` y sirve el
 * archivo vía `/uploads/<folder>/<archivo>` (ver static en index.ts).
 */
export class LocalStorageAdapter implements StorageProvider {
  async save(buffer: Buffer, originalName: string, folder = 'misc'): Promise<StoredFile> {
    const ext = path.extname(originalName || '').slice(0, 10)
    const filename = `${randomUUID()}${ext}`
    const dir = path.join(UPLOADS_ROOT, folder)
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, filename), buffer)

    const relativePath = [folder, filename].join('/')
    return { path: relativePath, url: `/uploads/${relativePath}` }
  }
}

export const storage: StorageProvider = new LocalStorageAdapter()
