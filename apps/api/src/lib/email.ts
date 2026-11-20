import { prisma } from './prisma.js'
import { appUrl } from './stripe.js'
import { signPurposeToken } from '../middleware/auth.js'

/**
 * Correos de la plataforma (Resend). Dos tipos, con reglas distintas:
 *
 * - Transaccionales (`sendEmail`): avisos del servicio que el usuario necesita
 *   (renovación, cancelación, eliminación de cuenta). No requieren consentimiento.
 * - Marketing (`sendMarketingEmail`): SOLO a quien dio su consentimiento aparte
 *   (`User.marketingOptIn`), y siempre con enlace de baja.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  headers?: Record<string, string>
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const esc = escapeHtml

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim())
}

/** Devuelve true solo si el proveedor aceptó el correo. Nunca lanza. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  if (!apiKey || !from) {
    console.log(`[email] (sin proveedor configurado) para=${message.to} asunto="${message.subject}"`)
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(message.headers ? { headers: message.headers } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      console.error(`[email] Resend respondió ${res.status} (asunto="${message.subject}"): ${detail}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[email] fallo al enviar:', err instanceof Error ? err.message : err)
    return false
  }
}

function layout(bodyHtml: string, footerHtml = ''): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2937;max-width:560px">
${bodyHtml}
<p style="margin-top:28px">— COSDI</p>
<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0" />
<p style="font-size:12px;color:#6b7280">${footerHtml || 'Recibes este correo porque es un aviso necesario sobre tu cuenta de COSDI.'}</p>
</div>`
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#465fff;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>`
}

const formatDate = (date: Date): string =>
  new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)

const formatMxn = (amount: number): string =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)

// --- Transaccionales --------------------------------------------------------

/** Aviso previo al cobro automático (renovación mensual o primer cobro tras la prueba). */
export async function sendRenewalNotice(params: {
  to: string
  name: string
  planName: string
  chargeDate: Date
  amountMxn: number | null
  firstCharge: boolean
}): Promise<boolean> {
  const manageUrl = `${appUrl()}/suscripcion`
  const amount = params.amountMxn !== null ? `<strong>${formatMxn(params.amountMxn)}</strong> (IVA incluido)` : 'el precio de tu plan'
  const intro = params.firstCharge
    ? `tu prueba gratuita del plan <strong>${escapeHtml(params.planName)}</strong> termina el <strong>${formatDate(params.chargeDate)}</strong>. Ese día se hará el primer cobro de ${amount} a la tarjeta que registraste, y después tu plan se renovará automáticamente cada mes.`
    : `tu plan <strong>${escapeHtml(params.planName)}</strong> se renovará automáticamente el <strong>${formatDate(params.chargeDate)}</strong>. Ese día se cobrará ${amount} a la tarjeta que registraste.`
  return sendEmail({
    to: params.to,
    subject: params.firstCharge
      ? `Tu prueba de COSDI termina el ${formatDate(params.chargeDate)}`
      : `Tu plan de COSDI se renueva el ${formatDate(params.chargeDate)}`,
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Te avisamos con anticipación: ${intro}</p>
<p>Si quieres continuar, no tienes que hacer nada. Si prefieres no continuar, puedes cancelar en línea antes de esa fecha, en un par de clics y sin penalización:</p>
${button(manageUrl, 'Administrar o cancelar mi suscripción')}
<p style="font-size:13px;color:#6b7280">Si cancelas, conservas el acceso hasta el final del periodo ya pagado y no se te vuelve a cobrar.</p>`,
    ),
  })
}

export async function sendCancellationConfirmation(params: {
  to: string
  name: string
  planName: string
  accessUntil: Date | null
}): Promise<boolean> {
  const until = params.accessUntil
    ? `Conservas el acceso hasta el <strong>${formatDate(params.accessUntil)}</strong> y no se te volverá a cobrar.`
    : 'No se te volverá a cobrar.'
  return sendEmail({
    to: params.to,
    subject: 'Confirmación: cancelaste la renovación de tu plan de COSDI',
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Confirmamos que cancelaste la renovación automática de tu plan <strong>${escapeHtml(params.planName)}</strong>. ${until}</p>
<p>Si cambias de opinión, puedes reanudar tu suscripción antes de esa fecha:</p>
${button(`${appUrl()}/suscripcion`, 'Ver mi suscripción')}
<p style="font-size:13px;color:#6b7280">Guarda este correo como comprobante de tu cancelación.</p>`,
    ),
  })
}

export async function sendAccountDeletedConfirmation(params: { to: string; name: string }): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: 'Tu cuenta de COSDI fue eliminada',
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Confirmamos que tu cuenta de COSDI y los datos asociados fueron eliminados a petición tuya. Si tenías una suscripción activa, quedó cancelada y no se te volverá a cobrar.</p>
<p>Conservamos únicamente, bloqueados y por el plazo indicado en nuestra política de conservación de datos, los registros que la ley nos permite o exige guardar (por ejemplo, la constancia de aceptación de los términos y los comprobantes de pago).</p>
<p>Si no solicitaste esto, respóndenos de inmediato a contacto@cosdi.mx.</p>`,
      'Este es el último correo que recibirás sobre esta cuenta.',
    ),
  })
}

/** Aviso de que una cuenta inactiva será eliminada por la política de conservación. */
export async function sendRetentionNotice(params: {
  to: string
  name: string
  businessName: string
  deleteAfter: Date
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Tu cuenta de COSDI se eliminará el ${formatDate(params.deleteAfter)}`,
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>La cuenta de <strong>${escapeHtml(params.businessName)}</strong> en COSDI lleva mucho tiempo sin una suscripción activa. Conforme a nuestra política de conservación de datos, la cuenta y su información se eliminarán de forma definitiva a partir del <strong>${formatDate(params.deleteAfter)}</strong>.</p>
<p>Si quieres conservarla, inicia sesión y reactiva tu plan antes de esa fecha. También puedes entrar y descargar una copia de tus datos:</p>
${button(`${appUrl()}/login`, 'Entrar a mi cuenta')}`,
    ),
  })
}

export async function sendCopyrightClaimAlert(params: {
  to: string
  claimId: string
  claimantName: string
  claimantEmail: string
  infringingUrl: string
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Nuevo reclamo de derechos de autor (${params.claimId})`,
    html: layout(
      `<p>Se recibió un reclamo de derechos de autor por el canal público.</p>
<p><strong>De:</strong> ${escapeHtml(params.claimantName)} (${escapeHtml(params.claimantEmail)})<br />
<strong>Contenido señalado:</strong> ${escapeHtml(params.infringingUrl)}</p>
${button(`${appUrl()}/platform/legal`, 'Revisar en el panel')}`,
      'Aviso interno de la plataforma.',
    ),
  })
}

export async function sendCopyrightClaimReceipt(params: {
  to: string
  name: string
  claimId: string
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Recibimos tu reclamo de derechos de autor (folio ${params.claimId})`,
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Recibimos tu aviso de posible infracción de derechos de autor. Tu folio es <strong>${escapeHtml(params.claimId)}</strong>.</p>
<p>Lo revisaremos y te responderemos a este correo. Si necesitamos más información para identificar la obra o el contenido señalado, te la pediremos por este medio.</p>`,
      'Recibes este correo porque enviaste un reclamo desde cosdi.mx.',
    ),
  })
}

/** Aviso al negocio de que su cuenta fue suspendida desde la plataforma. */
export async function sendSuspensionNotice(params: {
  to: string
  name: string
  businessName: string
  reason: string
  billingPaused: boolean
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: 'Tu cuenta de COSDI fue suspendida',
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Suspendimos el acceso de <strong>${escapeHtml(params.businessName)}</strong> a COSDI.</p>
<p><strong>Motivo:</strong> ${escapeHtml(params.reason)}</p>
<p>${params.billingPaused ? 'Mientras dure la suspensión no se te cobrará la suscripción.' : 'No tienes cobros recurrentes activos.'} Tus datos se conservan: puedes entrar a tu cuenta para descargarlos.</p>
<p>Si crees que se trata de un error o quieres resolverlo, responde a este correo o escríbenos a contacto@cosdi.mx.</p>`,
    ),
  })
}

export async function sendReactivationNotice(params: { to: string; name: string; businessName: string }): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: 'Tu cuenta de COSDI está activa de nuevo',
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Reactivamos el acceso de <strong>${escapeHtml(params.businessName)}</strong> a COSDI. Ya puedes entrar a tu panel como siempre.</p>
${button(`${appUrl()}/login`, 'Entrar a mi cuenta')}`,
    ),
  })
}

/** Aviso de nueva versión de los términos (aviso necesario: no requiere consentimiento de marketing). */
export async function sendTermsUpdateNotice(params: {
  to: string
  name: string
  version: string
  summary: string
}): Promise<boolean> {
  return sendEmail({
    to: params.to,
    subject: `Actualizamos los Términos y Condiciones de COSDI (versión ${params.version})`,
    html: layout(
      `<p>Hola ${escapeHtml(params.name)},</p>
<p>Publicamos la versión <strong>${escapeHtml(params.version)}</strong> de los Términos y Condiciones de COSDI.</p>
<p><strong>Qué cambia:</strong> ${escapeHtml(params.summary)}</p>
<p>La próxima vez que entres a tu panel te pediremos aceptarlos. Puedes leerlos completos aquí:</p>
${button(`${appUrl()}/terminos`, 'Leer los términos')}
<p style="font-size:13px;color:#6b7280">Si no estás de acuerdo, desde "Mi cuenta" puedes descargar tus datos y eliminar tu cuenta en cualquier momento.</p>`,
    ),
  })
}

// --- Marketing ---------------------------------------------------------------

/** Enlace de baja de correos de marketing (no caduca; solo sirve para darse de baja). */
export function unsubscribeUrl(userId: string): { page: string; oneClick: string } {
  const token = signPurposeToken('unsubscribe', { uid: userId })
  const apiBase = (process.env.API_PUBLIC_URL?.trim() || '').replace(/\/+$/, '')
  return {
    page: `${appUrl()}/baja-correos?token=${token}`,
    // RFC 8058 (baja con un clic desde Gmail/Outlook). Requiere API_PUBLIC_URL.
    oneClick: apiBase ? `${apiBase}/api/site/unsubscribe?token=${token}` : '',
  }
}

/**
 * Envía un correo de marketing a UN usuario, solo si lo consintió.
 * Añade el pie con el enlace de baja y las cabeceras List-Unsubscribe.
 * Devuelve 'skipped' si el usuario no ha dado (o retiró) su consentimiento, o si
 * es de una cuenta de prueba y el envío no es de prueba (`options.testSend`).
 */
export async function sendMarketingEmail(
  userId: string,
  subject: string,
  bodyHtml: string,
  options: { testSend?: boolean } = {},
): Promise<'sent' | 'skipped' | 'failed'> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      marketingOptIn: true,
      deletedAt: true,
      emailVerifiedAt: true,
      tenant: { select: { isTest: true } },
    },
  })
  if (!user || user.deletedAt || !user.marketingOptIn || !user.emailVerifiedAt) return 'skipped'
  // Las cuentas de prueba solo reciben envíos de prueba, y un envío de prueba solo va a ellas.
  if (Boolean(user.tenant?.isTest) !== Boolean(options.testSend)) return 'skipped'

  const links = unsubscribeUrl(user.id)
  const headers: Record<string, string> = {
    'List-Unsubscribe': links.oneClick
      ? `<${links.oneClick}>, <mailto:privacidad@cosdi.mx?subject=Baja%20de%20correos>`
      : '<mailto:privacidad@cosdi.mx?subject=Baja%20de%20correos>',
  }
  if (links.oneClick) headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'

  const ok = await sendEmail({
    to: user.email,
    subject,
    html: layout(
      bodyHtml,
      `Recibes este correo porque aceptaste recibir novedades y promociones de COSDI. <a href="${escapeHtml(links.page)}" style="color:#6b7280">Darme de baja</a> · COSDI, Victoria de Durango, Durango, México.`,
    ),
    headers,
  })
  return ok ? 'sent' : 'failed'
}
