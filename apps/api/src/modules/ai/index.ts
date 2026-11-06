import { inboundQueue } from '../whatsapp/whatsapp.queue.js'
import { findActiveConfigByPhoneNumberId } from '../whatsapp/whatsapp.service.js'
import { processCustomerMessage } from './processCustomerMessage.js'

export { processCustomerMessage } from './processCustomerMessage.js'

export function registerInboundAiHandler(): void {
  inboundQueue.setHandler(async (message) => {
    const config = await findActiveConfigByPhoneNumberId(message.tenantPhoneNumberId)
    if (!config) return
    await processCustomerMessage(config.tenantId, message.customerPhone, message.messageText)
  })
}
