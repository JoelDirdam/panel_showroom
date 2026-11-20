import { inboundQueue } from '../whatsapp/whatsapp.queue.js'
import { findActiveConfigByPhoneNumberId } from '../whatsapp/whatsapp.service.js'
import { processCustomerMessage } from './processCustomerMessage.js'
import { platformCredentials } from '../../services/appointmentReminders.service.js'
import {
  handleAppointmentButtonReply,
  handlePlatformTextMessage,
} from '../../services/appointmentReplies.service.js'

export { processCustomerMessage } from './processCustomerMessage.js'

export function registerInboundAiHandler(): void {
  inboundQueue.setButtonHandler((reply) => handleAppointmentButtonReply(reply))
  inboundQueue.setHandler(async (message) => {
    const config = await findActiveConfigByPhoneNumberId(message.tenantPhoneNumberId)
    if (!config) {
      // Número de COSDI (solo recordatorios): respuesta automática para que el mensaje no se pierda.
      if (platformCredentials()?.phoneNumberId === message.tenantPhoneNumberId) {
        await handlePlatformTextMessage(message)
      }
      return
    }
    if (!config.aiEnabled) return
    await processCustomerMessage(config.tenantId, message.customerPhone, message.messageText)
  })
}
