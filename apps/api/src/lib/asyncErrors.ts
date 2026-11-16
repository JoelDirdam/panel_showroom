import { createRequire } from 'node:module'
import type { NextFunction, Request, Response } from 'express'

/**
 * Express 4 no espera a los handlers `async`: si uno falla (por ejemplo, la
 * base de datos no responde) la promesa rechazada nunca llega al manejador de
 * errores y la petición se queda colgada. Este parche hace que cualquier
 * rechazo de un handler se pase a `next(err)`, igual que un `throw` síncrono.
 *
 * Debe importarse una vez, antes de atender peticiones.
 */
const require = createRequire(import.meta.url)

type LayerLike = {
  handle: (req: Request, res: Response, next: NextFunction) => unknown
}

const Layer = require('express/lib/router/layer') as {
  prototype: { handle_request: (this: LayerLike, req: Request, res: Response, next: NextFunction) => void }
}

Layer.prototype.handle_request = function handleRequest(
  this: LayerLike,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const fn = this.handle
  // Los manejadores de error (4 argumentos) no atienden peticiones normales.
  if (fn.length > 3) return next()
  try {
    const result = fn(req, res, next)
    if (result && typeof (result as Promise<unknown>).catch === 'function') {
      ;(result as Promise<unknown>).catch((err: unknown) => next(err ?? new Error('Handler rechazado')))
    }
  } catch (err) {
    next(err)
  }
}
