import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { rateLimit } from '../lib/rateLimit.js'
import { sendError } from '../lib/httpError.js'
import { clientIp, clientUserAgent } from '../lib/clientIp.js'
import { verifyPurposeToken } from '../middleware/auth.js'
import { getPublicTrackers } from '../lib/platformSettings.js'
import { sendCopyrightClaimAlert, sendCopyrightClaimReceipt } from '../lib/email.js'
import { approvedTestimonials } from './testimonials.js'

/**
 * Rutas públicas del sitio de COSDI (sin sesión): configuración de rastreadores,
 * baja de correos de marketing y canal de reclamos de derechos de autor.
 */
const router = Router()

/** IDs de rastreadores activos. El navegador solo los carga tras el consentimiento. */
router.get('/config', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ trackers: await getPublicTrackers() })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Testimonios aprobados por la plataforma, para la landing. */
router.get('/testimonials', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.json({ testimonials: await approvedTestimonials() })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Baja de correos de marketing ---------------------------------------------

const unsubscribeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: 'unsubscribe' })

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return `${local.slice(0, 2)}***@${domain}`
}

/**
 * Da de baja de los correos de marketing con el token del enlace.
 * Acepta el token en el cuerpo (página /baja-correos) o en la query
 * (baja con un clic de Gmail/Outlook, RFC 8058). Es idempotente y no requiere sesión.
 */
router.post('/unsubscribe', unsubscribeLimit, async (req, res) => {
  try {
    const token =
      (typeof req.body?.token === 'string' && req.body.token) ||
      (typeof req.query.token === 'string' && req.query.token) ||
      ''
    const payload = token ? verifyPurposeToken<{ uid?: string }>('unsubscribe', token) : null
    if (!payload?.uid) {
      return res.status(400).json({
        error: 'El enlace de baja no es válido. Escríbenos a privacidad@cosdi.mx y te damos de baja.',
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.uid },
      select: { id: true, email: true, marketingOptIn: true, deletedAt: true },
    })
    // Cuenta ya eliminada: no hay nada que dar de baja; se responde igual para no filtrar información.
    if (!user || user.deletedAt) return res.json({ ok: true })

    if (user.marketingOptIn) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { marketingOptIn: false, marketingOptOutAt: new Date() },
        }),
        prisma.consentEvent.create({
          data: {
            userId: user.id,
            email: user.email,
            kind: 'MARKETING_EMAIL',
            granted: false,
            source: 'unsubscribe_link',
            ip: clientIp(req),
            userAgent: clientUserAgent(req),
          },
        }),
      ])
    }
    return res.json({ ok: true, email: maskEmail(user.email) })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Reclamos de derechos de autor ---------------------------------------------

const claimLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'copyright-claim' })

const claimSchema = z.object({
  claimantName: z.string().trim().min(3).max(200),
  claimantEmail: z.string().trim().email().max(200),
  claimantPhone: z.string().trim().max(30).optional().nullable(),
  rightsHolder: z.string().trim().min(2).max(200),
  workDescription: z.string().trim().min(10).max(4000),
  infringingUrl: z.string().trim().min(5).max(2000),
  details: z.string().trim().max(4000).optional().nullable(),
  // Declaraciones bajo protesta de decir verdad: deben marcarse expresamente.
  goodFaith: z.literal(true),
  accuracy: z.literal(true),
  signature: z.string().trim().min(3).max(200),
})

router.post('/copyright-claims', claimLimit, async (req, res) => {
  try {
    const parsed = claimSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Revisa el formulario: faltan datos obligatorios o alguna declaración sin marcar.',
        details: parsed.error.flatten(),
      })
    }
    const data = parsed.data
    const claim = await prisma.copyrightClaim.create({
      data: {
        claimantName: data.claimantName,
        claimantEmail: data.claimantEmail.toLowerCase(),
        claimantPhone: data.claimantPhone || null,
        rightsHolder: data.rightsHolder,
        workDescription: data.workDescription,
        infringingUrl: data.infringingUrl,
        details: data.details || null,
        signature: data.signature,
        ip: clientIp(req),
      },
    })

    const adminEmail = process.env.LEGAL_NOTIFY_EMAIL?.trim() || 'contacto@cosdi.mx'
    void sendCopyrightClaimAlert({
      to: adminEmail,
      claimId: claim.id,
      claimantName: claim.claimantName,
      claimantEmail: claim.claimantEmail,
      infringingUrl: claim.infringingUrl,
    })
    void sendCopyrightClaimReceipt({ to: claim.claimantEmail, name: claim.claimantName, claimId: claim.id })

    return res.status(201).json({ ok: true, id: claim.id })
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
