import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, signToken } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos' })
  }

  const { email, password } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
    include: { brand: true },
  })

  if (!user) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
  }

  return res.json({
    token: signToken(authUser),
    user: {
      ...authUser,
      brand: user.brand ? { id: user.brand.id, name: user.brand.name } : null,
    },
  })
})

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { brand: true },
  })

  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }

  return res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    brandId: user.brandId,
    brand: user.brand ? { id: user.brand.id, name: user.brand.name } : null,
  })
})

export default router
