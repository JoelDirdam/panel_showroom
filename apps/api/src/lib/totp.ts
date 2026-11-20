import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto'
import { serverSecret } from '../middleware/auth.js'

/**
 * Verificación en dos pasos con app de autenticación (TOTP, RFC 6238):
 * SHA-1, 6 dígitos, periodo de 30 s — lo que esperan Google Authenticator,
 * Microsoft Authenticator, Authy, 1Password, etc.
 */

const PERIOD_SECONDS = 30
const DIGITS = 6
/** Pasos de tolerancia hacia atrás/adelante por desfase de reloj (±30 s). */
const WINDOW = 1
const ISSUER = 'COSDI'
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of buf) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    value = (value << 5) | BASE32.indexOf(char)
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

/** Secreto nuevo (160 bits) en base32, tal como lo muestra la app de autenticación. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

export function hotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32)
  const msg = Buffer.alloc(8)
  msg.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac('sha1', key).update(msg).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3]
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

export function currentStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / PERIOD_SECONDS)
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

/**
 * Valida un código. Devuelve el paso aceptado, o null si es incorrecto o ya
 * se usó (`lastStep`): un código no puede reutilizarse.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  lastStep: number | null = null,
  nowMs: number = Date.now(),
): number | null {
  const clean = code.replace(/\s/g, '')
  if (!/^\d{6}$/.test(clean)) return null
  const now = currentStep(nowMs)
  let matched: number | null = null
  for (let delta = -WINDOW; delta <= WINDOW; delta += 1) {
    const step = now + delta
    // Sin salida anticipada: tiempo constante respecto a qué paso coincide.
    if (safeEqual(hotp(secretBase32, step), clean) && matched === null) matched = step
  }
  if (matched === null) return null
  if (lastStep !== null && matched <= lastStep) return null
  return matched
}

/** URI que codifica el QR (formato Key URI de Google Authenticator). */
export function totpUri(secretBase32: string, accountEmail: string): string {
  const label = encodeURIComponent(`${ISSUER}:${accountEmail}`)
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer: ISSUER,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

// --- Cifrado del secreto en reposo ------------------------------------------

/**
 * Clave AES-256 para cifrar los secretos en la base de datos. Usa TOTP_ENC_KEY
 * si existe; si no, se deriva de JWT_SECRET. OJO: si esa clave cambia, los
 * secretos guardados dejan de poder leerse y cada usuario tendría que volver a
 * configurar su 2FA (o usar `npm run db:reset-2fa`).
 */
function encryptionKey(): Buffer {
  const base = process.env.TOTP_ENC_KEY?.trim() || serverSecret()
  return createHash('sha256').update(`cosdi:totp:v1:${base}`).digest()
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`
}

export function decryptSecret(stored: string): string | null {
  try {
    const [version, ivB64, tagB64, dataB64] = stored.split(':')
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return null
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return null
  }
}

// --- Códigos de recuperación ------------------------------------------------

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // sin caracteres ambiguos
export const RECOVERY_CODE_COUNT = 10

function randomGroup(length: number): string {
  let out = ''
  for (let i = 0; i < length; i += 1) out += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)]
  return out
}

export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(`cosdi:recovery:${normalizeRecoveryCode(code)}`).digest('hex')
}

/** Genera los códigos (se muestran una sola vez) y sus hashes (lo que se guarda). */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () => `${randomGroup(5)}-${randomGroup(5)}`)
  return { codes, hashes: codes.map(hashRecoveryCode) }
}

export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === 10 && !/^\d{6}$/.test(code.replace(/\s/g, ''))
}
