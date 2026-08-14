import { Router } from 'express'
import { getParam } from '../lib/params.js'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentSchema,
} from '../schemas/appointments.js'
import {
  cancelAppointment,
  createAppointment,
  getAppointment,
  listAppointments,
  updateAppointment,
} from '../services/appointments.service.js'

const router = Router()

router.use(authenticate, authorize('BUSINESS'))

router.get('/', async (req, res) => {
  try {
    const parsed = listAppointmentsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Filtros inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await listAppointments(tenantId, parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/', async (req, res) => {
  try {
    const parsed = createAppointmentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    const appointment = await createAppointment(tenantId, parsed.data)
    return res.status(201).json(appointment)
  } catch (e) {
    return sendError(res, e)
  }
})

router.get('/:id', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    return res.json(await getAppointment(tenantId, getParam(req.params.id)))
  } catch (e) {
    return sendError(res, e)
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const parsed = updateAppointmentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    return res.json(await updateAppointment(tenantId, getParam(req.params.id), parsed.data))
  } catch (e) {
    return sendError(res, e)
  }
})

router.post('/:id/cancel', async (req, res) => {
  try {
    const tenantId = requireTenantId(req.user!)
    return res.json(await cancelAppointment(tenantId, getParam(req.params.id)))
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
