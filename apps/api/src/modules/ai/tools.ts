import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/httpError.js'
import { zonedLocalToUtc, parseTimeHm } from '../../lib/timezone.js'
import { createAppointment, listAppointments } from '../../services/appointments.service.js'
import { listBusinessHours } from '../../services/businessHours.service.js'
import { dayBoundsUtc, findFreeBlocks, parseIsoDate, zonedJsWeekday } from './availability.js'
import type { AiRuntimeContext } from './types.js'

export const OPENAI_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description:
        'Consulta bloques de horario libre del negocio para una fecha y duración. Usa sucursalId si hay varias sucursales.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
          durationMinutes: { type: 'number', description: 'Duración del servicio en minutos' },
          sucursalId: { type: 'string', description: 'Id de la sucursal elegida' },
        },
        required: ['date', 'durationMinutes'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_appointment',
      description:
        'Crea una cita en estado PENDING. Solo invocar cuando el cliente eligió servicio, fecha y hora explícitamente.',
      parameters: {
        type: 'object',
        properties: {
          serviceId: { type: 'string', description: 'Id del servicio elegido' },
          customerName: { type: 'string', description: 'Nombre del cliente' },
          date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
          time: { type: 'string', description: 'Hora de inicio HH:mm' },
          sucursalId: { type: 'string', description: 'Id de la sucursal elegida' },
        },
        required: ['serviceId', 'customerName', 'date', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'request_human_agent',
      description:
        'Pausa la IA (aiEnabled=false) y registra que el cliente pide atención humana. Usar si exige una persona o está inconforme.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Motivo breve de la derivación' },
        },
        required: ['reason'],
      },
    },
  },
]

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    /* ignore */
  }
  return {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function sucursalChoicePayload(ctx: AiRuntimeContext) {
  return {
    needsSucursal: true,
    message: 'El cliente debe elegir una sucursal antes de consultar horarios o agendar.',
    sucursales: ctx.sucursales.map((s) => ({ id: s.id, name: s.name, address: s.address })),
  }
}

async function persistSelectedSucursal(ctx: AiRuntimeContext, sucursalId: string) {
  ctx.selectedSucursalId = sucursalId
  await prisma.conversation.update({
    where: { id: ctx.conversationId },
    data: { selectedSucursalId: sucursalId },
  })
}

export async function resolveSucursalId(ctx: AiRuntimeContext, toolSucursalId?: string): Promise<string | null> {
  if (ctx.sucursalMode === 'single') {
    const only = ctx.sucursales[0]?.id ?? null
    if (only && ctx.selectedSucursalId !== only) {
      await persistSelectedSucursal(ctx, only)
    }
    return only
  }

  const candidate = toolSucursalId || ctx.selectedSucursalId
  if (!candidate) return null
  const match = ctx.sucursales.find((s) => s.id === candidate)
  if (!match) return null
  if (ctx.selectedSucursalId !== match.id) {
    await persistSelectedSucursal(ctx, match.id)
  }
  return match.id
}

async function checkAvailability(ctx: AiRuntimeContext, args: Record<string, unknown>) {
  const sucursalId = await resolveSucursalId(ctx, asString(args.sucursalId) || undefined)
  if (!sucursalId) return sucursalChoicePayload(ctx)

  const parsedDate = parseIsoDate(asString(args.date))
  if (!parsedDate) {
    return { ok: false, error: 'Fecha inválida. Usa YYYY-MM-DD.' }
  }
  const durationMinutes = asNumber(args.durationMinutes)
  if (durationMinutes === null || durationMinutes < 15 || durationMinutes > 480) {
    return { ok: false, error: 'durationMinutes debe estar entre 15 y 480.' }
  }

  const hours = await listBusinessHours(ctx.tenantId)
  const weekday = zonedJsWeekday(parsedDate.year, parsedDate.month, parsedDate.day, ctx.timezone)
  const dayHours = hours.find((h) => h.dayOfWeek === weekday)
  if (!dayHours || dayHours.isClosed) {
    return {
      ok: true,
      date: asString(args.date),
      closed: true,
      blocks: [] as Array<{ start: string; end: string }>,
      message: 'El negocio está cerrado ese día.',
    }
  }

  const { start, end } = dayBoundsUtc(parsedDate.year, parsedDate.month, parsedDate.day, ctx.timezone)
  const appointments = await listAppointments(ctx.tenantId, { from: start, to: end })
  const atSucursal = appointments.filter(
    (a) => (a.status === 'PENDING' || a.status === 'CONFIRMED') && a.sucursalId === sucursalId,
  )

  const blocks = findFreeBlocks({
    openTime: dayHours.openTime,
    closeTime: dayHours.closeTime,
    durationMinutes,
    appointments: atSucursal,
    year: parsedDate.year,
    month: parsedDate.month,
    day: parsedDate.day,
    timeZone: ctx.timezone,
  })

  return {
    ok: true,
    date: asString(args.date),
    sucursalId,
    durationMinutes,
    openTime: dayHours.openTime,
    closeTime: dayHours.closeTime,
    blocks,
  }
}

async function createAppointmentTool(ctx: AiRuntimeContext, args: Record<string, unknown>) {
  const sucursalId = await resolveSucursalId(ctx, asString(args.sucursalId) || undefined)
  if (!sucursalId) return sucursalChoicePayload(ctx)

  const serviceId = asString(args.serviceId)
  const customerName = asString(args.customerName)
  const dateRaw = asString(args.date)
  const timeRaw = asString(args.time)
  const parsedDate = parseIsoDate(dateRaw)
  const time = parseTimeHm(timeRaw)

  if (!serviceId || !customerName || !parsedDate || !time) {
    return { ok: false, error: 'Faltan serviceId, customerName, date (YYYY-MM-DD) o time (HH:mm).' }
  }

  const service = ctx.services.find((s) => s.id === serviceId)
  if (!service) {
    return { ok: false, error: 'Servicio no encontrado o inactivo.' }
  }

  const startTime = zonedLocalToUtc(
    parsedDate.year,
    parsedDate.month,
    parsedDate.day,
    time.hour,
    time.minute,
    ctx.timezone,
  )
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000)

  try {
    const appointment = await createAppointment(ctx.tenantId, {
      serviceId,
      sucursalId,
      customerName,
      customerPhone: ctx.customerPhone,
      startTime,
      endTime,
      status: 'PENDING',
    })
    await prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { customerName, selectedSucursalId: sucursalId },
    })
    const sucursal = ctx.sucursales.find((s) => s.id === sucursalId)
    return {
      ok: true,
      confirmation: {
        id: appointment.id,
        status: appointment.status,
        customerName: appointment.customerName,
        service: service.name,
        sucursal: sucursal?.name ?? null,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      },
    }
  } catch (e) {
    if (e instanceof HttpError) {
      return { ok: false, error: e.message }
    }
    console.error('[ai.tools] create_appointment failed', e)
    return { ok: false, error: 'No se pudo crear la cita. Prueba otro horario.' }
  }
}

async function requestHumanAgent(ctx: AiRuntimeContext, args: Record<string, unknown>) {
  const reason = asString(args.reason) || 'El cliente solicita una persona'
  const now = new Date()
  await prisma.conversation.update({
    where: { id: ctx.conversationId },
    data: {
      aiEnabled: false,
      humanRequestedAt: now,
      humanRequestReason: reason.slice(0, 500),
    },
  })
  console.info('[ai.human_request]', {
    tenantId: ctx.tenantId,
    conversationId: ctx.conversationId,
    customerPhone: ctx.customerPhone,
    reason: reason.slice(0, 200),
  })
  return {
    ok: true,
    aiEnabled: false,
    message: 'La IA quedó pausada. Un humano del negocio debe continuar la conversación.',
  }
}

export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: AiRuntimeContext,
): Promise<string> {
  const args = parseArgs(rawArgs)
  let payload: unknown
  switch (name) {
    case 'check_availability':
      payload = await checkAvailability(ctx, args)
      break
    case 'create_appointment':
      payload = await createAppointmentTool(ctx, args)
      break
    case 'request_human_agent':
      payload = await requestHumanAgent(ctx, args)
      break
    default:
      payload = { ok: false, error: `Herramienta desconocida: ${name}` }
  }
  return JSON.stringify(payload)
}
