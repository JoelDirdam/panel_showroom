import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(40).optional().nullable(),
})

router.use(authenticate)

router.get('/', authorize('ADMIN'), async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { name: 'asc' },
    take: 40,
  })
  return res.json(customers)
})

router.post('/', authorize('ADMIN'), async (req, res) => {
  const parsed = createCustomerSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  const phone = parsed.data.phone?.trim() || null
  const customer = await prisma.customer.create({
    data: {
      tenantId: req.user!.tenantId,
      name: parsed.data.name.trim(),
      phone,
    },
  })
  return res.status(201).json(customer)
})

export default router
