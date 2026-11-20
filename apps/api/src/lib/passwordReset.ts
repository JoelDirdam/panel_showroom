import { timingSafeEqual } from 'node:crypto'
import { sendTemplateMessage } from '../modules/whatsapp/index.js'
import { normalizeWhatsappPhone, platformCredentials } from '../services/appointmentReminders.service.js'

/**
 * Recuperar contraseña: reglas comunes (OWASP Forgot Password Cheat Sheet).
 * - Respuesta idéntica exista o no la cuenta.
 * - Código de 6 dígitos aleatorio, guardado como hash, 15 min, un solo uso, 5 intentos.
 * - Pedir un código nuevo anula los anteriores; máximo 5 por hora por cuenta.
 * - Al cambiarla se cierran las demás sesiones y se avisa por correo.
 */
export const RESET_MAX_PER_HOUR = 5

/** Compara hashes hex en tiempo constante. */
export function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

/** Contraseñas demasiado comunes (lista corta; NIST recomienda bloquearlas). */
const COMMON = new Set([
  '12345678', '123456789', '1234567890', '87654321', '11111111', '00000000', '12341234',
  'password', 'password1', 'contraseña', 'contrasena', 'qwerty123', 'qwertyui', 'abc12345',
  'iloveyou', 'mexico123', 'cosdi123', 'admin123', 'bienvenido', 'asdfghjk',
])

export function passwordProblem(password: string, email: string): string | null {
  if (password.length < 8) return 'Usa al menos 8 caracteres'
  if (password.length > 128) return 'Usa máximo 128 caracteres'
  const lower = password.toLowerCase()
  if (COMMON.has(lower)) return 'Esa contraseña es muy común. Elige otra.'
  if (lower === email.toLowerCase() || lower === email.split('@')[0].toLowerCase()) {
    return 'No uses tu correo como contraseña'
  }
  return null
}

/**
 * Envía el código por WhatsApp con una plantilla de autenticación aprobada por Meta
 * (botón "Copiar código"). Devuelve false si no está configurado o falla, para
 * mandarlo por correo en su lugar.
 */
export async function sendResetCodeByWhatsapp(phone: string, code: string): Promise<boolean> {
  const platform = platformCredentials()
  const templateName = process.env.WHATSAPP_OTP_TEMPLATE?.trim()
  const to = normalizeWhatsappPhone(phone)
  if (!platform || !templateName || !to) return false
  try {
    await sendTemplateMessage(
      {
        to,
        templateName,
        languageCode: process.env.WHATSAPP_OTP_LANG?.trim() || 'es_MX',
        bodyParams: [code],
        // Las plantillas de autenticación llevan el código también en el botón.
        urlButtonParams: [code],
      },
      platform.token,
      platform.phoneNumberId,
    )
    return true
  } catch (err) {
    console.error('[password-reset] WhatsApp falló:', err instanceof Error ? err.message : err)
    return false
  }
}
