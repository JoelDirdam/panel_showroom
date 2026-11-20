import { reactive, readonly } from 'vue'

/**
 * Consentimiento de cookies del sitio público de COSDI.
 *
 * - "necesarias": sesión y preferencias (tema, este mismo consentimiento). Siempre activas.
 * - "analytics": Google Analytics 4, Hotjar y Contentsquare.
 * - "marketing": Pixel de Meta.
 *
 * Hasta que el visitante decide, NINGÚN rastreador se descarga ni se ejecuta
 * (ver lib/trackers.ts). La decisión se guarda solo en su navegador y puede
 * cambiarse en cualquier momento desde "Preferencias de cookies".
 */

const STORAGE_KEY = 'cosdi.cookieConsent'
/** Subir la versión vuelve a preguntar (p. ej. si se añade un rastreador nuevo). */
export const CONSENT_VERSION = 1
/** El consentimiento se vuelve a pedir después de este tiempo. */
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000

export interface ConsentChoice {
  analytics: boolean
  marketing: boolean
}

interface StoredConsent extends ConsentChoice {
  v: number
  at: string
}

function read(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConsent>
    if (parsed.v !== CONSENT_VERSION || typeof parsed.at !== 'string') return null
    if (Date.now() - new Date(parsed.at).getTime() > MAX_AGE_MS) return null
    return {
      v: CONSENT_VERSION,
      at: parsed.at,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    }
  } catch {
    return null
  }
}

const stored = read()

const state = reactive({
  /** true cuando el visitante ya eligió (aceptar, rechazar o configurar). */
  decided: stored !== null,
  analytics: stored?.analytics ?? false,
  marketing: stored?.marketing ?? false,
  decidedAt: stored?.at ?? (null as string | null),
  /** Abre el panel de preferencias aunque ya haya decidido. */
  panelOpen: false,
})

export const consent = readonly(state)

type Listener = (choice: ConsentChoice, previous: ConsentChoice | null) => void
const listeners = new Set<Listener>()

export function onConsentChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function saveConsent(choice: ConsentChoice): void {
  const previous = state.decided ? { analytics: state.analytics, marketing: state.marketing } : null
  const at = new Date().toISOString()
  state.decided = true
  state.analytics = choice.analytics
  state.marketing = choice.marketing
  state.decidedAt = at
  state.panelOpen = false
  try {
    const value: StoredConsent = { v: CONSENT_VERSION, at, ...choice }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    /* sin almacenamiento: la elección vale solo para esta visita */
  }
  for (const listener of listeners) listener(choice, previous)
}

export const acceptAllCookies = (): void => saveConsent({ analytics: true, marketing: true })
export const rejectOptionalCookies = (): void => saveConsent({ analytics: false, marketing: false })

export function openCookiePreferences(): void {
  state.panelOpen = true
}

export function closeCookiePreferences(): void {
  state.panelOpen = false
}
