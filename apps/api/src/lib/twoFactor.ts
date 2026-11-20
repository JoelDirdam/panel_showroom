import type { User } from '@prisma/client'
import { prisma } from './prisma.js'
import {
  decryptSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  verifyTotp,
} from './totp.js'

/**
 * Verifica el segundo factor de un usuario (código de la app o código de
 * recuperación) con límite de intentos por usuario, y deja registrado el uso
 * para que ningún código pueda repetirse.
 */

const MAX_FAILURES = 5
const LOCK_WINDOW_MS = 15 * 60 * 1000

type Failures = { count: number; resetAt: number }
const failures = new Map<string, Failures>()

function isLocked(userId: string): boolean {
  const entry = failures.get(userId)
  if (!entry) return false
  if (entry.resetAt <= Date.now()) {
    failures.delete(userId)
    return false
  }
  return entry.count >= MAX_FAILURES
}

function registerFailure(userId: string): void {
  const now = Date.now()
  const entry = failures.get(userId)
  if (!entry || entry.resetAt <= now) {
    failures.set(userId, { count: 1, resetAt: now + LOCK_WINDOW_MS })
  } else {
    entry.count += 1
  }
}

export type SecondFactorResult =
  | { ok: true; usedRecoveryCode: boolean }
  | { ok: false; status: number; error: string }

export async function verifySecondFactor(
  user: Pick<User, 'id' | 'totpSecret' | 'totpLastStep' | 'totpRecoveryCodes'>,
  rawCode: string,
  options: { allowRecoveryCode: boolean },
): Promise<SecondFactorResult> {
  if (isLocked(user.id)) {
    return { ok: false, status: 429, error: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' }
  }

  const code = rawCode.trim()

  if (options.allowRecoveryCode && looksLikeRecoveryCode(code)) {
    const hash = hashRecoveryCode(code)
    if (user.totpRecoveryCodes.includes(hash)) {
      // Condición en el WHERE: si dos peticiones usan el mismo código, solo una lo consume.
      const consumed = await prisma.user.updateMany({
        where: { id: user.id, totpRecoveryCodes: { has: hash } },
        data: { totpRecoveryCodes: user.totpRecoveryCodes.filter((h) => h !== hash) },
      })
      if (consumed.count === 1) {
        failures.delete(user.id)
        return { ok: true, usedRecoveryCode: true }
      }
    }
    registerFailure(user.id)
    return { ok: false, status: 401, error: 'Código de recuperación incorrecto o ya utilizado' }
  }

  const secret = user.totpSecret ? decryptSecret(user.totpSecret) : null
  if (!secret) {
    return { ok: false, status: 400, error: 'La verificación en dos pasos no está configurada' }
  }

  const step = verifyTotp(secret, code, user.totpLastStep)
  if (step === null) {
    registerFailure(user.id)
    return { ok: false, status: 401, error: 'Código incorrecto o vencido. Revisa la hora de tu teléfono e inténtalo de nuevo.' }
  }

  // Marca el paso como usado solo si nadie lo usó antes (evita repetición en paralelo).
  const marked = await prisma.user.updateMany({
    where: {
      id: user.id,
      OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }],
    },
    data: { totpLastStep: step },
  })
  if (marked.count !== 1) {
    registerFailure(user.id)
    return { ok: false, status: 401, error: 'Ese código ya se usó. Espera a que tu app muestre uno nuevo.' }
  }

  failures.delete(user.id)
  return { ok: true, usedRecoveryCode: false }
}
