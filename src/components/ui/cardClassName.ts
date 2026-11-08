import { cn } from '../../lib/cn'

export type CardPadding = 'none' | 'sm' | 'md' | 'lg'

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

/** White card, thin border, 12px radius, no colored side stripes (Guía Visual pág. 6). */
export const cardClassName = (padding: CardPadding = 'md', interactive = false): string =>
  cn(
    'rounded-card border border-border bg-surface shadow-card',
    paddingClasses[padding],
    interactive && 'transition-colors hover:border-primary hover:bg-primary-soft/40',
  )
