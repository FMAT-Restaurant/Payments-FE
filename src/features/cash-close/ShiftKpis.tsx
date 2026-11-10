import type { CashShiftSummaryDTO } from '../../api/contracts/cashShift'
import { PageGrid } from '../../components/layout/ModuleLayout'
import { Badge, Card } from '../../components/ui'
import { formatCurrency } from '../../lib/money'
import { formatTransactions } from './closeView'

function KpiCard({ label, value, caption, aside }: Readonly<{ label: string; value: number; caption: string; aside?: string }>) {
  return (
    <Card className="col-span-4 flex flex-col gap-2 desktop:col-span-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-caption font-semibold tracking-wide text-muted uppercase">{label}</h2>
        {aside && <Badge variant="selected">{aside}</Badge>}
      </div>
      <p className="text-h1 text-ink">{formatCurrency(value)}</p>
      <p className="text-small text-muted">{caption}</p>
    </Card>
  )
}

/**
 * KPIs of a shift reconciliation (PMC-23 AC2 and PMC-31 AC3). Shared so the cashier's own close and the
 * supervisor's audit always show the same numbers. "Propinas Retenidas" only renders when the summary carries it.
 */
export function ShiftKpis({ summary }: Readonly<{ summary: CashShiftSummaryDTO }>) {
  return (
    <PageGrid>
      <KpiCard
        label="Fondo + Ventas Efectivo"
        value={summary.expected_cash}
        caption={`Fondo inicial: ${formatCurrency(summary.initial_amount)} + Cobros efectivo: ${formatCurrency(summary.cash_sales)}`}
      />
      <KpiCard
        label="Cobros con Tarjeta"
        value={summary.card_sales}
        caption={formatTransactions(summary.card_transaction_count)}
      />
      {typeof summary.retained_tips === 'number' && (
        <KpiCard
          label="Propinas Retenidas"
          value={summary.retained_tips}
          caption="Acumulado en cobros con terminal"
          aside="Pago a meseros"
        />
      )}
    </PageGrid>
  )
}
