/**
 * Convierte rutas de uploads del API (`/uploads/...`) en URLs cargables en el browser.
 * En dev el API sirve uploads en el origen del backend; Vite debe proxy `/uploads`.
 */
export function resolveUploadUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  const apiBase = import.meta.env.VITE_API_URL || '/api'
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    const origin = new URL(apiBase).origin
    return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`
  }

  return url.startsWith('/') ? url : `/${url}`
}
