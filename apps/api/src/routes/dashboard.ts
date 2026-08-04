import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { authenticate, brandFilter, tenantFilter } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

/** Monday of the week containing `d` (local). */
function startOfWeekMon(d: Date): Date {
  const x = startOfDay(d)
  const day = x.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('es-MX', { month: 'short' })
}

const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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

/**
 * Resumen ligero para Home: métricas del día + setup.
 */
router.get('/home-summary', async (req, res) => {
  const tenantId = req.user!.tenantId
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant requerido' })
  }

  const startOfDayNow = startOfDay(new Date())

  const filter = brandFilter(req.user!)
  const isAdmin = req.user!.role === 'BUSINESS'

  const [salesToday, salesAgg, totalProducts, totalBrands, lowStockCount, houseBrand] =
    await Promise.all([
      prisma.sale.count({
        where: { tenantId, soldAt: { gte: startOfDayNow } },
      }),
      prisma.sale.aggregate({
        where: { tenantId, soldAt: { gte: startOfDayNow } },
        _sum: { total: true },
      }),
      prisma.product.count({ where: filter }),
      isAdmin
        ? prisma.brand.count({ where: { ...tenantFilter(req.user!), active: true } })
        : Promise.resolve(1),
      prisma.stock
        .findMany({
          where: { product: filter },
          select: { quantity: true, minStock: true },
        })
        .then((rows) => rows.filter((s) => s.quantity <= s.minStock).length),
      prisma.brand.findFirst({
        where: { tenantId, isHouseBrand: true, active: true },
        select: { id: true },
      }),
    ])

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { onboardingComplete: true },
  })

  return res.json({
    salesTodayCount: salesToday,
    salesTodayTotal: Number(salesAgg._sum.total ?? 0),
    totalProducts,
    totalBrands,
    lowStockCount,
    setupStatus: {
      businessConfigured: Boolean(tenant?.onboardingComplete),
      hasHouseBrand: Boolean(houseBrand),
      houseBrandId: houseBrand?.id ?? null,
    },
  })
})

/**
 * Analytics ricos para /dashboard: KPIs, series, ventas recientes, actividad.
 */
router.get('/analytics', async (req, res) => {
  const tenantId = req.user!.tenantId
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant requerido' })
  }

  const user = req.user!
  const brandId = user.role === 'BRAND' ? user.brandId : null
  const productFilter = brandFilter(user)
  const now = new Date()
  const today = startOfDay(now)
  const monthStart = startOfMonth(now)
  const prevMonthStart = addMonths(monthStart, -1)
  const weekStart = startOfWeekMon(now)
  const prevWeekStart = addDays(weekStart, -7)
  const last7Start = addDays(today, -6)
  const monthsBackStart = addMonths(monthStart, -7)

  const saleWhereBase = {
    tenantId,
    ...(brandId
      ? { lines: { some: { product: { brandId } } } }
      : {}),
  }

  const lineBrandWhere = brandId ? { product: { brandId } } : {}

  const [
    monthSales,
    prevMonthSales,
    weekSales,
    prevWeekSales,
    last7Sales,
    monthlyLines,
    weekLines,
    prevWeekLines,
    recentSalesRaw,
    allStock,
    layawaysOpen,
    layawaysThisWeek,
    layawaysPrevWeek,
    productRequests,
    appointments,
  ] = await Promise.all([
    prisma.sale.findMany({
      where: { ...saleWhereBase, soldAt: { gte: monthStart } },
      select: {
        id: true,
        total: true,
        customerId: true,
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.sale.findMany({
      where: { ...saleWhereBase, soldAt: { gte: prevMonthStart, lt: monthStart } },
      select: {
        id: true,
        total: true,
        customerId: true,
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.sale.findMany({
      where: { ...saleWhereBase, soldAt: { gte: weekStart } },
      select: {
        id: true,
        total: true,
        soldAt: true,
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.sale.findMany({
      where: { ...saleWhereBase, soldAt: { gte: prevWeekStart, lt: weekStart } },
      select: {
        id: true,
        total: true,
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.sale.findMany({
      where: { ...saleWhereBase, soldAt: { gte: last7Start } },
      select: {
        soldAt: true,
        total: true,
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.saleLine.findMany({
      where: {
        sale: { tenantId, soldAt: { gte: monthsBackStart } },
        ...(brandId ? { product: { brandId } } : {}),
      },
      select: {
        total: true,
        sale: { select: { soldAt: true } },
        product: { select: { brand: { select: { id: true, name: true } } } },
      },
    }),
    prisma.saleLine.findMany({
      where: {
        sale: { tenantId, soldAt: { gte: weekStart } },
        ...(brandId ? { product: { brandId } } : {}),
      },
      select: {
        quantity: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.saleLine.findMany({
      where: {
        sale: { tenantId, soldAt: { gte: prevWeekStart, lt: weekStart } },
        ...(brandId ? { product: { brandId } } : {}),
      },
      select: {
        quantity: true,
        product: { select: { id: true, name: true } },
      },
    }),
    prisma.sale.findMany({
      where: saleWhereBase,
      orderBy: { soldAt: 'desc' },
      take: 8,
      select: {
        id: true,
        ticketNumber: true,
        soldAt: true,
        total: true,
        paymentMethod: true,
        customer: { select: { name: true } },
        attendedBy: { select: { name: true } },
        attendedByUser: { select: { name: true } },
        createdBy: { select: { name: true } },
        lines: {
          where: lineBrandWhere,
          select: { total: true },
        },
      },
    }),
    prisma.stock.findMany({
      where: { product: productFilter },
      include: {
        product: {
          include: { brand: { select: { id: true, name: true } } },
        },
      },
      orderBy: { quantity: 'asc' },
    }),
    prisma.layaway.count({
      where: {
        tenantId,
        status: 'OPEN',
        ...(brandId ? { lines: { some: { product: { brandId } } } } : {}),
      },
    }),
    prisma.layaway.count({
      where: {
        tenantId,
        createdAt: { gte: weekStart },
        ...(brandId ? { lines: { some: { product: { brandId } } } } : {}),
      },
    }),
    prisma.layaway.count({
      where: {
        tenantId,
        createdAt: { gte: prevWeekStart, lt: weekStart },
        ...(brandId ? { lines: { some: { product: { brandId } } } } : {}),
      },
    }),
    prisma.productRequest.findMany({
      where: {
        tenantId,
        ...(brandId ? { brandId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        type: true,
        status: true,
        name: true,
        createdAt: true,
        requestedBy: { select: { name: true } },
        brand: { select: { name: true } },
        product: { select: { name: true } },
      },
    }),
    prisma.appointment.findMany({
      where: {
        tenantId,
        ...(brandId ? { brandId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        createdAt: true,
        bookedBy: { select: { name: true } },
        brand: { select: { name: true } },
        slot: { select: { type: true, startAt: true } },
      },
    }),
  ])

  function saleRevenue(sale: { total: unknown; lines: { total: unknown }[] }): number {
    if (brandId) {
      return sale.lines.reduce((acc, l) => acc + Number(l.total), 0)
    }
    return Number(sale.total)
  }

  const revenueMonth = round2(monthSales.reduce((a, s) => a + saleRevenue(s), 0))
  const revenuePrevMonth = round2(prevMonthSales.reduce((a, s) => a + saleRevenue(s), 0))
  const customersMonth = new Set(monthSales.map((s) => s.customerId).filter(Boolean)).size
  const customersPrevMonth = new Set(prevMonthSales.map((s) => s.customerId).filter(Boolean)).size
  const avgTicketMonth = monthSales.length ? round2(revenueMonth / monthSales.length) : 0
  const avgTicketPrev = prevMonthSales.length
    ? round2(revenuePrevMonth / prevMonthSales.length)
    : 0

  const lowStockItems = allStock.filter((s) => s.quantity <= s.minStock).slice(0, 10)
  const lowStockCount = allStock.filter((s) => s.quantity <= s.minStock).length
  const totalStockUnits = allStock.reduce((a, s) => a + s.quantity, 0)

  const salesWeekCount = weekSales.length
  const salesPrevWeekCount = prevWeekSales.length
  const salesWeekChangePct = pctChange(salesWeekCount, salesPrevWeekCount)

  const salesLast7Days: number[] = []
  const revenueLast7Days: number[] = []
  for (let i = 0; i < 7; i++) {
    const day = addDays(last7Start, i)
    const next = addDays(day, 1)
    const daySales = last7Sales.filter((s) => s.soldAt >= day && s.soldAt < next)
    salesLast7Days.push(daySales.length)
    revenueLast7Days.push(round2(daySales.reduce((a, s) => a + saleRevenue(s), 0)))
  }

  // Stacked monthly by brand (last 8 months)
  const monthKeys: Date[] = []
  for (let i = 0; i < 8; i++) {
    monthKeys.push(addMonths(monthsBackStart, i))
  }
  const months = monthKeys.map(monthLabel)

  const brandMonthMap = new Map<string, { name: string; totals: number[] }>()
  for (const line of monthlyLines) {
    const b = line.product.brand
    const soldAt = line.sale.soldAt
    const mi = monthKeys.findIndex(
      (m) => soldAt.getFullYear() === m.getFullYear() && soldAt.getMonth() === m.getMonth(),
    )
    if (mi < 0) continue
    let entry = brandMonthMap.get(b.id)
    if (!entry) {
      entry = { name: b.name, totals: Array(8).fill(0) }
      brandMonthMap.set(b.id, entry)
    }
    entry.totals[mi] += Number(line.total)
  }

  const brandRanked = [...brandMonthMap.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      totals: v.totals.map(round2),
      sum: v.totals.reduce((a, n) => a + n, 0),
    }))
    .sort((a, b) => b.sum - a.sum)

  const topBrands = brandRanked.slice(0, 4)
  const rest = brandRanked.slice(4)
  const series: { name: string; data: number[] }[] = topBrands.map((b) => ({
    name: b.name,
    data: b.totals,
  }))
  if (rest.length > 0) {
    const otherData = Array(8).fill(0) as number[]
    for (const b of rest) {
      for (let i = 0; i < 8; i++) otherData[i] += b.totals[i]
    }
    series.push({ name: 'Otros', data: otherData.map(round2) })
  }
  if (series.length === 0) {
    series.push({ name: 'Sin ventas', data: Array(8).fill(0) })
  }

  // Weekly Mon–Sun revenue
  const revenueByDay: number[] = Array(7).fill(0)
  for (const sale of weekSales) {
    const d = sale.soldAt
    const mon = startOfWeekMon(d)
    const dayIdx = Math.floor((startOfDay(d).getTime() - mon.getTime()) / 86400000)
    if (dayIdx >= 0 && dayIdx < 7) {
      revenueByDay[dayIdx] += saleRevenue(sale)
    }
  }
  const revenueByDayRounded = revenueByDay.map(round2)
  const daysElapsed = Math.min(7, Math.floor((today.getTime() - weekStart.getTime()) / 86400000) + 1)
  const weekRevenue = revenueByDayRounded.reduce((a, n) => a + n, 0)
  const avgDailySales = daysElapsed > 0 ? round2(weekRevenue / daysElapsed) : 0
  const prevWeekRevenue = round2(prevWeekSales.reduce((a, s) => a + saleRevenue(s), 0))
  const prevAvgDaily = round2(prevWeekRevenue / 7)
  const avgDailyChangePct = pctChange(avgDailySales, prevAvgDaily)

  // Top products this week vs last
  const qtyThis = new Map<string, { name: string; qty: number }>()
  for (const line of weekLines) {
    const cur = qtyThis.get(line.product.id) ?? { name: line.product.name, qty: 0 }
    cur.qty += line.quantity
    qtyThis.set(line.product.id, cur)
  }
  const qtyPrev = new Map<string, number>()
  for (const line of prevWeekLines) {
    qtyPrev.set(line.product.id, (qtyPrev.get(line.product.id) ?? 0) + line.quantity)
  }
  const topProducts = [...qtyThis.entries()]
    .map(([id, v]) => {
      const prev = qtyPrev.get(id) ?? 0
      let changeDir: 'up' | 'down' | 'flat' = 'flat'
      if (v.qty > prev) changeDir = 'up'
      else if (v.qty < prev) changeDir = 'down'
      return { name: v.name, qty: v.qty, changeDir }
    })
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5)

  const recentSales = recentSalesRaw.map((s) => ({
    id: s.id,
    ticketNumber: s.ticketNumber,
    soldAt: s.soldAt.toISOString(),
    total: round2(saleRevenue(s)),
    paymentMethod: s.paymentMethod,
    customerName: s.customer?.name ?? null,
    attendantName:
      s.attendedBy?.name ?? s.attendedByUser?.name ?? s.createdBy?.name ?? null,
  }))

  type Activity = {
    id: string
    type: 'sale' | 'product_request' | 'appointment'
    actorName: string
    action: string
    reference: string
    at: string
  }

  const activities: Activity[] = []

  for (const s of recentSalesRaw.slice(0, 5)) {
    activities.push({
      id: `sale-${s.id}`,
      type: 'sale',
      actorName:
        s.attendedBy?.name ?? s.attendedByUser?.name ?? s.createdBy?.name ?? 'Sistema',
      action: 'registró venta',
      reference: `#${s.ticketNumber}`,
      at: s.soldAt.toISOString(),
    })
  }
  for (const pr of productRequests) {
    const label = pr.product?.name ?? pr.name ?? pr.type
    activities.push({
      id: `pr-${pr.id}`,
      type: 'product_request',
      actorName: pr.requestedBy.name,
      action:
        pr.status === 'PENDING'
          ? 'solicitó producto'
          : pr.status === 'ACCEPTED'
            ? 'tuvo solicitud aceptada'
            : 'tuvo solicitud rechazada',
      reference: label,
      at: pr.createdAt.toISOString(),
    })
  }
  for (const ap of appointments) {
    activities.push({
      id: `ap-${ap.id}`,
      type: 'appointment',
      actorName: ap.bookedBy.name,
      action: 'agendó cita',
      reference: `${ap.brand.name} · ${ap.slot.type}`,
      at: ap.createdAt.toISOString(),
    })
  }
  activities.sort((a, b) => (a.at < b.at ? 1 : -1))

  return res.json({
    kpis: {
      revenueMonth,
      revenueChangePct: pctChange(revenueMonth, revenuePrevMonth),
      customersMonth,
      customersChangePct: pctChange(customersMonth, customersPrevMonth),
      avgTicketMonth,
      avgTicketChangePct: pctChange(avgTicketMonth, avgTicketPrev),
      lowStockCount,
      totalStockUnits,
    },
    sparkline: {
      layawaysOpen,
      layawayWeekDelta: layawaysThisWeek - layawaysPrevWeek,
      salesWeekCount,
      salesWeekChangePct,
      salesLast7Days,
      revenueLast7Days,
    },
    salesByBrandMonthly: {
      months,
      series,
    },
    weekly: {
      days: DAY_LABELS,
      revenueByDay: revenueByDayRounded,
      avgDailySales,
      avgDailyChangePct,
      topProducts,
    },
    recentSales,
    activities: activities.slice(0, 8),
    lowStockItems,
  })
})

export default router
