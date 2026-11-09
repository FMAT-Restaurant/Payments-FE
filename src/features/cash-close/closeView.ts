import type { BadgeVariant } from '../../components/ui'
import { formatCurrency, roundMoney } from '../../lib/money'

export type DifferenceKind = 'exact' | 'shortage' | 'surplus'

export interface DifferenceView {
  kind: DifferenceKind
  variant: BadgeVariant
  /** "$0.00 (Cuadre Exacto)", "-$100.00 (Faltante - Descuadre)" or "+$50.00 (Sobrante - Descuadre)". */
  label: string
}

/** PMC-23 AC4: `declared_cash - expected_cash`, rounded to cents so floating point never shows -$0.00. */
export const cashDifference = (declared: number, expected: number): number => roundMoney(declared - expected)

export function describeDifference(difference: number): DifferenceView {
  if (difference === 0) return { kind: 'exact', variant: 'success', label: `${formatCurrency(0)} (Cuadre Exacto)` }
  if (difference < 0) {
    return { kind: 'shortage', variant: 'error', label: `${formatCurrency(difference)} (Faltante - Descuadre)` }
  }
  return { kind: 'surplus', variant: 'warning', label: `+${formatCurrency(difference)} (Sobrante - Descuadre)` }
}

export const formatTransactions = (count: number): string =>
  `${count} ${count === 1 ? 'transacción' : 'transacciones'} con voucher registrado`
