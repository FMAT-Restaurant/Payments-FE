import { Link } from 'react-router'
import type { OpenCashShiftItemDTO } from '../../api/contracts/cashShift'
import { supervisionDetailPath } from '../../app/routes'
import { Badge, Card } from '../../components/ui'
import { formatLongDateTime } from '../../lib/dates'
import { shortId } from '../../lib/displayNames'
import { formatCurrency } from '../../lib/money'

/** PMC-31 AC2: card of an open shift with the secondary action to audit and force-close it. */
export function OpenShiftCard({ shift }: Readonly<{ shift: OpenCashShiftItemDTO }>) {
  const nameId = `open-shift-${shift.cash_shift_id}`

  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id={nameId} className="text-h3 text-ink">
            {shift.cashier_name}
          </h2>
          <p className="text-small text-muted" title={shift.cash_shift_id}>
            ID Turno: #{shortId(shift.cash_shift_id)}
          </p>
        </div>
        <Badge variant="success" withDot>
          Abierto
        </Badge>
      </div>

      <div>
        <p className="text-small text-muted">Apertura</p>
        <p className="text-body font-semibold text-ink">{formatLongDateTime(shift.opened_at)} hrs</p>
      </div>

      <div className="flex items-center justify-between rounded-control bg-canvas px-4 py-3">
        <span className="text-small text-muted">Fondo declarado</span>
        <span className="text-body font-semibold text-ink">{formatCurrency(shift.opening_float)}</span>
      </div>

      <Link
        to={supervisionDetailPath(shift.cash_shift_id)}
        aria-describedby={nameId}
        className="relative mt-auto inline-flex h-12 items-center justify-center rounded-control border border-primary bg-surface px-6 text-body font-semibold text-primary transition-colors hover:bg-primary-soft"
      >
        Ver arqueo y forzar cierre
      </Link>
    </Card>
  )
}
