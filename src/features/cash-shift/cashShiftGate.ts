import { createStore, useStore } from '../../lib/createStore'

/**
 * Signals that the current user needs an open cash shift (403 CASH_SHIFT_NOT_OPEN, PMC-18 AC5).
 * The "Apertura de Turno de Caja" modal of PMC-22 subscribes to this gate.
 */
export const cashShiftGate = createStore({ openingRequired: false })

export const requireCashShiftOpening = (): void => cashShiftGate.setState({ openingRequired: true })

export const resolveCashShiftOpening = (): void => cashShiftGate.setState({ openingRequired: false })

export const useCashShiftGate = () => useStore(cashShiftGate)
