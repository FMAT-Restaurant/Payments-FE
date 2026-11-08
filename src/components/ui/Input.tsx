import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export interface InputProps extends Omit<ComponentProps<'input'>, 'size'> {
  /** Visible label; the placeholder never replaces it. */
  label: string
  helperText?: string
  /** Error shown next to the field; marks it as invalid. */
  errorMessage?: string
  /** MD 40px, LG 48px. */
  size?: 'md' | 'lg'
}

/** Text input with label, helper text and inline error (Guía Visual pág. 5). Works with react-hook-form `register`. */
export function Input({
  label,
  helperText,
  errorMessage,
  size = 'md',
  id,
  required,
  className,
  ...props
}: Readonly<InputProps>) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helperId = `${inputId}-helper`
  const errorId = `${inputId}-error`
  const describedBy = cn(errorMessage && errorId, helperText && helperId) || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-small font-semibold text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-primary">
            {' *'}
          </span>
        )}
      </label>
      <input
        id={inputId}
        required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'w-full rounded-control border bg-surface px-3 text-ink placeholder:text-muted',
          'focus:border-primary focus-visible:outline-2 focus-visible:outline-accent',
          'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted read-only:bg-canvas read-only:text-muted',
          size === 'lg' ? 'h-12 text-h3' : 'h-11 text-body tablet:h-10',
          errorMessage ? 'border-error' : 'border-border',
        )}
        {...props}
      />
      {errorMessage && (
        <p id={errorId} className="text-small text-error">
          {errorMessage}
        </p>
      )}
      {helperText && (
        <p id={helperId} className="text-caption text-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}
