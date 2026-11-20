import type { Prisma } from '@prisma/client'

/**
 * Cuentas de prueba internas (`Tenant.isTest`): se ven en el panel de plataforma
 * igual que las demás, pero NO reciben correos masivos ni automáticos (avisos de
 * términos, de renovación o de eliminación por inactividad) y la limpieza por
 * inactividad nunca las elimina. Los correos que la propia cuenta pide (códigos
 * de verificación, recuperar contraseña) sí se envían, para poder usarlas.
 */

/** Usuarios de cuentas reales: de negocios que no son de prueba, o que aún no crean negocio. */
export const REAL_ACCOUNT_USER: Prisma.UserWhereInput = {
  OR: [{ tenantId: null }, { tenant: { isTest: false } }],
}

/** Usuarios de cuentas de prueba. */
export const TEST_ACCOUNT_USER: Prisma.UserWhereInput = {
  tenant: { isTest: true },
}
