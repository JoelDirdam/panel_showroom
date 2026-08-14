import { Router } from 'express'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { patchWhatsappConfigSchema, upsertWhatsappConfigSchema } from '../schemas/whatsappConfig.js'
import {
  getWhatsappConfig,
  patchWhatsappConfig,
  upsertWhatsappConfig,
} from '../services/whatsappConfig.service.js'

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

export default router
