import { reactive } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

/** Avisos breves ("Cambios guardados") que se muestran abajo y se cierran solos. */
export const toastState = reactive<{ items: ToastItem[] }>({ items: [] })

let nextId = 1

export function dismissToast(id: number) {
  const i = toastState.items.findIndex((t) => t.id === id)
  if (i >= 0) toastState.items.splice(i, 1)
}

function push(tone: ToastTone, title: string, description?: string, ms = 4500) {
  const id = nextId++
  toastState.items.push({ id, tone, title, description })
  if (toastState.items.length > 3) toastState.items.shift()
  window.setTimeout(() => dismissToast(id), tone === 'error' ? ms + 2500 : ms)
  return id
}

export function useToast() {
  return {
    success: (title: string, description?: string) => push('success', title, description),
    error: (title: string, description?: string) => push('error', title, description),
    info: (title: string, description?: string) => push('info', title, description),
  }
}
