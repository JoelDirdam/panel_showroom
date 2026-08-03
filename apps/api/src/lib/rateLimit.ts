import type { NextFunction, Request, Response } from 'express'

/**
 * Rate limiter en memoria (por IP). Suficiente para un solo proceso de API en Railway.
 */
type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(options: {
  windowMs: number
  max: number
  keyPrefix?: string
}) {
  const { windowMs, max, keyPrefix = 'rl' } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for']
    const ip =
      (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    const key = `${keyPrefix}:${ip}`
    const now = Date.now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }
    bucket.count += 1
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo más tarde.' })
    }
    next()
  }
}
