import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, brandFilter, tenantFilter } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', async (req, res) => {
  const filter = brandFilter(req.user!)
  const isAdmin = req.user!.role === 'BUSINESS'

  const allStock = await prisma.stock.findMany({
    where: { product: filter },
    include: {
      product: {
        include: { brand: { select: { id: true, name: true } } },
      },
    },
    orderBy: { quantity: 'asc' },
  })

  const lowStockItems = allStock.filter((s) => s.quantity <= s.minStock).slice(0, 10)
  const lowStockCount = allStock.filter((s) => s.quantity <= s.minStock).length

  const [totalProducts, totalBrands, totalStockUnits] = await Promise.all([
    prisma.product.count({ where: filter }),
    isAdmin
      ? prisma.brand.count({ where: { ...tenantFilter(req.user!), active: true } })
      : Promise.resolve(1),
    prisma.stock.aggregate({
      where: { product: filter },
      _sum: { quantity: true },
    }),
  ])

  return res.json({
    totalProducts,
    totalBrands: isAdmin ? totalBrands : undefined,
    totalStockUnits: totalStockUnits._sum.quantity ?? 0,
    lowStockCount,
    lowStockItems,
  })
})

export default router
