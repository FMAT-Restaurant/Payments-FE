import type { ComponentProps } from 'react'
import { Link, Outlet } from 'react-router'
import { CashShiftOpening } from '../../features/cash-shift/CashShiftOpening'
import { cn } from '../../lib/cn'

/**
 * Content area of the module inside the shared App Shell (PMC-18 AC2).
 * It renders no sidebar or topbar: those belong to the Shell and must not be duplicated.
 */
export function ModuleLayout() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 py-6 tablet:px-6 tablet:py-8 desktop:px-8">
      <Outlet />
      <CashShiftOpening />
    </main>
  )
}

/** Responsive grid: 4 columns on mobile, 8 on tablet (768-1199px), 12 on desktop (>=1200px). */
export function PageGrid({ className, ...props }: Readonly<ComponentProps<'div'>>) {
  return (
    <div className={cn('grid grid-cols-4 gap-4 tablet:grid-cols-8 tablet:gap-6 desktop:grid-cols-12', className)} {...props} />
  )
}

export function BackLink({ to, children }: Readonly<{ to: string; children: string }>) {
  return (
    <Link
      to={to}
      className="-mx-2 inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-small font-semibold text-muted hover:text-ink"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  )
}
