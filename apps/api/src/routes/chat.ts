import { Router } from 'express'
import { getParam } from '../lib/params.js'
import { sendError } from '../lib/httpError.js'
import { authenticate, authorize, requireTenantId } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { toggleAiSchema } from '../schemas/chat.js'
import { normalizeCustomerPhone } from '../modules/ai/sanitize.js'

const router = Router()

router.use(authenticate, authorize('BUSINESS'))

router.patch('/:customerPhone/toggle-ai', async (req, res) => {
  try {
    const parsed = toggleAiSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() })
    }
    const tenantId = requireTenantId(req.user!)
    const customerPhone = normalizeCustomerPhone(getParam(req.params.customerPhone))
    if (!customerPhone) {
      return res.status(400).json({ error: 'Teléfono inválido' })
    }

    const conversation = await prisma.conversation.upsert({
      where: { tenantId_customerPhone: { tenantId, customerPhone } },
      create: {
        tenantId,
        customerPhone,
        aiEnabled: parsed.data.aiEnabled,
      },
      update: { aiEnabled: parsed.data.aiEnabled },
    })

    return res.json({
      customerPhone: conversation.customerPhone,
      aiEnabled: conversation.aiEnabled,
      humanRequestedAt: conversation.humanRequestedAt,
    })
  } catch (e) {
    return sendError(res, e)
  }
})

export default router
