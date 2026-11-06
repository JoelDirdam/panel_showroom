import { Router } from 'express'
import { z } from 'zod'
import { getParam } from '../lib/params.js'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  closeBrandCutoff,
  markCutoffSettlementPaid,
} from '../services/cutoff.service.js'

const router = Router()

router.use(authenticate)
router.use(authorize('BUSINESS'))

const noteSchema = z.object({
  note: z.string().max(500).optional().nullable(),
})

router.post('/:brandId/close', async (req, res) => {
  const brandId = getParam(req.params.brandId)
  const parsed = noteSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  try {
    const settlement = await closeBrandCutoff(
      req.user!.tenantId!,
      brandId,
      req.user!.id,
      parsed.data.note,
    )
    return res.status(201).json(settlement)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'BRAND_NOT_FOUND') {
      return res.status(404).json({ error: 'Marca no encontrada' })
    }
    if (message === 'NO_LINES_TO_CLOSE') {
      return res.status(400).json({ error: 'No hay ventas pendientes de cierre en este periodo' })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al cerrar el corte' })
  }
})

router.post('/settlements/:id/mark-paid', async (req, res) => {
  const id = getParam(req.params.id)
  const parsed = noteSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
  }

  try {
    const settlement = await markCutoffSettlementPaid(
      req.user!.tenantId!,
      id,
      req.user!.id,
      parsed.data.note,
    )
    return res.json(settlement)
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message === 'SETTLEMENT_NOT_FOUND') {
      return res.status(404).json({ error: 'Corte no encontrado o ya pagado' })
    }
    console.error(err)
    return res.status(500).json({ error: 'Error al marcar el corte como pagado' })
  }
})

export default router
