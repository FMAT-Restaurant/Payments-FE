import { cn } from '../../lib/cn'

const spinnerClasses = 'inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent'

/** Loading indicator. Without `label` it is decorative (e.g. inside a button that already has `aria-busy`). */
export function Spinner({ className, label }: Readonly<{ className?: string; label?: string }>) {
  if (label) {
    return <output aria-label={label} className={cn(spinnerClasses, className)} />
  }
  return <span aria-hidden="true" className={cn(spinnerClasses, className)} />
}
