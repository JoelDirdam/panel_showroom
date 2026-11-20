import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma.js'
import { storage } from './storage.js'
import { getStripe, isStripeConfigured } from './stripe.js'
import { HttpError } from './httpError.js'

/**
 * Derechos del titular sobre sus datos: descargar una copia (portabilidad /
 * acceso) y eliminarlos (cancelación). Lo usan /api/account, el panel de
 * plataforma y la tarea de conservación de datos.
 */

export type DeletionReason = 'user_request' | 'super_admin' | 'retention_inactive' | 'retention_unverified'

const PROTECTED_SLUGS = new Set(['showroom-demo'])

export function isProtectedTenantSlug(slug: string): boolean {
  return PROTECTED_SLUGS.has(slug)
}

// --- Exportar ----------------------------------------------------------------

async function exportAccountSection(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      phoneVerifiedAt: true,
      emailVerifiedAt: true,
      timezone: true,
      onboardingStep: true,
      marketingOptIn: true,
      marketingOptInAt: true,
      marketingOptOutAt: true,
      totpEnabledAt: true,
      createdAt: true,
      updatedAt: true,
      termsAcceptances: {
        select: { version: true, signedName: true, acceptedAt: true, ip: true, source: true },
        orderBy: { acceptedAt: 'asc' },
      },
      consentEvents: {
        select: { kind: true, granted: true, source: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!user) return null
  const { totpEnabledAt, ...rest } = user
  return { ...rest, twoFactorEnabled: Boolean(totpEnabledAt) }
}

async function exportTenantSection(tenantId: string) {
  const byTenant = { tenantId }
  const [
    tenant,
    subscription,
    preferences,
    users,
    employees,
    sucursales,
    businessHours,
    services,
    categories,
    brands,
    products,
    stockEntries,
    customers,
    giftCards,
    sales,
    cancelledSales,
    layaways,
    productRequests,
    cashSessions,
    rentPayments,
    cutoffSettlements,
    appointments,
    agendaSettings,
    weeklyRules,
    stockAppointments,
    whatsappConfig,
    conversations,
  ] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.tenantSubscription.findUnique({
      where: { tenantId },
      select: {
        planType: true,
        status: true,
        trialEndsAt: true,
        promoCodeUsed: true,
        currentPeriodEndsAt: true,
        cancelAtPeriodEnd: true,
        paymentProvider: true,
        lastPaymentAt: true,
        createdAt: true,
      },
    }),
    prisma.businessPreferences.findUnique({ where: { tenantId } }),
    prisma.user.findMany({
      where: byTenant,
      select: { id: true, name: true, email: true, role: true, brandId: true, createdAt: true },
    }),
    prisma.employee.findMany({ where: byTenant }),
    prisma.sucursal.findMany({ where: byTenant }),
    prisma.businessHour.findMany({ where: byTenant }),
    prisma.service.findMany({ where: byTenant }),
    prisma.category.findMany({ where: byTenant }),
    prisma.brand.findMany({ where: byTenant, omit: { inviteCodeHash: true, inviteCodeExpiresAt: true } }),
    prisma.product.findMany({ where: { brand: byTenant }, include: { stock: true } }),
    prisma.stockEntry.findMany({ where: { product: { brand: byTenant } } }),
    prisma.customer.findMany({ where: byTenant }),
    prisma.giftCard.findMany({ where: byTenant }),
    prisma.sale.findMany({ where: byTenant, include: { lines: true, payments: true } }),
    prisma.cancelledSale.findMany({ where: byTenant }),
    prisma.layaway.findMany({ where: byTenant, include: { lines: true, payments: true } }),
    prisma.productRequest.findMany({ where: byTenant }),
    prisma.cashSession.findMany({ where: byTenant, include: { movements: true } }),
    prisma.brandRentPayment.findMany({ where: byTenant }),
    prisma.brandCutoffSettlement.findMany({ where: byTenant }),
    prisma.appointment.findMany({ where: byTenant }),
    prisma.agendaSettings.findUnique({ where: { tenantId } }),
    prisma.weeklyScheduleRule.findMany({ where: byTenant }),
    prisma.stockAppointment.findMany({ where: byTenant, include: { slot: true } }),
    prisma.whatsappConfig.findUnique({
      where: { tenantId },
      // El token de acceso y el de verificación son secretos: no se exportan.
      omit: { accessToken: true, webhookVerifyToken: true },
    }),
    prisma.conversation.findMany({ where: byTenant, include: { messages: true } }),
  ])

  return {
    negocio: tenant,
    suscripcion: subscription,
    preferencias: preferences,
    usuarios: users,
    empleados: employees,
    sucursales,
    horarios: businessHours,
    servicios: services,
    categorias: categories,
    marcas: brands,
    productos: products,
    entradasDeStock: stockEntries,
    clientes: customers,
    tarjetasDeRegalo: giftCards,
    ventas: sales,
    ventasCanceladas: cancelledSales,
    apartados: layaways,
    solicitudesDeProducto: productRequests,
    turnosDeCaja: cashSessions,
    rentasDeMarcas: rentPayments,
    cortesDeMarcas: cutoffSettlements,
    citas: appointments,
    agenda: { configuracion: agendaSettings, reglasSemanales: weeklyRules, citasDeEntrega: stockAppointments },
    whatsapp: whatsappConfig,
    conversaciones: conversations,
  }
}

async function exportBrandSection(brandId: string, userId: string) {
  const [brand, products, productRequests, stockAppointments] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: brandId },
      omit: { inviteCodeHash: true, inviteCodeExpiresAt: true },
    }),
    prisma.product.findMany({ where: { brandId }, include: { stock: true } }),
    prisma.productRequest.findMany({ where: { brandId, requestedById: userId } }),
    prisma.stockAppointment.findMany({ where: { brandId, bookedById: userId }, include: { slot: true } }),
  ])
  return { marca: brand, productos: products, solicitudesDeProducto: productRequests, citasDeEntrega: stockAppointments }
}

/** Copia completa, en JSON, de los datos de la cuenta que hace la solicitud. */
export async function exportAccountData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true, brandId: true, deletedAt: true },
  })
  if (!user || user.deletedAt) throw new HttpError(404, 'Usuario no encontrado')

  const cuenta = await exportAccountSection(userId)
  const base = {
    generadoEl: new Date().toISOString(),
    formato: 'COSDI exportación de datos v1',
    nota:
      'Copia de los datos asociados a tu cuenta. No incluye contraseñas, secretos de verificación en dos pasos ni tokens de acceso.',
    cuenta,
  }

  if (user.role === 'BUSINESS' && user.tenantId) {
    return { ...base, alcance: 'negocio', datos: await exportTenantSection(user.tenantId) }
  }
  if (user.role === 'BRAND' && user.brandId) {
    return { ...base, alcance: 'marca', datos: await exportBrandSection(user.brandId, userId) }
  }
  return { ...base, alcance: 'cuenta', datos: null }
}

// --- Eliminar ----------------------------------------------------------------

async function collectTenantFileUrls(tenantId: string): Promise<string[]> {
  const [tenant, products, requests] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { logoUrl: true } }),
    prisma.product.findMany({
      where: { brand: { tenantId }, imageUrl: { not: null } },
      select: { imageUrl: true },
    }),
    prisma.productRequest.findMany({
      where: { tenantId, imageUrl: { not: null } },
      select: { imageUrl: true },
    }),
  ])
  const urls = new Set<string>()
  if (tenant?.logoUrl) urls.add(tenant.logoUrl)
  for (const p of products) if (p.imageUrl) urls.add(p.imageUrl)
  for (const r of requests) if (r.imageUrl) urls.add(r.imageUrl)
  return [...urls]
}

/**
 * Cancela de inmediato la suscripción en Stripe. Si no se puede confirmar la
 * cancelación, lanza: jamás se borra una cuenta dejando un cobro recurrente vivo.
 */
async function cancelStripeSubscriptionNow(externalSubscriptionId: string | null): Promise<void> {
  if (!externalSubscriptionId) return
  if (!isStripeConfigured()) {
    throw new HttpError(
      503,
      'No pudimos cancelar tu suscripción porque el cobro no está disponible. Intenta más tarde o escríbenos.',
    )
  }
  try {
    const sub = await getStripe().subscriptions.retrieve(externalSubscriptionId)
    if (sub.status !== 'canceled' && sub.status !== 'incomplete_expired') {
      await getStripe().subscriptions.cancel(externalSubscriptionId)
    }
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'resource_missing') return // ya no existe en Stripe
    console.error('[account] no se pudo cancelar la suscripción en Stripe', e)
    throw new HttpError(
      502,
      'No pudimos cancelar tu suscripción con el procesador de pagos. No se eliminó nada; intenta de nuevo en unos minutos.',
    )
  }
}

export interface DeleteTenantResult {
  tenantId: string
  slug: string
  name: string
  ownerEmails: string[]
  ownerName: string | null
}

/**
 * Elimina un negocio completo y todos sus datos (usuarios, marcas, productos,
 * ventas, clientes, citas, conversaciones y archivos subidos).
 *
 * Se conserva únicamente la evidencia legal desvinculada de la cuenta
 * (aceptación de términos, consentimientos, bitácora de eliminación) por el
 * plazo de lib/retention.ts.
 */
export async function deleteTenantCompletely(
  tenantId: string,
  reason: DeletionReason,
  ip: string | null = null,
): Promise<DeleteTenantResult> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      subscription: { select: { externalSubscriptionId: true } },
      users: { select: { id: true, email: true, name: true, role: true, createdAt: true } },
    },
  })
  if (!tenant) throw new HttpError(404, 'Negocio no encontrado')
  if (isProtectedTenantSlug(tenant.slug)) throw new HttpError(400, 'Este negocio no se puede eliminar')
  if (tenant.users.some((u) => u.role === 'SUPER_ADMIN')) {
    throw new HttpError(400, 'No se puede eliminar un negocio con un usuario SUPER_ADMIN')
  }

  await cancelStripeSubscriptionNow(tenant.subscription?.externalSubscriptionId ?? null)

  const fileUrls = await collectTenantFileUrls(tenantId)
  const userIds = tenant.users.map((u) => u.id)
  const owners = tenant.users
    .filter((u) => u.role === 'BUSINESS')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const now = new Date()

  await prisma.$transaction(
    async (tx) => {
      // La evidencia legal se conserva, pero ya sin vínculo con la cuenta.
      await tx.termsAcceptance.updateMany({
        where: { userId: { in: userIds } },
        data: { userDeletedAt: now },
      })
      await tx.consentEvent.updateMany({
        where: { userId: { in: userIds } },
        data: { userDeletedAt: now },
      })
      await tx.accountDeletionLog.create({
        data: {
          email: owners[0]?.email ?? tenant.users[0]?.email ?? null,
          tenantName: tenant.name,
          scope: 'TENANT',
          reason,
          ip,
        },
      })
      // Orden explícito: estas tablas tienen llaves RESTRICT hacia productos/usuarios
      // y bloquearían el borrado en cascada del negocio.
      await tx.sale.deleteMany({ where: { tenantId } })
      await tx.layaway.deleteMany({ where: { tenantId } })
      await tx.productRequest.deleteMany({ where: { tenantId } })
      await tx.stockAppointment.deleteMany({ where: { tenantId } })
      await tx.tenant.delete({ where: { id: tenantId } })
    },
    { timeout: 60_000 },
  )

  // Fuera de la transacción: si un archivo no se puede borrar no se revierte la eliminación.
  for (const url of fileUrls) {
    await storage.remove(url).catch(() => undefined)
  }

  return {
    tenantId,
    slug: tenant.slug,
    name: tenant.name,
    ownerEmails: owners.map((u) => u.email),
    ownerName: owners[0]?.name ?? null,
  }
}

/**
 * Elimina la cuenta de UN usuario sin borrar el negocio (usuarios de marca):
 * sus datos personales se sustituyen por valores anónimos y ya no puede entrar.
 * Los registros operativos del negocio (p. ej. solicitudes de producto) se
 * conservan porque pertenecen al negocio, ya sin datos que lo identifiquen.
 */
export async function anonymizeUser(
  userId: string,
  reason: DeletionReason,
  ip: string | null = null,
): Promise<{ email: string; name: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.deletedAt) throw new HttpError(404, 'Usuario no encontrado')
  if (user.role === 'SUPER_ADMIN') throw new HttpError(400, 'No se puede eliminar un SUPER_ADMIN')

  const now = new Date()
  const unusablePassword = await bcrypt.hash(randomBytes(32).toString('hex'), 10)

  await prisma.$transaction(async (tx) => {
    await tx.termsAcceptance.updateMany({ where: { userId }, data: { userDeletedAt: now } })
    await tx.consentEvent.updateMany({ where: { userId }, data: { userDeletedAt: now } })
    await tx.accountDeletionLog.create({
      data: { email: user.email, tenantName: null, scope: 'USER', reason, ip },
    })
    await tx.emailVerificationCode.deleteMany({ where: { userId } })
    await tx.smsVerificationCode.deleteMany({ where: { userId } })
    await tx.brand.updateMany({ where: { ownerUserId: userId }, data: { ownerUserId: null } })
    // Desvincula la evidencia: conserva su propia copia del correo y la fecha.
    await tx.termsAcceptance.updateMany({ where: { userId }, data: { userId: null } })
    await tx.consentEvent.updateMany({ where: { userId }, data: { userId: null } })
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `eliminado-${user.id}@eliminado.invalid`,
        name: 'Usuario eliminado',
        phone: null,
        phoneVerifiedAt: null,
        emailVerifiedAt: null,
        password: unusablePassword,
        mustChangePassword: false,
        totpSecret: null,
        totpEnabledAt: null,
        totpLastStep: null,
        totpRecoveryCodes: [],
        marketingOptIn: false,
        marketingOptInAt: null,
        marketingOptOutAt: null,
        brandId: null,
        deletedAt: now,
      },
    })
  })

  return { email: user.email, name: user.name }
}
