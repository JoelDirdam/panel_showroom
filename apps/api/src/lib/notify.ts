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

export const notify: NotificationProvider = new ConsoleNotifyAdapter()
