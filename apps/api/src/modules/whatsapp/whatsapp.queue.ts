import { EventEmitter } from 'node:events'
import { parseInboundTextMessages } from './whatsapp.parser.js'
import type { InboundMessageHandler, InboundTextMessage } from './types.js'

const DEDUP_TTL_MS = 10 * 60 * 1000
const DEDUP_SWEEP_EVERY = 200

const defaultInboundHandler: InboundMessageHandler = (message) => {
  console.info('[whatsapp.inbound]', {
    tenantPhoneNumberId: message.tenantPhoneNumberId,
    customerPhone: message.customerPhone,
    messageId: message.messageId,
    messageText: message.messageText,
  })
}

class InboundQueue {
  private readonly emitter = new EventEmitter()
  private readonly seen = new Map<string, number>()
  private handler: InboundMessageHandler = defaultInboundHandler
  private enqueueCount = 0

  constructor() {
    this.emitter.on('inbound.message', (message: InboundTextMessage) => {
      void Promise.resolve()
        .then(() => this.handler(message))
        .catch((err: unknown) => {
          console.error('[whatsapp.queue] inbound handler failed', err)
        })
    })
  }

  setHandler(handler: InboundMessageHandler): void {
    this.handler = handler
  }

  /**
   * Encola el payload crudo sin bloquear. Parseo, dedup e IA ocurren en setImmediate.
   */
  enqueueRaw(payload: unknown): void {
    setImmediate(() => {
      try {
        this.processRaw(payload)
      } catch (err) {
        console.error('[whatsapp.queue] processRaw failed', err)
      }
    })
  }

  private processRaw(payload: unknown): void {
    this.enqueueCount += 1
    if (this.enqueueCount % DEDUP_SWEEP_EVERY === 0) {
      this.sweepExpired()
    }

    const messages = parseInboundTextMessages(payload)
    for (const message of messages) {
      if (this.isDuplicate(message.messageId)) continue
      this.emitter.emit('inbound.message', message)
    }
  }

  private isDuplicate(messageId: string): boolean {
    const now = Date.now()
    const previous = this.seen.get(messageId)
    if (previous !== undefined && now - previous < DEDUP_TTL_MS) {
      return true
    }
    this.seen.set(messageId, now)
    return false
  }

  private sweepExpired(): void {
    const cutoff = Date.now() - DEDUP_TTL_MS
    for (const [id, ts] of this.seen) {
      if (ts < cutoff) this.seen.delete(id)
    }
  }
}

export const inboundQueue = new InboundQueue()
