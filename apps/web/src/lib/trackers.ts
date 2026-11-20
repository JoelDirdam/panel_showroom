import api from '@/services/api'
import { consent, onConsentChange, type ConsentChoice } from './consent'

/**
 * Carga de rastreadores de terceros (Google Analytics 4, Hotjar, Contentsquare, Pixel de Meta).
 *
 * Reglas (no las relajes sin revisar el aviso de privacidad y /cookies):
 * 1. Nada se descarga hasta que el visitante acepta la categoría en el banner.
 * 2. Solo se usan en las páginas públicas de COSDI (rutas con `meta.tracking`):
 *    nunca dentro del panel ni en /reservar/:slug, donde hay datos de los
 *    negocios y de sus clientes. Al salir de una página con rastreo hacia una
 *    sin rastreo, el router recarga la página para descargar los scripts.
 * 3. Si el visitante retira su consentimiento se borran las cookies y se recarga.
 *
 * Los IDs se configuran en el panel de plataforma (Integraciones).
 */

interface PublicTrackers {
  ga4Id: string | null
  metaPixelId: string | null
  hotjarId: string | null
  /** Opcional: una API anterior a este campo no lo envía. */
  contentsquareId?: string | null
}

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown; callMethod?: unknown }
    _fbq?: unknown
    hj?: ((...args: unknown[]) => void) & { q?: unknown[] }
    _hjSettings?: { hjid: number; hjsv: number }
    _uxa?: unknown[]
  }
}

let config: PublicTrackers | null = null
let configPromise: Promise<PublicTrackers | null> | null = null
const loaded = { ga4: false, metaPixel: false, hotjar: false, contentsquare: false }

/** true si en esta carga de página ya se ejecutó algún rastreador. */
export function trackersActive(): boolean {
  return loaded.ga4 || loaded.metaPixel || loaded.hotjar || loaded.contentsquare
}

function fetchConfig(): Promise<PublicTrackers | null> {
  if (!configPromise) {
    configPromise = api
      .get<{ trackers: PublicTrackers }>('/site/config')
      .then(({ data }) => {
        config = data.trackers
        return config
      })
      .catch(() => null)
  }
  return configPromise
}

function injectScript(src: string): void {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function loadGa4(id: string): void {
  if (loaded.ga4) return
  loaded.ga4 = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // Las vistas de página se envían a mano (trackPageView) solo en rutas con rastreo.
  window.gtag('config', id, { send_page_view: false, anonymize_ip: true })
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`)
}

function loadHotjar(id: string): void {
  if (loaded.hotjar) return
  loaded.hotjar = true
  if (!window.hj) {
    const hj: NonNullable<Window['hj']> = (...args: unknown[]) => {
      ;(hj.q = hj.q || []).push(args)
    }
    window.hj = hj
  }
  window._hjSettings = { hjid: Number(id), hjsv: 6 }
  injectScript(`https://static.hotjar.com/c/hotjar-${encodeURIComponent(id)}.js?sv=6`)
}

/**
 * Contentsquare (antes Hotjar). El tag registra por sí mismo la primera vista;
 * las siguientes navegaciones de la SPA se envían con `trackPageview`.
 */
let contentsquareFirstView = true

function loadContentsquare(id: string): void {
  if (loaded.contentsquare) return
  loaded.contentsquare = true
  window._uxa = window._uxa || []
  injectScript(`https://t.contentsquare.net/uxa/${encodeURIComponent(id)}.js`)
}

function loadMetaPixel(id: string): void {
  if (loaded.metaPixel) return
  loaded.metaPixel = true
  if (!window.fbq) {
    const fbq: NonNullable<Window['fbq']> = (...args: unknown[]) => {
      if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args)
      else fbq.queue!.push(args)
    }
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    if (!window._fbq) window._fbq = fbq
    injectScript('https://connect.facebook.net/en_US/fbevents.js')
  }
  window.fbq!('init', id)
}

async function applyConsent(choice: ConsentChoice): Promise<void> {
  if (!choice.analytics && !choice.marketing) return
  const trackers = config ?? (await fetchConfig())
  if (!trackers) return
  if (choice.analytics) {
    if (trackers.ga4Id) loadGa4(trackers.ga4Id)
    if (trackers.hotjarId) loadHotjar(trackers.hotjarId)
    if (trackers.contentsquareId) loadContentsquare(trackers.contentsquareId)
  }
  if (choice.marketing && trackers.metaPixelId) loadMetaPixel(trackers.metaPixelId)
}

/** Vista de página. Llamar solo en rutas públicas de marketing. */
export function trackPageView(path: string): void {
  if (loaded.ga4 && window.gtag) {
    window.gtag('event', 'page_view', { page_path: path, page_location: window.location.origin + path })
  }
  if (loaded.metaPixel && window.fbq) window.fbq('track', 'PageView')
  if (loaded.hotjar && window.hj) window.hj('stateChange', path)
  if (loaded.contentsquare && window._uxa) {
    if (contentsquareFirstView) contentsquareFirstView = false
    else window._uxa.push(['trackPageview', path])
  }
}

/** Conversión: se creó una cuenta. Sin datos personales. */
export function trackSignup(): void {
  if (loaded.ga4 && window.gtag) window.gtag('event', 'sign_up', { method: 'email' })
  if (loaded.metaPixel && window.fbq) window.fbq('track', 'CompleteRegistration')
}

const TRACKER_COOKIE_PREFIXES = ['_ga', '_gid', '_gat', '_gcl', '_fbp', '_fbc', '_hj', '_cs_']

/** Borra las cookies propias que dejan los rastreadores (mejor esfuerzo). */
function clearTrackerCookies(): void {
  const host = window.location.hostname
  const parts = host.split('.')
  const domains = new Set<string>(['', host])
  for (let i = 0; i < parts.length - 1; i += 1) domains.add(`.${parts.slice(i).join('.')}`)
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (!name || !TRACKER_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) continue
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`
    }
  }
}

/**
 * Activa lo ya consentido (si aplica) en una ruta de marketing.
 * Devuelve cuando los rastreadores consentidos quedaron inicializados.
 */
export async function ensureTrackers(): Promise<void> {
  if (!consent.decided) return
  await applyConsent({ analytics: consent.analytics, marketing: consent.marketing })
}

let listening = false

/** Reacciona a los cambios del banner. `isTrackedRoute` dice si la página actual admite rastreo. */
export function initTrackers(isTrackedRoute: () => boolean, currentPath: () => string): void {
  if (listening) return
  listening = true
  onConsentChange((choice, previous) => {
    const revoked =
      previous !== null &&
      ((previous.analytics && !choice.analytics) || (previous.marketing && !choice.marketing))
    if (revoked) {
      clearTrackerCookies()
      // Un script ya cargado no se puede "descargar": se recarga la página sin él.
      if (trackersActive()) window.location.reload()
      return
    }
    if (!isTrackedRoute()) return
    void applyConsent(choice).then(() => trackPageView(currentPath()))
  })
}
