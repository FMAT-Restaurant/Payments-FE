import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'tertiary' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant
  /** SM 32px, MD 40px, LG 48px. */
  size?: ButtonSize
  /** Shows a spinner and blocks clicks to prevent double submissions. */
  isLoading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-primary bg-surface text-primary hover:bg-primary-soft',
  neutral: 'border border-border bg-surface text-ink hover:bg-canvas',
  tertiary: 'bg-transparent text-text hover:bg-canvas hover:text-ink',
  destructive: 'bg-error text-white hover:brightness-90',
}

const sizeClasses: Record<ButtonSize, string> = {
  // SM keeps a 32px look but grows its hit area to 44px (touch target).
  sm: "h-8 px-3 text-small before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']",
  md: 'h-10 px-4 text-small',
  lg: 'h-12 px-6 text-body',
}

/** Button of the Guía Visual: one primary action per block, verb + object labels. */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner /> : leftIcon}
      {children}
    </button>
  )
}
