import { Link, useLocation } from 'react-router'
import type { SalesHistoryItemDTO } from '../../api/contracts/sales'
import { salesDetailPath } from '../../app/routes'
import { Badge } from '../../components/ui'
import { formatLongDateTime } from '../../lib/dates'
import { formatCurrency } from '../../lib/money'
import { folioLabel, paymentMethodLabel } from './paymentLabel'

const HEADERS = ['Folio', 'Fecha y hora', 'Total cobrado', 'Método de pago', 'Estado', 'Acciones'] as const

/**
 * PMC-24 AC3. A single table: from 768px it is a regular table and below it each row becomes a compact
 * card (Guía Visual pág. 8) using only CSS, so the content is never duplicated in the DOM.
 */
export function SalesTable({ rows }: Readonly<{ rows: readonly SalesHistoryItemDTO[] }>) {
  const { search } = useLocation()

  return (
    <table className="block w-full text-left tablet:table">
      <thead className="sr-only tablet:not-sr-only tablet:table-header-group">
        <tr className="border-b border-border text-caption font-semibold tracking-wide text-muted uppercase">
          {HEADERS.map((header, index) => (
            <th key={header} scope="col" className={`px-6 py-4 ${index === HEADERS.length - 1 ? 'text-right' : ''}`}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block tablet:table-row-group">
        {rows.map((row) => (
          <tr
            key={row.folio}
            className="mb-3 block rounded-card border border-border p-4 tablet:mb-0 tablet:table-row tablet:rounded-none tablet:border-0 tablet:border-b tablet:p-0"
          >
            <Cell label="Folio" className="font-bold text-ink">
              {folioLabel(row.folio)}
            </Cell>
            <Cell label="Fecha y hora">{formatLongDateTime(row.paid_at)}</Cell>
            <Cell label="Total cobrado" className="font-bold text-ink">
              {formatCurrency(row.total)}
            </Cell>
            <Cell label="Método de pago">{paymentMethodLabel(row.payment_method)}</Cell>
            <Cell label="Estado">
              <Badge variant="success" withDot>
                Completado
              </Badge>
            </Cell>
            <Cell label="Acciones" className="tablet:text-right">
              <Link
                to={salesDetailPath(row.folio, search)}
                aria-label={`Ver detalle de ${folioLabel(row.folio)}`}
                className="inline-flex min-h-11 items-center rounded-control px-2 text-small font-semibold text-primary hover:text-primary-hover"
              >
                Ver detalle
              </Link>
            </Cell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Cell({ label, className = '', children }: Readonly<{ label: string; className?: string; children: React.ReactNode }>) {
  return (
    <td
      data-label={label}
      className={`flex items-center justify-between gap-4 py-1 text-body before:text-small before:text-muted before:content-[attr(data-label)] tablet:table-cell tablet:px-6 tablet:py-5 tablet:before:hidden ${className}`}
    >
      {children}
    </td>
  )
}
