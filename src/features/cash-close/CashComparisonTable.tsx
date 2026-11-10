import { Badge } from '../../components/ui'
import { formatCurrency } from '../../lib/money'
import { describeDifference } from './closeView'

interface CashComparisonTableProps {
  expectedCash: number
  /** Cash typed by the user, or `undefined` while the field is empty. */
  physicalCash: number | undefined
  /** Difference `physicalCash - expectedCash`, or `null` while there is nothing to compare. */
  difference: number | null
  /** "Monto físico declarado" (own close, PMC-23) or "Monto físico auditado" (audit, PMC-31). */
  physicalLabel: string
  emptyHint?: string
}

/** Real-time comparison of the system cash against the physical count (PMC-23 AC4 and PMC-31 AC4). */
export function CashComparisonTable({
  expectedCash,
  physicalCash,
  difference,
  physicalLabel,
  emptyHint = 'Ingresa el efectivo contado',
}: Readonly<CashComparisonTableProps>) {
  const view = difference === null ? null : describeDifference(difference)

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-left">
        <caption className="sr-only">Validación del efectivo en caja</caption>
        <thead>
          <tr className="border-b border-border text-caption font-semibold tracking-wide text-muted uppercase">
            <th scope="col" className="py-3 pr-4">Concepto de validación</th>
            <th scope="col" className="py-3 pr-4">Monto sistema</th>
            <th scope="col" className="py-3 pr-4">{physicalLabel}</th>
            <th scope="col" className="py-3 text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th scope="row" className="py-4 pr-4 text-body font-semibold text-ink">Total Efectivo en Caja</th>
            <td className="py-4 pr-4 text-body">{formatCurrency(expectedCash)}</td>
            <td className="py-4 pr-4 text-body font-semibold text-ink">
              {typeof physicalCash === 'number' && Number.isFinite(physicalCash) ? formatCurrency(physicalCash) : '—'}
            </td>
            <td className="py-4 text-right">
              {view ? (
                <Badge variant={view.variant} withDot>
                  {view.label}
                </Badge>
              ) : (
                <span className="text-small text-muted">{emptyHint}</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
