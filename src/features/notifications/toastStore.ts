import { createStore } from '../../lib/createStore'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  variant: ToastVariant
  message: string
}

export const TOAST_DURATION_MS = 5000

export const toastStore = createStore<Toast[]>([])

let nextId = 1

/** Shows a toast. The same message is not stacked twice while it is still visible. */
export function showToast(variant: ToastVariant, message: string): number {
  const existing = toastStore.getState().find((toast) => toast.message === message && toast.variant === variant)
  if (existing) {
    return existing.id
  }

  const id = nextId++
  toastStore.setState((toasts) => [...toasts, { id, variant, message }])
  return id
}

export function dismissToast(id: number): void {
  toastStore.setState((toasts) => toasts.filter((toast) => toast.id !== id))
}

export const notify = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  warning: (message: string) => showToast('warning', message),
  info: (message: string) => showToast('info', message),
}
