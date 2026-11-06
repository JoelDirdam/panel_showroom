import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import {
  daysBetweenCalendar,
  endOfDay,
  nextCutoffDate,
  openCutoffPeriod,
  startOfDay,
  type BrandCutoffConfig,
  type CutoffPrefs,
} from '../utils/cutoffDays.js'

export type CutBreakdown = {
  efectivo: number
  tarjeta: number
  transferencia: number
  otro: number
}

export type BrandCutResult = {
  totalRevenue: number
  cutBreakdown: CutBreakdown
  lineCount: number
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

type LineFilter = {
  inSettlement?: boolean
  paid?: boolean
}

export async function computeBrandCut(
  tenantId: string,
  brandId: string,
  from: Date,
  to: Date,
  lineFilter?: LineFilter,
): Promise<BrandCutResult> {
  const toInclusive = endOfDay(to)

  const lineWhere: Prisma.SaleLineWhereInput = {
    product: { brandId },
    ...(lineFilter?.inSettlement !== undefined ? { inSettlement: lineFilter.inSettlement } : {}),
    ...(lineFilter?.paid !== undefined ? { paid: lineFilter.paid } : {}),
  }

  const sales = await prisma.sale.findMany({
    where: {
      tenantId,
      soldAt: { gte: from, lte: toInclusive },
      lines: { some: lineWhere },
    },
    include: {
      payments: true,
      lines: {
        where: lineWhere,
        select: { total: true },
      },
    },
    orderBy: { soldAt: 'asc' },
  })

  const cutBreakdown = { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0, OTRO: 0 }
  let totalRevenue = 0
  let lineCount = 0

  for (const sale of sales) {
    const brandTotal = sale.lines.reduce((acc, line) => acc + Number(line.total), 0)
    if (brandTotal <= 0) continue

    totalRevenue += brandTotal
    lineCount += sale.lines.length

    if (sale.paymentMethod === 'MIXTO' && sale.payments.length > 0) {
      const saleTotal =
        sale.payments.reduce((acc, p) => acc + Number(p.amount), 0) || Number(sale.total) || 1
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

  return {
    totalRevenue: round2(totalRevenue),
    cutBreakdown: {
      efectivo: round2(cutBreakdown.EFECTIVO),
      tarjeta: round2(cutBreakdown.TARJETA),
      transferencia: round2(cutBreakdown.TRANSFERENCIA),
      otro: round2(cutBreakdown.OTRO),
    },
    lineCount,
  }
}

export async function getTenantCutoffPrefs(tenantId: string): Promise<CutoffPrefs> {
  const prefs = await prisma.businessPreferences.findUnique({ where: { tenantId } })
  return {
    cutoffType: prefs?.cutoffType ?? 'MONTHLY_FIXED',
    cutoffWeekday: prefs?.cutoffWeekday ?? null,
    cutoffDaySlots: prefs?.cutoffDaySlots ?? [],
  }
}

export async function closeBrandCutoff(
  tenantId: string,
  brandId: string,
  userId: string,
  note?: string | null,
) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, tenantId } })
  if (!brand) throw new Error('BRAND_NOT_FOUND')

  const prefs = await getTenantCutoffPrefs(tenantId)
  const brandConfig: BrandCutoffConfig = {
    id: brand.id,
    name: brand.name,
    cutoffDaySlots: brand.cutoffDaySlots,
  }
  const { periodFrom, periodTo, cutoffDate } = openCutoffPeriod(prefs, brandConfig)

  const openCut = await computeBrandCut(tenantId, brandId, periodFrom, periodTo, {
    inSettlement: false,
  })
  if (openCut.lineCount === 0) {
    throw new Error('NO_LINES_TO_CLOSE')
  }

  return prisma.$transaction(async (tx) => {
    const settlement = await tx.brandCutoffSettlement.create({
      data: {
        tenantId,
        brandId,
        periodFrom,
        periodTo: endOfDay(cutoffDate),
        totalAmount: openCut.totalRevenue,
        status: 'CLOSED',
        closedAt: new Date(),
        paidById: userId,
        note: note?.trim() || null,
      },
    })

    await tx.saleLine.updateMany({
      where: {
        inSettlement: false,
        product: { brandId },
        sale: {
          tenantId,
          soldAt: { gte: periodFrom, lte: endOfDay(cutoffDate) },
        },
      },
      data: { inSettlement: true },
    })

    return settlement
  })
}

export async function markCutoffSettlementPaid(
  tenantId: string,
  settlementId: string,
  userId: string,
  note?: string | null,
) {
  const settlement = await prisma.brandCutoffSettlement.findFirst({
    where: { id: settlementId, tenantId, status: 'CLOSED' },
  })
  if (!settlement) throw new Error('SETTLEMENT_NOT_FOUND')

  return prisma.$transaction(async (tx) => {
    const updated = await tx.brandCutoffSettlement.update({
      where: { id: settlement.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidById: userId,
        note: note?.trim() || settlement.note,
      },
    })

    await tx.saleLine.updateMany({
      where: {
        inSettlement: true,
        paid: false,
        product: { brandId: settlement.brandId },
        sale: {
          tenantId,
          soldAt: { gte: settlement.periodFrom, lte: settlement.periodTo },
        },
      },
      data: { paid: true },
    })

    return updated
  })
}

export type CutoffAlert = {
  brandId: string
  brandName: string
  cutoffDate: string
  daysUntil: number
  periodFrom: string
  periodTo: string
  totalCut: number
  unpaidCut: number
  cutBreakdown: CutBreakdown
  settlementId?: string
}

export async function buildCutoffAlerts(tenantId: string, now = new Date()): Promise<CutoffAlert[]> {
  const prefs = await getTenantCutoffPrefs(tenantId)
  const brands = await prisma.brand.findMany({
    where: { tenantId, active: true },
    select: { id: true, name: true, cutoffDaySlots: true },
  })

  const alerts: CutoffAlert[] = []
  const today = startOfDay(now)

  for (const brand of brands) {
    const brandConfig: BrandCutoffConfig = {
      id: brand.id,
      name: brand.name,
      cutoffDaySlots: brand.cutoffDaySlots,
    }
    const cutoffDate = nextCutoffDate(prefs, brandConfig, today)
    if (!cutoffDate) continue

    const daysUntil = daysBetweenCalendar(today, cutoffDate)
    if (daysUntil < 0 || daysUntil > 2) {
      // Still check unpaid closed cuts
      const unpaid = await computeBrandCut(tenantId, brand.id, new Date(0), now, {
        inSettlement: true,
        paid: false,
      })
      if (unpaid.totalRevenue > 0) {
        const { periodFrom, periodTo } = openCutoffPeriod(prefs, brandConfig, today)
        const pendingSettlement = await prisma.brandCutoffSettlement.findFirst({
          where: { tenantId, brandId: brand.id, status: 'CLOSED' },
          orderBy: { periodTo: 'desc' },
        })
        alerts.push({
          brandId: brand.id,
          brandName: brand.name,
          cutoffDate: cutoffDate.toISOString(),
          daysUntil: -1,
          periodFrom: periodFrom.toISOString(),
          periodTo: periodTo.toISOString(),
          totalCut: 0,
          unpaidCut: unpaid.totalRevenue,
          cutBreakdown: unpaid.cutBreakdown,
          settlementId: pendingSettlement?.id,
        })
      }
      continue
    }

    const { periodFrom, periodTo } = openCutoffPeriod(prefs, brandConfig, today)
    const openCut = await computeBrandCut(tenantId, brand.id, periodFrom, periodTo, {
      inSettlement: false,
    })
    const unpaidCut = await computeBrandCut(tenantId, brand.id, new Date(0), now, {
      inSettlement: true,
      paid: false,
    })

    if (openCut.totalRevenue <= 0 && unpaidCut.totalRevenue <= 0) continue

    const pendingSettlement = await prisma.brandCutoffSettlement.findFirst({
      where: { tenantId, brandId: brand.id, status: 'CLOSED' },
      orderBy: { periodTo: 'desc' },
    })

    alerts.push({
      brandId: brand.id,
      brandName: brand.name,
      cutoffDate: cutoffDate.toISOString(),
      daysUntil,
      periodFrom: periodFrom.toISOString(),
      periodTo: periodTo.toISOString(),
      totalCut: openCut.totalRevenue,
      unpaidCut: unpaidCut.totalRevenue,
      cutBreakdown: openCut.totalRevenue > 0 ? openCut.cutBreakdown : unpaidCut.cutBreakdown,
      settlementId: pendingSettlement?.id,
    })
  }

  return alerts
}

export async function ensureRentPaymentsForMonth(tenantId: string, now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const dueDate = startOfDay(new Date(year, now.getMonth(), 1))

  const brands = await prisma.brand.findMany({
    where: { tenantId, active: true, monthlyRent: { gt: 0 } },
    select: { id: true, monthlyRent: true },
  })

  for (const brand of brands) {
    await prisma.brandRentPayment.upsert({
      where: { brandId_year_month: { brandId: brand.id, year, month } },
      create: {
        tenantId,
        brandId: brand.id,
        year,
        month,
        amount: brand.monthlyRent,
        dueDate,
        status: 'PENDING',
      },
      update: {},
    })
  }
}

export function buildCutoffAlertPayload(alerts: CutoffAlert[]) {
  return alerts.map((a) => ({
    brand: a.brandName,
    cutoffDate: a.cutoffDate,
    daysUntil: a.daysUntil,
    totalCut: a.totalCut,
    unpaidCut: a.unpaidCut,
  }))
}
