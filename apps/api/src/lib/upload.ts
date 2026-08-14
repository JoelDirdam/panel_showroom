import multer from 'multer'
import path from 'node:path'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

export function extensionForMime(mime: string): string {
  return MIME_TO_EXT[mime] || '.bin'
}

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error('Solo se permiten imágenes JPEG, PNG o WebP'))
      return
    }
    cb(null, true)
  },
})

/** Extensión segura a partir del MIME (ignora originalname del cliente). */
export function safeImageExtension(file: Express.Multer.File): string {
  return extensionForMime(file.mimetype)
}

/** Nombre original sintético con extensión forzada por MIME. */
export function safeImageOriginalName(file: Express.Multer.File): string {
  const base = path.basename(file.originalname || 'image', path.extname(file.originalname || ''))
  return `${base || 'image'}${safeImageExtension(file)}`
}
