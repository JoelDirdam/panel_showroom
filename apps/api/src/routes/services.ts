import { Router } from 'express'
import { getParam } from '../lib/params.js'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { createServiceSchema, updateServiceSchema } from '../schemas/services.js'
import {
  createService,
  deleteService,
  getService,
  listServices,
  updateService,
} from '../services/services.service.js'

const router = Router()

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    const includeInactive = req.query.includeInactive === 'true'
    return res.json(await listServices(tenantId, includeInactive))
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/', async (req, res) => {
  try {
    const parsed = createServiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    const service = await createService(tenantId, parsed.data)
    return res.status(201).json(service)
  } catch (e) {
    return sendError(res, e)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    return res.json(await getService(tenantId, getParam(req.params.id)))
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const parsed = updateServiceSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await updateService(tenantId, getParam(req.params.id), parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    const result = await deleteService(tenantId, getParam(req.params.id))
    if (!result) return res.status(204).send()
    return res.json(result)
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
