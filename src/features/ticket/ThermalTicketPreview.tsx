import type { Ref } from 'react'
import type { TicketReceiptDTO } from '../../api/contracts/ticket'
import { cn } from '../../lib/cn'
import { formatDateTime } from '../../lib/dates'
import { formatCurrency } from '../../lib/money'
import { ticketPaymentLabel } from './ticketSummary'

interface ThermalTicketPreviewProps {
  ticket: TicketReceiptDTO
  /** Node handed to react-to-print: only this element is printed. */
  ref?: Ref<HTMLElement>
  className?: string
}

function Line({ label, value, strong }: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <div className={cn('flex justify-between gap-3', strong ? 'text-body font-bold text-ink' : 'text-text')}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  )
}

const taxLabel = (subtotal: number, taxes: number): string => {
  const rate = subtotal > 0 ? Math.round((taxes / subtotal) * 10000) / 100 : 0
  return Number.isInteger(rate) && rate > 0 ? `IVA (${rate}%)` : 'IVA'
}

/**
 * 80 mm thermal receipt (PMC-21 AC2, Guía Visual pág. 10 "Cuenta / recibo").
 * Reused by the sale detail reprint of PMC-25.
 */
export function ThermalTicketPreview({ ticket, ref, className }: Readonly<ThermalTicketPreviewProps>) {
  const { header, items, totals } = ticket

  return (
    <article
      ref={ref}
      aria-label={`Ticket ${header.folio}`}
      className={cn(
        'thermal-ticket mx-auto w-full max-w-[80mm] rounded-card border border-dashed border-muted bg-white p-5 text-small text-text',
        'print:max-w-none print:rounded-none print:border-0 print:p-[4mm]',
        className,
      )}
    >
      <header className="text-center">
        <p className="text-body font-bold text-ink">{header.restaurant_name}</p>
        <p className="text-caption text-muted">Folio: {header.folio}</p>
        <p className="text-caption text-muted">
          {header.table_name} • {formatDateTime(header.payment_date)}
        </p>
        <p className="text-caption text-muted">Cajero: {header.cashier_name}</p>
      </header>

      <hr className="my-3 border-t border-dashed border-border print:border-black" />

      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={`${item.dish_name}-${index}`} className="flex justify-between gap-3 text-ink">
            <span>
              {item.quantity} x {item.dish_name}
            </span>
            <span className="font-semibold tabular-nums">{formatCurrency(item.amount)}</span>
          </li>
        ))}
      </ul>

      <hr className="my-3 border-t border-dashed border-border print:border-black" />

      <dl className="flex flex-col gap-1.5">
        <Line label="Subtotal" value={formatCurrency(totals.subtotal)} />
        <Line label={taxLabel(totals.subtotal, totals.taxes)} value={formatCurrency(totals.taxes)} />
        <Line label="Propina" value={formatCurrency(totals.tip)} />
        <Line label="Total" value={formatCurrency(totals.total)} strong />
      </dl>

      <hr className="my-3 border-t border-dashed border-border print:border-black" />

      <dl className="flex flex-col gap-1 text-caption">
        {totals.payments.map((payment, index) => (
          <div key={`${payment.payment_method}-${index}`} className="flex justify-between gap-3 text-muted">
            <dt>{ticketPaymentLabel(payment)}</dt>
            <dd className="tabular-nums">{formatCurrency(payment.amount)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-3 font-bold text-ink">
          <dt>Cambio entregado</dt>
          <dd className="tabular-nums">{formatCurrency(totals.change_given)}</dd>
        </div>
      </dl>
    </article>
  )
}
