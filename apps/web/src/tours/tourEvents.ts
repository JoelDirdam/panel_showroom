export const TOUR_OPEN_BRANDS_MODAL = 'panel-tour:open-brands-modal'
export const TOUR_OPEN_SALES_MODAL = 'panel-tour:open-sales-modal'
export const TOUR_CLOSE_MODALS = 'panel-tour:close-modals'

export function dispatchTourEvent(name: string): void {
  window.dispatchEvent(new CustomEvent(name))
}

export function closeTourModals(): void {
  dispatchTourEvent(TOUR_CLOSE_MODALS)
}
