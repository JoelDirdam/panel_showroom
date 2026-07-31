import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

/** Lista usuarios del tenant (selector «Atiende» en Caja). */
router.get('/', authorize('ADMIN'), async (req, res) => {
  const users = await prisma.user.findMany({
    where: { tenantId: req.user!.tenantId },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: 'asc' },
  })
  return res.json(users)
})

export default router
