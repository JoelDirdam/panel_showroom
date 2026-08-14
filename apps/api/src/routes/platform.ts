import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { getParam } from '../lib/params.js'
import { authenticate, authorize } from '../middleware/auth.js'

const router = Router()

router.use(authenticate, authorize('SUPER_ADMIN'))

router.get('/stats', async (_req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    tenants,
    brands,
    products,
    sales,
    employees,
    salesAgg,
    recentSales,
    salesLast30Agg,
    trialing,
    activeSubs,
    expiredSubs,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.sale.count(),
    prisma.employee.count(),
    prisma.sale.aggregate({ _sum: { total: true } }),
    prisma.sale.count({ where: { soldAt: { gte: thirtyDaysAgo } } }),
    prisma.sale.aggregate({
      where: { soldAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
    }),
    prisma.tenantSubscription.count({ where: { status: 'TRIALING' } }),
    prisma.tenantSubscription.count({ where: { status: 'ACTIVE' } }),
    prisma.tenantSubscription.count({ where: { status: 'EXPIRED' } }),
  ])

  return res.json({
    tenants,
    brands,
    products,
    sales,
    employees,
    salesTotalSum: salesAgg._sum.total ? Number(salesAgg._sum.total) : 0,
    salesLast30Days: recentSales,
    salesLast30Sum: salesLast30Agg._sum.total ? Number(salesLast30Agg._sum.total) : 0,
    trialingTenants: trialing,
    activeSubscriptions: activeSubs,
    expiredSubscriptions: expiredSubs,
  })
})

router.get('/tenants', async (_req, res) => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          brands: true,
          sales: true,
          employees: true,
        },
      },
    },
  })

  const productCounts = await prisma.product.groupBy({
    by: ['brandId'],
    _count: { _all: true },
  })
  const brandTenant = await prisma.brand.findMany({
    select: { id: true, tenantId: true },
  })
  const brandToTenant = new Map(brandTenant.map((b) => [b.id, b.tenantId]))
  const productsByTenant = new Map<string, number>()
  for (const row of productCounts) {
    const tid = brandToTenant.get(row.brandId)
    if (!tid) continue
    productsByTenant.set(tid, (productsByTenant.get(tid) || 0) + row._count._all)
  }

  return res.json(
    tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      active: t.active,
      rfc: t.rfc,
      onboardingComplete: t.onboardingComplete,
      createdAt: t.createdAt,
      subscription: t.subscription
        ? {
            planType: t.subscription.planType,
            status: t.subscription.status,
            trialEndsAt: t.subscription.trialEndsAt,
          }
        : null,
      counts: {
        users: t._count.users,
        brands: t._count.brands,
        sales: t._count.sales,
        employees: t._count.employees,
        products: productsByTenant.get(t.id) || 0,
      },
    })),
  )
})

router.get('/tenants/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      subscription: true,
      preferences: true,
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      brands: {
        select: {
          id: true,
          name: true,
          slug: true,
          active: true,
          _count: { select: { products: true } },
        },
      },
      employees: {
        select: { id: true, name: true, email: true, phone: true, active: true },
        orderBy: { name: 'asc' },
      },
      _count: { select: { sales: true } },
    },
  })
  if (!tenant) {
    return res.status(404).json({ error: 'Negocio no encontrado' })
  }

  const salesAgg = await prisma.sale.aggregate({
    where: { tenantId: id },
    _sum: { total: true },
    _count: true,
  })

  return res.json({
    ...tenant,
    salesSummary: {
      count: salesAgg._count,
      totalSum: salesAgg._sum.total ? Number(salesAgg._sum.total) : 0,
    },
  })
})

router.get('/tenants/:id/brands', async (req, res) => {
  const id = getParam(req.params.id)
  const brands = await prisma.brand.findMany({
    where: { tenantId: id },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
  return res.json(brands)
})

router.get('/tenants/:id/products', async (req, res) => {
  const id = getParam(req.params.id)
  const take = Math.min(Number(req.query.limit) || 50, 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const products = await prisma.product.findMany({
    where: { brand: { tenantId: id } },
    include: {
      brand: { select: { id: true, name: true } },
      stock: { select: { quantity: true } },
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  })
  const total = await prisma.product.count({ where: { brand: { tenantId: id } } })
  return res.json({ items: products, total, take, skip })
})

router.get('/tenants/:id/sales', async (req, res) => {
  const id = getParam(req.params.id)
  const take = Math.min(Number(req.query.limit) || 50, 200)
  const skip = Math.max(Number(req.query.offset) || 0, 0)
  const sales = await prisma.sale.findMany({
    where: { tenantId: id },
    include: {
      attendedBy: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { soldAt: 'desc' },
    take,
    skip,
  })
  const total = await prisma.sale.count({ where: { tenantId: id } })
  return res.json({ items: sales, total, take, skip })
})

const PROTECTED_SLUGS = new Set(['showroom-demo'])

router.delete('/tenants/:id', async (req, res) => {
  const id = getParam(req.params.id)
  const confirm =
    (typeof req.query.confirm === 'string' ? req.query.confirm : undefined) ??
    (typeof req.body?.confirm === 'string' ? req.body.confirm : undefined)

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { users: { select: { id: true, role: true } } },
  })
  if (!tenant) {
    return res.status(404).json({ error: 'Negocio no encontrado' })
  }

  if (PROTECTED_SLUGS.has(tenant.slug)) {
    return res.status(400).json({ error: 'Este negocio no se puede eliminar' })
  }

  if (!confirm || confirm !== tenant.slug) {
    return res.status(400).json({ error: 'Escribe el slug del negocio para confirmar la eliminación' })
  }

  const hasSuperAdmin = tenant.users.some((u) => u.role === 'SUPER_ADMIN')
  if (hasSuperAdmin) {
    return res.status(400).json({ error: 'No se puede eliminar un negocio con un usuario SUPER_ADMIN' })
  }

  await prisma.tenant.delete({ where: { id } })

  return res.json({ ok: true, deletedId: id, slug: tenant.slug })
})

/**
 * Borra usuarios huérfanos (sin tenant asignado). Nunca borra SUPER_ADMIN.
 * Pensado para limpiar cuentas de QA/pruebas que quedaron sin tenant tras
 * un fallo a medio flujo de onboarding.
 */
router.delete('/users/:id', async (req, res) => {
  const id = getParam(req.params.id)

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' })
  }
  if (user.role === 'SUPER_ADMIN') {
    return res.status(400).json({ error: 'No se puede eliminar un SUPER_ADMIN' })
  }
  if (user.tenantId) {
    return res.status(400).json({ error: 'Solo se pueden eliminar usuarios huérfanos (sin negocio asignado)' })
  }

  await prisma.user.delete({ where: { id } })

  return res.json({ ok: true, deletedId: id, email: user.email })
})

export default router
