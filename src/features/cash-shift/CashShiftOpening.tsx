import { lazy, Suspense } from 'react'
import { useMatches } from 'react-router'
import type { RouteHandle } from '../../app/routes'
import { useCashShiftGate } from './cashShiftGate'
import { useMyCashShift } from './useMyCashShift'

// The form (zod, react-hook-form) only downloads when the modal is needed.
const CashShiftOpeningModal = lazy(async () => ({ default: (await import('./CashShiftOpeningModal')).CashShiftOpeningModal }))

/**
 * Decides when the opening modal blocks the screen (PMC-22):
 * - AC1: on routes marked `requiresCashShift` (Bandeja de Caja) when `GET /cash-shifts/me` answers 404.
 * - AC5: anywhere, when an operation answered 403 CASH_SHIFT_NOT_OPEN (the interceptor opens the gate).
 */
export function CashShiftOpening() {
  const requiresShift = useMatches().some((match) => (match.handle as RouteHandle | undefined)?.requiresCashShift)
  const { openingRequired } = useCashShiftGate()
  const { state } = useMyCashShift(requiresShift)

  const open = openingRequired || (requiresShift && state === 'closed')
  return open ? (
    <Suspense fallback={null}>
      <CashShiftOpeningModal />
    </Suspense>
  ) : null
}
