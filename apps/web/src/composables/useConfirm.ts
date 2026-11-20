import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  /** Pinta la acción en rojo (eliminar, cancelar cita, etc.). */
  danger?: boolean
}

export const confirmState = reactive<{
  open: boolean
  options: ConfirmOptions
  resolve: ((value: boolean) => void) | null
}>({ open: false, options: { title: '' }, resolve: null })

/**
 * Reemplazo accesible de window.confirm:
 *   if (!(await confirm({ title: '¿Eliminar "Corte"?', danger: true }))) return
 */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  confirmState.resolve?.(false)
  confirmState.options = options
  confirmState.open = true
  return new Promise((resolve) => {
    confirmState.resolve = resolve
  })
}

export function settleConfirm(value: boolean) {
  confirmState.resolve?.(value)
  confirmState.resolve = null
  confirmState.open = false
}

export function useConfirm() {
  return confirm
}
