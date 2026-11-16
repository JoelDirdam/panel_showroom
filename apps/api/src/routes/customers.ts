import { Router } from 'express'
import { z } from 'zod'
import { sendError } from '../lib/httpError.js'
import { getParam } from '../lib/params.js'
import { prisma } from '../lib/prisma.js'
import { parsePage } from '../lib/saleMath.js'
import { authenticate, authorize, tenantFilter } from '../middleware/auth.js'
import { requireModule } from '../middleware/plan.js'

const router = Router()

const customerSchema = z.object({
  // Se recorta antes de validar: un nombre de puros espacios no es un nombre.
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional().nullable(),
})

const updateCustomerSchema = customerSchema.partial()

/** Deja solo dígitos (y un "+" inicial) para comparar teléfonos escritos de formas distintas. */
function normalizePhone(raw: string | null | undefined): string | null {
  const value = raw?.trim()
  if (!value) return null
  const digits = value.replace(/\D/g, '')
  if (!digits) return null
  return value.startsWith('+') ? `+${digits}` : digits
}

type CustomerStats = { purchases: number; totalSpent: number; lastPurchaseAt: Date | null }

/** Compras, total gastado y última compra por cliente (solo ventas vigentes). */
async function statsFor(tenantId: string, customerIds: string[]): Promise<Map<string, CustomerStats>> {
  const map = new Map<string, CustomerStats>()
  if (customerIds.length === 0) return map
  const rows = await prisma.sale.groupBy({
    by: ['customerId'],
    where: { tenantId, customerId: { in: customerIds } },
    _count: { _all: true },
    _sum: { total: true },
    _max: { soldAt: true },
  })
  for (const row of rows) {
    if (!row.customerId) continue
    map.set(row.customerId, {
      purchases: row._count._all,
      totalSpent: Number(row._sum.total ?? 0),
      lastPurchaseAt: row._max.soldAt,
    })
  }
  return map
}

const EMPTY_STATS: CustomerStats = { purchases: 0, totalSpent: 0, lastPurchaseAt: null }

router.use(authenticate, requireModule('customers', 'caja'))

/**
 * Sin `page`: arreglo simple de hasta 40 coincidencias (buscador de Caja).
 * Con `page`: `{ items, total, page, pageSize }` con totales por cliente (vista de Clientes).
 */
router.get('/', authorize('BUSINESS'), async (req, res) => {
  try {
    const { tenantId } = tenantFilter(req.user!)
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 200) : ''
    // "55 1234-5678" debe encontrar al cliente guardado como "5512345678".
    const qDigits = q.replace(/\D/g, '')
    const where = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { phone: { contains: q, mode: 'insensitive' as const } },
              ...(qDigits.length >= 3 && qDigits !== q ? [{ phone: { contains: qDigits } }] : []),
            ],
          }
        : {}),
    }

    if (req.query.page === undefined) {
      const customers = await prisma.customer.findMany({ where, orderBy: { name: 'asc' }, take: 40 })
      return res.json(customers)
    }

    const { page, pageSize, skip } = parsePage(req.query)
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { name: 'asc' }, skip, take: pageSize }),
      prisma.customer.count({ where }),
    ])
    const stats = await statsFor(tenantId, items.map((c) => c.id))
    return res.json({
      items: items.map((c) => ({ ...c, ...(stats.get(c.id) ?? EMPTY_STATS) })),
      total,
      page,
      pageSize,
    })
  } catch (e) {
    return sendError(res, e)
  }
})

/** Ficha del cliente: datos, totales, compras recientes y apartados. */
router.get('/:id', authorize('BUSINESS'), async (req, res) => {
  try {
    const { tenantId } = tenantFilter(req.user!)
    const id = getParam(req.params.id)
    const customer = await prisma.customer.findFirst({ where: { id, tenantId } })
    if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' })

    const [stats, sales, layaways, cancelledCount] = await Promise.all([
      statsFor(tenantId, [id]),
      prisma.sale.findMany({
        where: { tenantId, customerId: id },
        orderBy: { soldAt: 'desc' },
        take: 50,
        select: {
          id: true,
          ticketNumber: true,
          soldAt: true,
          paymentMethod: true,
          total: true,
          lines: {
            select: {
              id: true,
              quantity: true,
              total: true,
              product: { select: { name: true, sku: true } },
            },
          },
        },
      }),
      prisma.layaway.findMany({
        where: { tenantId, customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, code: true, status: true, total: true, balance: true, createdAt: true },
      }),
      prisma.cancelledSale.count({ where: { tenantId, customerId: id } }),
    ])

    return res.json({
      ...customer,
      ...(stats.get(id) ?? EMPTY_STATS),
      cancelledCount,
      sales,
      layaways,
    })
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/', authorize('BUSINESS'), async (req, res) => {
  const parsed = customerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Escribe el nombre del cliente', details: parsed.error.flatten() })
  }

  try {
    const { tenantId } = tenantFilter(req.user!)
    const phone = normalizePhone(parsed.data.phone)

    // Mismo teléfono en el mismo negocio = mismo cliente: se devuelve el
    // existente en vez de duplicarlo (el historial de compras queda unido).
    if (phone) {
      const existing = await prisma.customer.findFirst({ where: { tenantId, phone } })
      if (existing) return res.status(200).json(existing)
    }

    const customer = await prisma.customer.create({
      data: { tenantId, name: parsed.data.name, phone },
    })
    return res.status(201).json(customer)
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/:id', authorize('BUSINESS'), async (req, res) => {
  const parsed = updateCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Escribe el nombre del cliente', details: parsed.error.flatten() })
  }

  try {
    const { tenantId } = tenantFilter(req.user!)
    const id = getParam(req.params.id)
    const existing = await prisma.customer.findFirst({ where: { id, tenantId } })
    if (!existing) return res.status(404).json({ error: 'Cliente no encontrado' })

    const data: { name?: string; phone?: string | null } = {}
    if (parsed.data.name !== undefined) data.name = parsed.data.name
    if (parsed.data.phone !== undefined) {
      const phone = normalizePhone(parsed.data.phone)
      if (phone) {
        const clash = await prisma.customer.findFirst({
          where: { tenantId, phone, id: { not: id } },
        })
        if (clash) {
          return res.status(409).json({ error: `Ese teléfono ya es de otro cliente: ${clash.name}` })
        }
      }
      data.phone = phone
    }

    const customer = await prisma.customer.update({ where: { id }, data })
    return res.json(customer)
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
