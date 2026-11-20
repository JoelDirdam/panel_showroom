/**
 * Plazos de conservación de datos (fuente única en el servidor).
 * La política pública vive en apps/web/src/lib/legal.ts (RETENTION) y en
 * /conservacion-de-datos: si cambias un número aquí, cámbialo también allá.
 */
export const RETENTION = {
  /** Meses sin suscripción vigente (prueba o plan vencidos) tras los que se elimina la cuenta. */
  inactiveAccountMonths: 12,
  /** Días de aviso por correo antes de eliminar una cuenta inactiva. */
  inactiveNoticeDays: 30,
  /** Días tras los que se elimina un registro que nunca verificó su correo. */
  unverifiedSignupDays: 30,
  /** Años que se conserva (bloqueada) la evidencia legal tras eliminar una cuenta:
   *  aceptación de términos, consentimientos y bitácora de eliminación. */
  evidenceYears: 5,
  /** Años que se conserva la bitácora de acciones del SUPER_ADMIN. */
  adminAuditYears: 5,
  /** Años que se conserva un reclamo de derechos de autor ya resuelto. */
  copyrightClaimYears: 5,
  /** Días que se conserva el registro técnico de webhooks de cobro. */
  webhookEventDays: 90,
  /** Horas tras su vencimiento en que se borran los códigos de verificación. */
  verificationCodeHours: 24,
  /** Días de anticipación del aviso de renovación automática. */
  renewalNoticeDays: 7,
} as const

const DAY_MS = 24 * 60 * 60 * 1000

export function daysAgo(days: number, from: Date = new Date()): Date {
  return new Date(from.getTime() - days * DAY_MS)
}

export function monthsAgo(months: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setUTCMonth(d.getUTCMonth() - months)
  return d
}

export function yearsAgo(years: number, from: Date = new Date()): Date {
  const d = new Date(from)
  d.setUTCFullYear(d.getUTCFullYear() - years)
  return d
}
