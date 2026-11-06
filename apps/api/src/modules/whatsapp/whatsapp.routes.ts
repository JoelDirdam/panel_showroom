import { Router, type Request } from 'express'
import { inboundQueue } from './whatsapp.queue.js'
import { verifyHubToken } from './whatsapp.webhook.js'

const router = Router()

function queryString(req: Request, key: string): string {
  const value = req.query[key]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

router.get('/webhook', async (req, res) => {
  const mode = queryString(req, 'hub.mode')
  const token = queryString(req, 'hub.verify_token')
  const challenge = queryString(req, 'hub.challenge')

  if (mode !== 'subscribe' || !challenge) {
    return res.sendStatus(403)
  }

  try {
    const ok = await verifyHubToken(token)
    if (!ok) return res.sendStatus(403)
    return res.status(200).send(challenge)
  } catch (err) {
    console.error('[whatsapp.webhook] verify failed', err)
    return res.sendStatus(403)
  }
})

router.post('/webhook', (req, res) => {
  const payload: unknown = req.body
  res.status(200).send('EVENT_RECEIVED')
  inboundQueue.enqueueRaw(payload)
})

export default router
