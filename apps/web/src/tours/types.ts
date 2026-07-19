export type TourStepDef = {
  /** CSS selector; omit for centered intro popovers */
  element?: string
  /** Navigate here before highlighting */
  route?: string
  /** CustomEvent name to open UI (e.g. a modal) before highlighting */
  open?: string
  /** Force sidebar open (mobile) */
  ensureSidebar?: boolean
  /** Prevent clicks on the highlighted element */
  disableInteraction?: boolean
  popover: {
    title: string
    description: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
  }
}
