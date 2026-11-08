import { useId, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends Omit<ComponentProps<'select'>, 'children'> {
  label: string
  options: readonly SelectOption[]
  errorMessage?: string
}

/** Native select with a visible label, styled like `Input` (Guía Visual pág. 5). */
export function Select({ label, options, errorMessage, id, required, className, ...props }: Readonly<SelectProps>) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  const errorId = `${selectId}-error`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className="text-small font-semibold text-ink">
        {label}
        {required && (
          <span aria-hidden="true" className="text-primary">
            {' *'}
          </span>
        )}
      </label>
      <select
        id={selectId}
        required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        className={cn(
          'h-11 w-full rounded-control border bg-surface px-3 text-body text-ink tablet:h-10',
          'focus:border-primary disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted',
          errorMessage ? 'border-error' : 'border-border',
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {errorMessage && (
        <p id={errorId} className="text-small text-error">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
