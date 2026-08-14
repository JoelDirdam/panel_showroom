import type { Response } from 'express'

export class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export function sendError(res: Response, e: unknown): Response {
  if (e instanceof HttpError) {
    return res.status(e.status).json({ error: e.message })
  }
  if (e instanceof Error && e.message === 'TENANT_REQUIRED') {
    return res.status(403).json({ error: 'Acceso denegado' })
  }
  console.error(e)
  return res.status(500).json({ error: 'Error interno' })
}
