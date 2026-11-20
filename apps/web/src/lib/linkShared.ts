/** Recuerda (en este navegador) que el negocio ya copió o compartió su link de reservas. */
const KEY = 'cosdi:link-compartido'

export function markLinkShared(): void {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    /* modo privado: no pasa nada */
  }
}

export function wasLinkShared(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
