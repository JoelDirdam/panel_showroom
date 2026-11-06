import { timingSafeEqual } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

function tokensMatch(expected: string, provided: string): boolean {
  if (!expected || !provided) return false
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Valida hub.verify_token: env primero (sin BD); si no coincide, un findFirst mínimo.
 */
export async function verifyHubToken(providedToken: string): Promise<boolean> {
  if (!providedToken) return false

  const envToken = process.env.WHATSAPP_VERIFY_TOKEN?.trim() ?? ''
  if (envToken && tokensMatch(envToken, providedToken)) {
    return true
  }

  const row = await prisma.whatsappConfig.findFirst({
    where: { webhookVerifyToken: providedToken, isActive: true },
    select: { id: true },
  })
  return row !== null
}
