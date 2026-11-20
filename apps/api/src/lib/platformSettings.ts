import { z } from 'zod'
import { prisma } from './prisma.js'

/**
 * Rastreadores de terceros (analítica / publicidad) configurables desde el
 * panel de plataforma. Los IDs son públicos por naturaleza (van en el HTML),
 * pero el sitio solo los carga DESPUÉS de que el visitante acepta la categoría
 * correspondiente en el banner de cookies, y solo en las páginas públicas de COSDI.
 */

const TRACKERS_KEY = 'trackers'

const trackerSchema = (pattern: RegExp, message: string) =>
  z.object({
    enabled: z.boolean(),
    id: z
      .string()
      .trim()
      .max(40)
      .refine((v) => v === '' || pattern.test(v), message),
  })

export const trackersSchema = z
  .object({
    ga4: trackerSchema(/^G-[A-Z0-9]{4,20}$/, 'El ID de Google Analytics 4 tiene la forma G-XXXXXXXXXX'),
    metaPixel: trackerSchema(/^\d{6,20}$/, 'El ID del Pixel de Meta son solo números'),
    hotjar: trackerSchema(/^\d{4,12}$/, 'El Site ID de Hotjar son solo números'),
    // Opcional al leer para no invalidar configuraciones guardadas antes de existir este campo.
    contentsquare: trackerSchema(
      /^[a-z0-9]{6,20}$/i,
      'El ID del tag de Contentsquare son letras y números (ej. 62f9234aae787)',
    ).default({ enabled: false, id: '' }),
  })
  .superRefine((value, ctx) => {
    for (const key of ['ga4', 'metaPixel', 'hotjar', 'contentsquare'] as const) {
      if (value[key].enabled && !value[key].id) {
        ctx.addIssue({ code: 'custom', path: [key, 'id'], message: 'Escribe el ID para poder activarlo' })
      }
    }
  })

export type TrackerSettings = z.infer<typeof trackersSchema>

export const DEFAULT_TRACKERS: TrackerSettings = {
  ga4: { enabled: false, id: '' },
  metaPixel: { enabled: false, id: '' },
  hotjar: { enabled: false, id: '' },
  contentsquare: { enabled: false, id: '' },
}

export async function getTrackerSettings(): Promise<TrackerSettings> {
  const row = await prisma.platformSetting.findUnique({ where: { key: TRACKERS_KEY } })
  if (!row) return DEFAULT_TRACKERS
  const parsed = trackersSchema.safeParse(row.value)
  return parsed.success ? parsed.data : DEFAULT_TRACKERS
}

export async function saveTrackerSettings(value: TrackerSettings): Promise<TrackerSettings> {
  await prisma.platformSetting.upsert({
    where: { key: TRACKERS_KEY },
    update: { value },
    create: { key: TRACKERS_KEY, value },
  })
  return value
}

/** Lo que ve el sitio público: solo los IDs activos. */
export async function getPublicTrackers(): Promise<{
  ga4Id: string | null
  metaPixelId: string | null
  hotjarId: string | null
  contentsquareId: string | null
}> {
  const t = await getTrackerSettings()
  return {
    ga4Id: t.ga4.enabled && t.ga4.id ? t.ga4.id : null,
    metaPixelId: t.metaPixel.enabled && t.metaPixel.id ? t.metaPixel.id : null,
    hotjarId: t.hotjar.enabled && t.hotjar.id ? t.hotjar.id : null,
    contentsquareId: t.contentsquare.enabled && t.contentsquare.id ? t.contentsquare.id : null,
  }
}
