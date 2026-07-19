import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'

const router = Router()

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  contactEmail: z.string().email().optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
  createUser: z.boolean().optional(),
  password: z.string().min(8).optional(),
  userName: z.string().min(1).optional(),
})

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
  contactEmail: z.string().email().optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
})

const deleteBrandSchema = z.object({
  slug: z.string().min(1),
})

router.use(authenticate)

router.get('/', authorize('ADMIN'), async (req, res) => {
  const brands = await prisma.brand.findMany({
    where: tenantFilter(req.user!),
    orderBy: [{ isHouseBrand: 'desc' }, { name: 'asc' }],
    include: {
      _count: { select: { products: true, users: true } },
    },
  })
  return res.json(brands)
})

router.get('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findFirst({
    where: { id, ...tenantFilter(req.user!) },
    include: { _count: { select: { products: true, users: true } } },
  })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })
  return res.json(brand)
})

router.post('/', authorize('ADMIN'), async (req, res) => {
  const parsed = createBrandSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const { createUser, password, userName, ...brandData } = parsed.data
  const tenantId = req.user!.tenantId

  // Usuario BRAND sin marca (residuo de una marca eliminada): se reutiliza en vez de bloquear el email.
  let orphanUserId: string | null = null

  if (createUser) {
    if (!brandData.contactEmail) {
      return res.status(400).json({ error: 'Email de contacto requerido para crear usuario' })
    }
    if (!password) {
      return res.status(400).json({ error: 'Contraseña temporal requerida (mín. 8 caracteres)' })
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: brandData.contactEmail },
    })
    if (existingUser) {
      const isOrphanBrandUser =
        existingUser.role === 'BRAND' &&
        existingUser.brandId === null &&
        existingUser.tenantId === tenantId
      if (!isOrphanBrandUser) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email' })
      }
      orphanUserId = existingUser.id
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          name: brandData.name,
          slug: brandData.slug,
          contactEmail: brandData.contactEmail ?? null,
          whatsapp: brandData.whatsapp?.trim() || null,
          active: brandData.active ?? true,
          isHouseBrand: false,
          tenantId,
        },
      })

      if (createUser && brandData.contactEmail && password) {
        const hash = await bcrypt.hash(password, 10)
        if (orphanUserId) {
          await tx.user.update({
            where: { id: orphanUserId },
            data: {
              password: hash,
              name: userName || brandData.name,
              brandId: brand.id,
              mustChangePassword: true,
            },
          })
        } else {
          await tx.user.create({
            data: {
              email: brandData.contactEmail,
              password: hash,
              name: userName || brandData.name,
              role: 'BRAND',
              tenantId,
              brandId: brand.id,
              mustChangePassword: true,
            },
          })
        }
      }

      return brand
    })

    const brandWithCount = await prisma.brand.findUnique({
      where: { id: result.id },
      include: { _count: { select: { products: true, users: true } } },
    })

    return res.status(201).json({
      ...brandWithCount,
      ...(createUser && password ? { temporaryPassword: password } : {}),
    })
  } catch (e: unknown) {
    const err = e as { code?: string }
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Slug o email ya existe' })
    }
    return res.status(409).json({ error: 'No se pudo crear la marca' })
  }
})

router.patch('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = updateBrandSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const existing = await prisma.brand.findFirst({
    where: { id, ...tenantFilter(req.user!) },
  })
  if (!existing) return res.status(404).json({ error: 'Marca no encontrada' })

  try {
    const brand = await prisma.brand.update({
      where: { id },
      data: parsed.data,
      include: { _count: { select: { products: true, users: true } } },
    })
    return res.json(brand)
  } catch {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }
})

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = deleteBrandSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Escribe el slug de la marca para confirmar' })
  }

  const existing = await prisma.brand.findFirst({
    where: { id, ...tenantFilter(req.user!) },
    include: {
      _count: { select: { products: true } },
      users: { where: { role: 'BRAND' }, select: { id: true } },
    },
  })
  if (!existing) return res.status(404).json({ error: 'Marca no encontrada' })

  if (existing.isHouseBrand) {
    return res.status(400).json({ error: 'No se puede eliminar la marca del showroom' })
  }

  if (parsed.data.slug !== existing.slug) {
    return res.status(400).json({ error: 'El slug escrito no coincide con el de la marca' })
  }

  try {
    const salesCount = await prisma.saleLine.count({
      where: { product: { brandId: id } },
    })

    if (existing._count.products > 0 || salesCount > 0) {
      await prisma.brand.update({
        where: { id },
        data: { active: false },
      })
      return res.json({
        action: 'deactivated',
        message: 'La marca tiene productos o ventas y fue marcada como inactiva',
      })
    }

    const brandUserIds = existing.users.map((user) => user.id)
    await prisma.$transaction(async (tx) => {
      await tx.brand.delete({ where: { id } })
      if (brandUserIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: brandUserIds } } })
      }
    })

    return res.json({ action: 'deleted', message: 'Marca eliminada correctamente' })
  } catch {
    return res.status(409).json({ error: 'No se pudo eliminar la marca' })
  }
})

export default router
