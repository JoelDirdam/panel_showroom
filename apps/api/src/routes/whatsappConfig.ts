import { Router } from 'express'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { patchWhatsappConfigSchema, upsertWhatsappConfigSchema } from '../schemas/whatsappConfig.js'
import {
  getWhatsappConfig,
  patchWhatsappConfig,
  upsertWhatsappConfig,
} from '../services/whatsappConfig.service.js'

import { z } from 'zod'
import { rateLimit } from '../lib/rateLimit.js'
import {
  connectOwnNumber,
  disconnectOwnNumber,
  getRemindersStatus,
  refreshTemplateStatus,
  sendTestReminder,
  setRemindersEnabled,
} from '../services/whatsappConnect.service.js'

const connectSchema = z.object({
  phoneNumberId: z.string().trim().regex(/^\d{5,32}$/, 'Solo dígitos'),
  wabaId: z.string().trim().regex(/^\d{5,32}$/, 'Solo dígitos'),
  accessToken: z.string().trim().min(20).max(4096),
})

const router = Router()

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    return res.json(await getWhatsappConfig(tenantId))
  } catch (e) {
    return sendError(res, e)
  }
})

router.put('/', async (req, res) => {
  try {
    const parsed = upsertWhatsappConfigSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await upsertWhatsappConfig(tenantId, parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/', async (req, res) => {
  try {
    const parsed = patchWhatsappConfigSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await patchWhatsappConfig(tenantId, parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

/** Estado de los recordatorios automáticos del negocio. */
router.get('/reminders', async (req, res) => {
  try {
    return res.json(await getRemindersStatus(requireTenantId(req.user!)))
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/reminders', async (req, res) => {
  try {
    const parsed = z.object({ remindersEnabled: z.boolean() }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' })
    return res.json(await setRemindersEnabled(requireTenantId(req.user!), parsed.data.remindersEnabled))
  } catch (e) {
    return sendError(res, e)
  }
})

/** Conecta el número de WhatsApp Business del negocio: valida con Meta y prepara la plantilla. */
router.post(
  '/connect',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 10, keyPrefix: 'wa-connect' }),
  async (req, res) => {
    try {
      const parsed = connectSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
      }
      return res.json(await connectOwnNumber(requireTenantId(req.user!), parsed.data))
    } catch (e) {
      return sendError(res, e)
    }
  },
)

router.post('/refresh-template', async (req, res) => {
  try {
    return res.json(await refreshTemplateStatus(requireTenantId(req.user!)))
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/disconnect', async (req, res) => {
  try {
    return res.json(await disconnectOwnNumber(requireTenantId(req.user!)))
  } catch (e) {
    return sendError(res, e)
  }
})

router.post(
  '/test',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: 'wa-test' }),
  async (req, res) => {
    try {
      const parsed = z.object({ phone: z.string().trim().min(10).max(20) }).safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Teléfono inválido' })
      return res.json(await sendTestReminder(requireTenantId(req.user!), parsed.data.phone))
    } catch (e) {
      return sendError(res, e)
    }
  },
)

export default router
