import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export interface ModalProps {
  open: boolean
  title: ReactNode
  children: ReactNode
  /** Called on Escape or overlay click; omit it for blocking modals (e.g. cash shift opening). */
  onClose?: () => void
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** Hides the visual title when the body already renders its own heading. */
  hideTitle?: boolean
  className?: string
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-4xl',
}

/** Accessible modal: focus moves inside, Tab stays inside, focus returns to the trigger on close. */
export function Modal({ open, title, children, onClose, footer, size = 'md', hideTitle = false, className }: Readonly<ModalProps>) {
  const titleId = useId()
  const panelRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE)
    ;(firstFocusable ?? panel)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !panel) return
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto p-4">
      {onClose ? (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Cerrar ventana"
          onClick={onClose}
          className="fixed inset-0 cursor-default bg-ink/45"
          data-testid="modal-overlay"
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-ink/45" data-testid="modal-overlay" />
      )}
      {/* Rendered `open` (not showModal) so focus handling stays in React and works the same in tests. */}
      <dialog
        ref={panelRef}
        open
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'relative m-auto w-full rounded-card border border-border bg-surface p-6 text-text shadow-modal tablet:p-8',
          sizeClasses[size],
          className,
        )}
      >
        <h2 id={titleId} className={cn('mb-4 text-h2 text-ink', hideTitle && 'sr-only')}>
          {title}
        </h2>
        {children}
        {footer && <div className="mt-6 flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">{footer}</div>}
      </dialog>
    </div>,
    document.body,
  )
}
