import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Empty / informative state: says what happened and what can be done next (Guía Visual pág. 9). */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 px-4 py-12 text-center', className)}>
      <p className="text-h3 text-ink">{title}</p>
      {description && <p className="max-w-md text-small text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
