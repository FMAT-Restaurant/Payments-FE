import { useEffect } from 'react'
import { cn } from '../../lib/cn'
import { useStore } from '../../lib/createStore'
import { dismissToast, TOAST_DURATION_MS, toastStore, type Toast, type ToastVariant } from './toastStore'

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success-soft text-success',
  error: 'border-error/30 bg-error-soft text-error',
  warning: 'border-warning/30 bg-warning-soft text-warning',
  info: 'border-info/30 bg-info-soft text-info',
}

function ToastItem({ toast }: { toast: Toast }) {
  useEffect(() => {
    const timer = window.setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast.id])

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-control border px-4 py-3 text-small shadow-card',
        variantStyles[toast.variant],
      )}
    >
      <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-current" />
      <p className="flex-1 font-semibold">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-control text-body opacity-70 hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  )
}

export function ToastViewport() {
  const toasts = useStore(toastStore)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-2 tablet:inset-x-auto tablet:right-6 tablet:w-96"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
