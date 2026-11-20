import type { Request } from 'express'

/**
 * IP del cliente detrás de Cloudflare / Railway. Se guarda como evidencia de
 * aceptación de términos y consentimientos, por eso no basta `req.ip`
 * (que sería la IP del proxy).
 */
export function clientIp(req: Request): string | null {
  const cf = req.headers['cf-connecting-ip']
  if (typeof cf === 'string' && cf.trim()) return cf.trim().slice(0, 64)
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 64)
  }
  return req.ip ?? req.socket.remoteAddress ?? null
}

export function clientUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent']
  return typeof ua === 'string' && ua ? ua.slice(0, 400) : null
}
