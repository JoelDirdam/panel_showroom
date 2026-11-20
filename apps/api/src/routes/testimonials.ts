import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { HttpError, sendError } from '../lib/httpError.js'
import { getParam } from '../lib/params.js'
import { audit } from '../lib/audit.js'
import { authenticate, authorize, requireSuperAdminTwoFactor, requireTenantId } from '../middleware/auth.js'

/**
 * Testimonios de negocios sobre COSDI.
 *
 * Flujo: el negocio escribe su opinión desde el panel y autoriza que se publique
 * con su nombre y negocio → queda PENDING → el SUPER_ADMIN la aprueba → aparece
 * en la landing. Las opiniones de redes sociales las agrega el SUPER_ADMIN a mano
 * (con el permiso de quien la escribió); no se copian de forma automática.
 */

export const SOURCES = ['PANEL', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'GOOGLE', 'WHATSAPP'] as const
export const STATUSES = ['PENDING', 'APPROVED', 'HIDDEN'] as const

const PUBLIC_SELECT = {
  id: true,
  authorName: true,
  businessName: true,
  authorRole: true,
  quote: true,
  rating: true,
  source: true,
  sourceUrl: true,
} as const

// --- Negocio ---------------------------------------------------------------

export const businessTestimonials = Router()
businessTestimonials.use(authenticate, authorize('BUSINESS'))

businessTestimonials.get('/mine', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    const mine = await prisma.testimonial.findUnique({
      where: { tenantId },
      select: { ...PUBLIC_SELECT, status: true, updatedAt: true },
    })
    return res.json({ testimonial: mine })
  } catch (e) {
    return sendError(res, e)
  }
})

const businessSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  authorRole: z.string().trim().max(80).nullable().optional(),
  quote: z.string().trim().min(20, 'Escribe al menos 20 caracteres').max(600),
  rating: z.number().int().min(1).max(5),
  // Autorización expresa para publicar nombre, negocio y opinión.
  consent: z.literal(true),
})

businessTestimonials.put('/mine', async (req, res) => {
  try {
    const parsed = businessSchema.safeParse(req.body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return res.status(400).json({
        error: first?.path[0] === 'consent' ? 'Marca la casilla para autorizar la publicación' : first?.message || 'Datos inválidos',
      })
    }
    const tenantId = requireTenantId(req.user!)
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select: { name: true } })
    const data = {
      authorName: parsed.data.authorName,
      authorRole: parsed.data.authorRole?.trim() || null,
      businessName: tenant.name,
      quote: parsed.data.quote,
      rating: parsed.data.rating,
      source: 'PANEL',
      // Si cambia el texto, vuelve a revisión.
      status: 'PENDING',
      approvedAt: null,
      consentAt: new Date(),
    }
    const saved = await prisma.testimonial.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
      select: { ...PUBLIC_SELECT, status: true, updatedAt: true },
    })
    return res.json({ testimonial: saved })
  } catch (e) {
    return sendError(res, e)
  }
})

/** El negocio puede retirar su autorización: se borra y deja de mostrarse. */
businessTestimonials.delete('/mine', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    await prisma.testimonial.deleteMany({ where: { tenantId } })
    return res.json({ ok: true })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Plataforma (SUPER_ADMIN) ----------------------------------------------

export const platformTestimonials = Router()
platformTestimonials.use(authenticate, authorize('SUPER_ADMIN'), requireSuperAdminTwoFactor)

platformTestimonials.get('/', async (_req, res) => {
  try {
    const items = await prisma.testimonial.findMany({
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      select: { ...PUBLIC_SELECT, status: true, tenantId: true, consentAt: true, approvedAt: true, createdAt: true },
      take: 300,
    })
    return res.json({ testimonials: items })
  } catch (e) {
    return sendError(res, e)
  }
})

const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((v) => v.startsWith('https://'), 'El enlace debe empezar con https://')

const manualSchema = z.object({
  authorName: z.string().trim().min(2).max(80),
  businessName: z.string().trim().min(2).max(120),
  authorRole: z.string().trim().max(80).nullable().optional(),
  quote: z.string().trim().min(10).max(600),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  source: z.enum(SOURCES),
  sourceUrl: httpsUrl.nullable().optional(),
  // Confirmación de que la persona autorizó que se publique.
  permissionConfirmed: z.literal(true),
})

platformTestimonials.post('/', async (req, res) => {
  try {
    const parsed = manualSchema.safeParse(req.body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return res.status(400).json({
        error:
          first?.path[0] === 'permissionConfirmed'
            ? 'Confirma que tienes permiso para publicarlo'
            : first?.message || 'Datos inválidos',
      })
    }
    const { permissionConfirmed: _ok, ...data } = parsed.data
    const created = await prisma.testimonial.create({
      data: {
        ...data,
        authorRole: data.authorRole?.trim() || null,
        sourceUrl: data.sourceUrl || null,
        rating: data.rating ?? null,
        status: 'APPROVED',
        approvedAt: new Date(),
        consentAt: new Date(),
      },
    })
    await audit(req, 'testimonial.create', { type: 'testimonial', id: created.id, label: created.authorName })
    return res.status(201).json({ testimonial: created })
  } catch (e) {
    return sendError(res, e)
  }
})

const statusSchema = z.object({ status: z.enum(STATUSES) })

platformTestimonials.patch('/:id', async (req, res) => {
  try {
    const parsed = statusSchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Estado inválido' })
    const id = getParam(req.params.id)
    const exists = await prisma.testimonial.findUnique({ where: { id }, select: { id: true, authorName: true } })
    if (!exists) throw new HttpError(404, 'No encontramos ese testimonio')
    const updated = await prisma.testimonial.update({
      where: { id },
      data: { status: parsed.data.status, approvedAt: parsed.data.status === 'APPROVED' ? new Date() : null },
    })
    await audit(req, `testimonial.${parsed.data.status.toLowerCase()}`, {
      type: 'testimonial',
      id,
      label: exists.authorName,
    })
    return res.json({ testimonial: updated })
  } catch (e) {
    return sendError(res, e)
  }
})

platformTestimonials.delete('/:id', async (req, res) => {
  try {
    const id = getParam(req.params.id)
    const { count } = await prisma.testimonial.deleteMany({ where: { id } })
    if (!count) throw new HttpError(404, 'No encontramos ese testimonio')
    await audit(req, 'testimonial.delete', { type: 'testimonial', id })
    return res.json({ ok: true })
  } catch (e) {
    return sendError(res, e)
  }
})

// --- Público (landing) -----------------------------------------------------

export async function approvedTestimonials() {
  return prisma.testimonial.findMany({
    where: { status: 'APPROVED' },
    select: PUBLIC_SELECT,
    orderBy: { approvedAt: 'desc' },
    take: 12,
  })
}
