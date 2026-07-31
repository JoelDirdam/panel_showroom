import { createHash, randomInt } from 'node:crypto'

/** Vigencia de un código de verificación (email/SMS). */
export const CODE_TTL_MS = 15 * 60 * 1000
/** Intentos fallidos permitidos antes de exigir reenvío. */
export const MAX_ATTEMPTS = 5
/** Tiempo mínimo entre reenvíos de código. */
export const RESEND_COOLDOWN_MS = 60 * 1000

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0')
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export function codeExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + CODE_TTL_MS)
}

export function msUntilResendAllowed(lastSentAt: Date, now: Date = new Date()): number {
  const elapsed = now.getTime() - lastSentAt.getTime()
  return Math.max(0, RESEND_COOLDOWN_MS - elapsed)
}
