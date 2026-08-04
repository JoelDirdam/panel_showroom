import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { slugify } from '../lib/slug.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'

const router = Router()

const feePayerEnum = z.enum(['BRAND', 'CLIENT', 'BUSINESS'])

const brandCommonFields = {
  contactEmail: z.string().email().optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
  monthlyRent: z.coerce.number().min(0).optional(),
  assignedSpace: z.string().max(120).optional().nullable(),
  cutoffDate: z.union([z.coerce.date(), z.null()]).optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  cardFeePayer: feePayerEnum.optional(),
  transferFeePayer: feePayerEnum.optional(),
}

const createBrandSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  createUser: z.boolean().optional(),
  password: z.string().min(8).optional(),
  userName: z.string().min(1).optional(),
  /** Marca propia del negocio (productos de la casa). Solo una por tenant. */
  isHouseBrand: z.boolean().optional(),
  ...brandCommonFields,
})

const updateBrandSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  ...brandCommonFields,
})

const deleteBrandSchema = z.object({
  slug: z.string().min(1),
})

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
})

const redeemInviteSchema = z.object({
  code: z.string().min(4),
})

const importRowSchema = z.object({
  name: z.string().min(1),
  monthlyRent: z.coerce.number().min(0).optional(),
  assignedSpace: z.string().optional(),
  phone: z.string().optional(),
  cutoffDate: z.string().optional(),
  commissionPercent: z.coerce.number().min(0).max(100).optional(),
  cardFeePayer: feePayerEnum.optional(),
  transferFeePayer: feePayerEnum.optional(),
  contactEmail: z.string().email().optional(),
  whatsapp: z.string().optional(),
})

const brandInclude = {
  _count: { select: { products: true, users: true } },
  owner: { select: { id: true, name: true, email: true } },
} as const

async function uniqueSlug(tenantId: string, base: string, excludeId?: string): Promise<string> {
  const existing = await prisma.brand.findMany({
    where: { tenantId, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  })
  const taken = new Set(existing.map((b) => b.slug))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

// Sin caracteres ambiguos (0/O, 1/I) para que el código se pueda transcribir a mano.
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateInviteCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS[randomInt(INVITE_CODE_CHARS.length)]
  }
  return code
}

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
}

router.use(authenticate)

router.get('/', authorize('BUSINESS'), async (req, res) => {
  const brands = await prisma.brand.findMany({
    where: tenantFilter(req.user!),
    orderBy: [{ isHouseBrand: 'desc' }, { name: 'asc' }],
    include: brandInclude,
  })
  return res.json(brands)
})

/** KPIs para el listado de marcas. */
router.get('/stats', authorize('BUSINESS'), async (req, res) => {
  const where = tenantFilter(req.user!)
  const [total, withOwner, aggregate] = await Promise.all([
    prisma.brand.count({ where }),
    prisma.brand.count({ where: { ...where, ownerUserId: { not: null } } }),
    prisma.brand.aggregate({ where, _avg: { monthlyRent: true } }),
  ])

  return res.json({
    total,
    // Toda marca pertenece siempre a un negocio (tenant); se reporta igual para exponer el KPI del plan.
    withBusiness: total,
    withOwner,
    avgRent: aggregate._avg.monthlyRent ? Number(aggregate._avg.monthlyRent) : 0,
  })
})

/** Plantilla CSV para alta masiva de marcas. */
router.get('/template', authorize('BUSINESS'), async (_req, res) => {
  const header =
    'name,monthlyRent,assignedSpace,phone,cutoffDate,commissionPercent,cardFeePayer,transferFeePayer,contactEmail,whatsapp'
  const example =
    'Marca Ejemplo,3500,Pasillo A - Local 3,5215512345678,2026-08-01,15,BRAND,BUSINESS,contacto@marca.com,5215512345678'
  const csv = `${header}\n${example}\n`

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla-marcas.csv"')
  return res.send(csv)
})

/** Alta masiva desde CSV (mismas columnas que /brands/template). */
router.post('/import', authorize('BUSINESS'), async (req, res) => {
  const { csv } = req.body as { csv?: string }
  if (!csv || typeof csv !== 'string' || !csv.trim()) {
    return res.status(400).json({ error: 'Falta el contenido CSV' })
  }

  const rows = parseCsv(csv)
  if (rows.length < 2) {
    return res.status(400).json({ error: 'El archivo no tiene filas de datos' })
  }

  const header = rows[0].map((h) => h.trim().toLowerCase())
  const dataRows = rows.slice(1)
  const tenantId = req.user!.tenantId

  const created: string[] = []
  const errors: Array<{ row: number; name?: string; error: string }> = []

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i]
    const record: Record<string, string> = {}
    header.forEach((key, idx) => {
      record[key] = cells[idx] ?? ''
    })

    const parsed = importRowSchema.safeParse({
      name: record.name,
      monthlyRent: record.monthlyrent || undefined,
      assignedSpace: record.assignedspace || undefined,
      phone: record.phone || undefined,
      cutoffDate: record.cutoffdate || undefined,
      commissionPercent: record.commissionpercent || undefined,
      cardFeePayer: record.cardfeepayer ? record.cardfeepayer.toUpperCase() : undefined,
      transferFeePayer: record.transferfeepayer ? record.transferfeepayer.toUpperCase() : undefined,
      contactEmail: record.contactemail || undefined,
      whatsapp: record.whatsapp || undefined,
    })

    if (!parsed.success) {
      errors.push({ row: i + 2, name: record.name, error: 'Datos inválidos en la fila' })
      continue
    }

    const base = slugify(parsed.data.name)
    if (!base) {
      errors.push({ row: i + 2, name: record.name, error: 'Nombre inválido' })
      continue
    }

    try {
      const slug = await uniqueSlug(tenantId, base)
      await prisma.brand.create({
        data: {
          tenantId,
          name: parsed.data.name,
          slug,
          contactEmail: parsed.data.contactEmail || null,
          whatsapp: parsed.data.whatsapp || null,
          phone: parsed.data.phone || null,
          assignedSpace: parsed.data.assignedSpace || null,
          monthlyRent: parsed.data.monthlyRent ?? 0,
          commissionPercent: parsed.data.commissionPercent ?? 0,
          cardFeePayer: parsed.data.cardFeePayer ?? 'BRAND',
          transferFeePayer: parsed.data.transferFeePayer ?? 'BRAND',
          cutoffDate: parsed.data.cutoffDate ? new Date(parsed.data.cutoffDate) : null,
        },
      })
      created.push(parsed.data.name)
    } catch {
      errors.push({ row: i + 2, name: record.name, error: 'No se pudo crear (¿nombre duplicado?)' })
    }
  }

  return res.json({ createdCount: created.length, errorCount: errors.length, errors })
})

/** Elimina (o desactiva si tiene historial) varias marcas a la vez. */
router.post('/bulk-delete', authorize('BUSINESS'), async (req, res) => {
  const parsed = bulkDeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Selecciona al menos una marca' })
  }

  const brands = await prisma.brand.findMany({
    where: { id: { in: parsed.data.ids }, ...tenantFilter(req.user!) },
    include: {
      _count: { select: { products: true } },
      users: { where: { role: 'BRAND' }, select: { id: true } },
    },
  })

  let deleted = 0
  let deactivated = 0
  const skipped: Array<{ id: string; reason: string }> = []

  for (const brand of brands) {
    if (brand.isHouseBrand) {
      skipped.push({ id: brand.id, reason: 'Marca del showroom' })
      continue
    }

    const salesCount = await prisma.saleLine.count({ where: { product: { brandId: brand.id } } })
    if (brand._count.products > 0 || salesCount > 0) {
      await prisma.brand.update({ where: { id: brand.id }, data: { active: false } })
      deactivated += 1
      continue
    }

    const brandUserIds = brand.users.map((u) => u.id)
    await prisma.$transaction(async (tx) => {
      await tx.brand.delete({ where: { id: brand.id } })
      if (brandUserIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { in: brandUserIds } } })
      }
    })
    deleted += 1
  }

  const foundIds = new Set(brands.map((b) => b.id))
  for (const id of parsed.data.ids) {
    if (!foundIds.has(id)) skipped.push({ id, reason: 'No encontrada' })
  }

  return res.json({ deleted, deactivated, skipped })
})

/** Un usuario autenticado (futuro dueño de marca) canjea el código de invitación. */
router.post('/redeem-invite', async (req, res) => {
  const parsed = redeemInviteSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Código inválido' })
  }

  const candidates = await prisma.brand.findMany({
    where: {
      tenantId: req.user!.tenantId,
      inviteCodeHash: { not: null },
      inviteCodeExpiresAt: { gt: new Date() },
    },
  })

  const normalizedCode = parsed.data.code.trim().toUpperCase()

  for (const brand of candidates) {
    if (!brand.inviteCodeHash) continue
    const matches = await bcrypt.compare(normalizedCode, brand.inviteCodeHash)
    if (!matches) continue

    const updated = await prisma.brand.update({
      where: { id: brand.id },
      data: {
        ownerUserId: req.user!.id,
        inviteCodeHash: null,
        inviteCodeExpiresAt: null,
      },
    })
    return res.json({ ok: true, brand: { id: updated.id, name: updated.name } })
  }

  return res.status(404).json({ error: 'Código inválido o expirado' })
})

router.get('/:id', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findFirst({
    where: { id, ...tenantFilter(req.user!) },
    include: brandInclude,
  })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })
  return res.json(brand)
})

/**
 * Resumen financiero de la marca: renta, corte acumulado (desglosado por
 * método de pago) e ingresos por venta en el rango de fechas indicado.
 * Los pagos MIXTOS se prorratean entre efectivo/tarjeta/transferencia según
 * el peso de cada `SalePayment` dentro del total de la venta.
 */
router.get('/:id/summary', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findFirst({ where: { id, ...tenantFilter(req.user!) } })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = typeof req.query.from === 'string' && req.query.from ? new Date(req.query.from) : defaultFrom
  const to = typeof req.query.to === 'string' && req.query.to ? new Date(req.query.to) : now
  const toInclusive = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)

  const sales = await prisma.sale.findMany({
    where: {
      tenantId: req.user!.tenantId,
      soldAt: { gte: from, lte: toInclusive },
      lines: { some: { product: { brandId: id } } },
    },
    include: {
      payments: true,
      lines: { where: { product: { brandId: id } }, select: { total: true } },
    },
    orderBy: { soldAt: 'asc' },
  })

  const cutBreakdown = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 }
  const dailyMap = new Map<string, number>()
  let totalRevenue = 0

  for (const sale of sales) {
    const brandTotal = sale.lines.reduce((acc, line) => acc + Number(line.total), 0)
    if (brandTotal <= 0) continue

    totalRevenue += brandTotal
    const dayKey = sale.soldAt.toISOString().slice(0, 10)
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + brandTotal)

    if (sale.paymentMethod === 'MIXTO' && sale.payments.length > 0) {
      const saleTotal = sale.payments.reduce((acc, p) => acc + Number(p.amount), 0) || Number(sale.total) || 1
      for (const payment of sale.payments) {
        const ratio = Number(payment.amount) / saleTotal
        const share = brandTotal * ratio
        if (payment.method === 'TARJETA') cutBreakdown.TARJETA += share
        else if (payment.method === 'TRANSFERENCIA') cutBreakdown.TRANSFERENCIA += share
        else cutBreakdown.EFECTIVO += share
      }
    } else if (sale.paymentMethod === 'TARJETA') {
      cutBreakdown.TARJETA += brandTotal
    } else if (sale.paymentMethod === 'TRANSFERENCIA') {
      cutBreakdown.TRANSFERENCIA += brandTotal
    } else if (sale.paymentMethod === 'EFECTIVO') {
      cutBreakdown.EFECTIVO += brandTotal
    } else {
      cutBreakdown.OTRO += brandTotal
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100
  const monthsInRange = Math.max(
    1,
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1,
  )
  const monthlyRent = Number(brand.monthlyRent)

  return res.json({
    brandId: id,
    from: from.toISOString(),
    to: toInclusive.toISOString(),
    rent: round2(monthlyRent),
    // Placeholder: no existe un modelo de pagos de mensualidad todavía, se
    // estima como renta mensual × meses cubiertos por el rango filtrado.
    accruedRent: round2(monthlyRent * monthsInRange),
    cutBreakdown: {
      efectivo: round2(cutBreakdown.EFECTIVO),
      tarjeta: round2(cutBreakdown.TARJETA),
      transferencia: round2(cutBreakdown.TRANSFERENCIA),
      otro: round2(cutBreakdown.OTRO),
    },
    totalCut: round2(totalRevenue),
    dailySeries: [...dailyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total: round2(total) })),
  })
})

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = createBrandSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const { createUser, password, userName, slug: requestedSlug, isHouseBrand, ...brandData } = parsed.data
  const tenantId = req.user!.tenantId

  if (isHouseBrand) {
    const existingHouse = await prisma.brand.findFirst({
      where: { tenantId, isHouseBrand: true },
      select: { id: true },
    })
    if (existingHouse) {
      return res.status(409).json({ error: 'Ya tienes una marca propia registrada' })
    }
  }

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
    const base = requestedSlug || slugify(brandData.name)
    if (!base) {
      return res.status(400).json({ error: 'El nombre debe incluir letras o números' })
    }
    const slug = requestedSlug ? requestedSlug : await uniqueSlug(tenantId, base)

    const result = await prisma.$transaction(async (tx) => {
      const brand = await tx.brand.create({
        data: {
          name: brandData.name,
          slug,
          contactEmail: brandData.contactEmail ?? null,
          whatsapp: brandData.whatsapp?.trim() || null,
          phone: brandData.phone?.trim() || null,
          active: brandData.active ?? true,
          isHouseBrand: Boolean(isHouseBrand),
          monthlyRent: brandData.monthlyRent ?? 0,
          assignedSpace: brandData.assignedSpace || null,
          cutoffDate: brandData.cutoffDate ?? null,
          commissionPercent: brandData.commissionPercent ?? 0,
          cardFeePayer: brandData.cardFeePayer ?? 'BRAND',
          transferFeePayer: brandData.transferFeePayer ?? 'BRAND',
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
      include: brandInclude,
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

/** Genera un código de invitación temporal (48h) para que el dueño de la marca reclame su acceso. */
router.post('/:id/invite-code', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findFirst({ where: { id, ...tenantFilter(req.user!) } })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })

  const code = generateInviteCode()
  const hash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  await prisma.brand.update({
    where: { id },
    data: { inviteCodeHash: hash, inviteCodeExpiresAt: expiresAt },
  })

  return res.json({ code, expiresAt })
})

/** Desvincula al propietario actual (por si se generó por error o hay que reasignar). */
router.post('/:id/unlink-owner', authorize('BUSINESS'), async (req, res) => {
  const id = getParam(req.params.id)
  const brand = await prisma.brand.findFirst({ where: { id, ...tenantFilter(req.user!) } })
  if (!brand) return res.status(404).json({ error: 'Marca no encontrada' })

  await prisma.brand.update({ where: { id }, data: { ownerUserId: null } })
  return res.json({ ok: true })
})

router.patch('/:id', authorize('BUSINESS'), async (req, res) => {
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
      include: brandInclude,
    })
    return res.json(brand)
  } catch {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }
})

router.delete('/:id', authorize('BUSINESS'), async (req, res) => {
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
