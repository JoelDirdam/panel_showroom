/**
 * Abstracción de envío de notificaciones (email/SMS) para códigos de verificación.
 * En producción se puede sustituir por un adapter real (SES, Twilio, etc.) sin tocar
 * las rutas que consumen `notify`.
 */

export type NotifyPurpose = 'verify-email' | 'change-email' | 'verify-phone'

export interface NotificationProvider {
  sendEmailCode(to: string, code: string, purpose: NotifyPurpose): Promise<void>
  sendSmsCode(to: string, code: string, purpose: NotifyPurpose): Promise<void>
}

/**
 * Adapter de desarrollo: solo registra el código en consola. Sirve como
 * implementación por defecto mientras no exista un proveedor real conectado.
 */
export class ConsoleNotifyAdapter implements NotificationProvider {
  async sendEmailCode(to: string, code: string, purpose: NotifyPurpose): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[notify:email] destinatario=${to} purpose=${purpose} (código omitido en prod)`)
      return
    }
    console.log(`[notify:email] destinatario=${to} purpose=${purpose} código=${code}`)
  }

  async sendSmsCode(to: string, code: string, purpose: NotifyPurpose): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.log(`[notify:sms] destinatario=${to} purpose=${purpose} (código omitido en prod)`)
      return
    }
    console.log(`[notify:sms] destinatario=${to} purpose=${purpose} código=${code}`)
  }
}

const PURPOSE_SUBJECT: Record<NotifyPurpose, string> = {
  'verify-email': 'Tu código de verificación de COSDI',
  'change-email': 'Confirma tu nuevo correo en COSDI',
  'verify-phone': 'Tu código de verificación de COSDI',
}

/**
 * Email real vía Resend (https://resend.com). Requiere RESEND_API_KEY y EMAIL_FROM
 * (ej. "COSDI <no-reply@cosdi.mx>") con el dominio verificado en Resend.
 * El SMS sigue en consola hasta contratar un proveedor.
 */
export class ResendEmailAdapter extends ConsoleNotifyAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {
    super()
  }

  override async sendEmailCode(to: string, code: string, purpose: NotifyPurpose): Promise<void> {
    // Un fallo de Resend (dominio sin verificar, 422, timeout) NO debe tumbar la API:
    // las rutas son async en Express 4 y un throw aquí sería un unhandled rejection.
    // El usuario puede pedir "reenviar código".
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject: PURPOSE_SUBJECT[purpose],
          html: `<p>Tu código es:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Vence en unos minutos. Si no lo solicitaste, ignora este correo.</p><p>— COSDI</p>`,
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300)
        console.error(`[notify:email] Resend respondió ${res.status} (purpose=${purpose}): ${detail}`)
      }
    } catch (err) {
      console.error(`[notify:email] fallo al enviar (purpose=${purpose}):`, err instanceof Error ? err.message : err)
    }
  }
}

function createNotifyProvider(): NotificationProvider {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from = process.env.EMAIL_FROM?.trim()
  if (apiKey && from) return new ResendEmailAdapter(apiKey, from)
  if (process.env.NODE_ENV === 'production') {
    console.warn('[notify] RESEND_API_KEY/EMAIL_FROM no configurados: los correos NO se envían en producción')
  }
  return new ConsoleNotifyAdapter()
}

export const notify: NotificationProvider = createNotifyProvider()
