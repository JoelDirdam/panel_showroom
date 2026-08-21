const USER_MESSAGE_MAX = 4000
const ASSISTANT_MESSAGE_MAX = 4096

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{8,}/g,
  /\bBearer\s+[A-Za-z0-9._\-+=/]+/gi,
  /\bDATABASE_URL\b\s*=?\s*\S*/gi,
  /\bOPENAI_API_KEY\b\s*=?\s*\S*/gi,
  /\bJWT_SECRET\b\s*=?\s*\S*/gi,
  /\bprocess\.env(?:\.[A-Z0-9_]+)?/g,
  /\bprisma\.[a-zA-Z]+/gi,
]

const PATH_PATTERN = /(?:[A-Z]:)?[\\/](?:Users|home|app|apps|src|var|opt)[^\s]{4,}/gi

export function sanitizeIncomingMessage(text: string): string {
  return text.replace(/\0/g, '').replace(/\s+/g, ' ').trim().slice(0, USER_MESSAGE_MAX)
}

export function sanitizeOutgoingMessage(text: string): string {
  let out = text.replace(/\0/g, '').trim()
  out = out.replace(/```[\s\S]*?```/g, (block) => {
    if (/\b(import|prisma|process\.env|schema\.prisma|function\s+)/i.test(block)) {
      return '[contenido omitido]'
    }
    return block
  })
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, '[omitido]')
  }
  out = out.replace(PATH_PATTERN, '[ruta omitida]')
  out = out.replace(/\bPuntoManeki\b/gi, 'el negocio')
  out = out.slice(0, ASSISTANT_MESSAGE_MAX).trim()
  return out
}

export function normalizeCustomerPhone(phone: string): string {
  try {
    return decodeURIComponent(phone).trim()
  } catch {
    return phone.trim()
  }
}
