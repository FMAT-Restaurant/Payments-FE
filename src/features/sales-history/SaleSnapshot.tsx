import type { TransactionDetailDTO } from '../../api/contracts/sales'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/money'
import { ticketPaymentLabel } from '../ticket/ticketSummary'

function SummaryLine({ label, value, strong }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div className={cn('flex justify-between gap-3', strong ? 'text-h3 font-bold text-ink' : 'text-body text-text')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

/** PMC-25 AC3: two-column snapshot — charged items with the maths, and the payment breakdown. */
export function SaleSnapshot({ detail }: Readonly<{ detail: TransactionDetailDTO }>) {
  return (
    <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
      <section aria-labelledby="sale-items-title" className="flex flex-col gap-4 rounded-card border border-border p-5">
        <h3 id="sale-items-title" className="text-caption font-semibold tracking-wide text-muted uppercase">
          Artículos cobrados
        </h3>
        <ul className="flex flex-col gap-2">
          {detail.items.map((item, index) => (
            <li key={`${item.dish_name}-${index}`} className="flex justify-between gap-3 text-body text-ink">
              <span>
                {item.quantity} x {item.dish_name}
              </span>
              <span className="font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-border pt-4">
          <SummaryLine label="Subtotal" value={formatCurrency(detail.subtotal)} />
          <SummaryLine label="IVA" value={formatCurrency(detail.taxes)} />
          <SummaryLine label="Propina" value={formatCurrency(detail.tip)} />
          <SummaryLine label="Total" value={formatCurrency(detail.total)} strong />
          <SummaryLine label="Cambio entregado" value={formatCurrency(detail.change_given)} />
        </dl>
      </section>

      <section aria-labelledby="sale-payments-title" className="flex flex-col gap-4 rounded-card border border-border p-5">
        <h3 id="sale-payments-title" className="text-caption font-semibold tracking-wide text-muted uppercase">
          Desglose de pagos
        </h3>
        <ul className="flex flex-col gap-3">
          {detail.payment_breakdowns.map((payment, index) => (
            <li key={`${payment.payment_method}-${index}`} className="flex justify-between gap-3 text-body text-ink">
              <span>{ticketPaymentLabel({ ...payment, payment_method: payment.payment_method })}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(payment.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
