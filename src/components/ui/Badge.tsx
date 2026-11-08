import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export type BadgeVariant = 'neutral' | 'dark' | 'success' | 'warning' | 'error' | 'info' | 'selected'

const variantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-canvas text-text border-border',
  dark: 'bg-ink text-white border-ink',
  success: 'bg-success-soft text-success border-success/20',
  warning: 'bg-warning-soft text-warning border-warning/20',
  error: 'bg-error-soft text-error border-error/20',
  info: 'bg-info-soft text-info border-info/20',
  selected: 'bg-primary-soft text-primary border-primary/30',
}

export interface BadgeProps extends ComponentProps<'span'> {
  variant?: BadgeVariant
  /** Status dot before the text: states use color + text, never color alone. */
  withDot?: boolean
}

export function Badge({ variant = 'neutral', withDot = false, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {withDot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
