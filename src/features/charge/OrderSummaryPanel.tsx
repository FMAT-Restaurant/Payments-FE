import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'
import { cardClassName } from '../../components/ui'
import { cn } from '../../lib/cn'
import { displayTableName, displayWaiterName } from '../../lib/displayNames'
import { formatCurrency } from '../../lib/money'

interface OrderSummaryPanelProps {
  account: PendingAccountCardDTO
  tip: number
  tipLabel: string
  amountDue: number
}

const taxRateLabel = (subtotal: number, taxes: number): string => {
  const rate = subtotal > 0 ? (taxes / subtotal) * 100 : 0
  return Number.isInteger(Math.round(rate * 100) / 100) ? `IVA (${rate.toFixed(0)}%)` : 'IVA'
}

function SummaryRow({ label, value, emphasis }: Readonly<{ label: string; value: string; emphasis?: boolean }>) {
  return (
    <div className={cn('flex justify-between gap-4', emphasis ? 'font-semibold text-ink' : 'text-muted')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/** Left panel of "Procesar Pago": read-only order of the table (PMC-20 AC1). */
export function OrderSummaryPanel({ account, tip, tipLabel, amountDue }: Readonly<OrderSummaryPanelProps>) {
  const itemCount = account.items.reduce((sum, item) => sum + item.quantity, 0)
  const { subtotal, taxes, expected_total: consumptionTotal } = account.totals

  return (
    <section aria-label="Resumen de la comanda" className={cn(cardClassName('none'), 'flex flex-col overflow-hidden')}>
      <header className="flex items-start justify-between gap-3 bg-ink px-6 py-5 text-white">
        <div className="min-w-0">
          <h2 className="truncate text-h2">{displayTableName(account)}</h2>
          <p className="mt-1 text-small text-white/80">
            Mesero: {displayWaiterName(account)}
            <span aria-hidden="true"> • </span>
            {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-caption font-semibold">
          <span className="sr-only">Folio </span>
          {account.order_folio}
        </span>
      </header>

      <ul className="flex-1 divide-y divide-border px-6">
        {account.items.map((item) => (
          <li key={item.dish_id} className="flex justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {item.quantity}x {item.name}
              </p>
              {item.notes && <p className="text-caption text-muted">{item.notes}</p>}
            </div>
            <p className="shrink-0 font-semibold text-ink tabular-nums">{formatCurrency(item.amount)}</p>
          </li>
        ))}
      </ul>

      <dl className="flex flex-col gap-2 border-t border-border bg-canvas px-6 py-5 text-small">
        <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
        <SummaryRow label={taxRateLabel(subtotal, taxes)} value={formatCurrency(taxes)} />
        <SummaryRow label="Total de consumo" value={formatCurrency(consumptionTotal)} emphasis />
        <div className="flex justify-between gap-4 text-muted">
          <dt>{tipLabel}</dt>
          <dd className={cn('tabular-nums', tip > 0 && 'font-semibold text-primary')}>
            {tip > 0 ? `+${formatCurrency(tip)}` : formatCurrency(0)}
          </dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-border pt-4">
          <dt className="text-h3 text-ink">Total Cuenta</dt>
          <dd className="text-h2 text-ink tabular-nums">{formatCurrency(amountDue)}</dd>
        </div>
      </dl>
    </section>
  )
}
