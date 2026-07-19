export type TourRole = 'ADMIN' | 'BRAND'

export function tourStorageKey(userId: string, role: TourRole): string {
  return `panel-tour-done:${userId}:${role}`
}

export function isTourDone(userId: string, role: TourRole): boolean {
  return localStorage.getItem(tourStorageKey(userId, role)) === '1'
}

export function markTourDone(userId: string, role: TourRole): void {
  localStorage.setItem(tourStorageKey(userId, role), '1')
}

export function clearTourDone(userId: string, role: TourRole): void {
  localStorage.removeItem(tourStorageKey(userId, role))
}
