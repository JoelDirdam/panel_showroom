import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
})

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  active: z.boolean().optional(),
})

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  const activeOnly = req.query.active === 'true' || req.query.active === '1'
  const employees = await prisma.employee.findMany({
    where: {
      tenantId: req.user!.tenantId!,
      ...(activeOnly ? { active: true } : {}),
    },
    orderBy: { name: 'asc' },
  })
  return res.json(employees)
})

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const { name, email, phone } = parsed.data
  const employee = await prisma.employee.create({
    data: {
      tenantId: req.user!.tenantId!,
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
    },
  })
  return res.status(201).json(employee)
})

router.patch('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }
  const existing = await prisma.employee.findFirst({
    where: { id, tenantId: req.user!.tenantId! },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }
  const data = parsed.data
  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.email !== undefined ? { email: data.email?.trim() || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone?.trim() || null } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  })
  return res.json(employee)
})

router.delete('/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const existing = await prisma.employee.findFirst({
    where: { id, tenantId: req.user!.tenantId! },
  })
  if (!existing) {
    return res.status(404).json({ error: 'Empleado no encontrado' })
  }
  const employee = await prisma.employee.update({
    where: { id },
    data: { active: false },
  })
  return res.json(employee)
})

export default router
