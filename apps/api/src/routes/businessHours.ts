import { Router } from 'express'
import { getParam } from '../lib/params.js'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { updateBusinessHourSchema, weekBusinessHoursSchema } from '../schemas/businessHours.js'
import {
  listBusinessHours,
  replaceBusinessHours,
  updateBusinessHour,
} from '../services/businessHours.service.js'

const router = Router()

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    return res.json(await listBusinessHours(tenantId))
  } catch (e) {
    return sendError(res, e)
  }
})

router.put('/', async (req, res) => {
  try {
    const parsed = weekBusinessHoursSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await replaceBusinessHours(tenantId, parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const parsed = updateBusinessHourSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await updateBusinessHour(tenantId, getParam(req.params.id), parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
