import type { SalesHistoryItemWire, TransactionDetailWire } from '../../api/contracts/sales'
import type { TicketReceiptWire } from '../../api/contracts/ticket'
import { roundMoney } from '../../lib/money'

const DISHES = ['Tacos al Pastor', 'Cochinita Pibil', 'Agua de Horchata', 'Flan Napolitano'] as const
const TAX_RATE = 0.16

/** Deterministic detail of a history row (PMC-25): items split the subtotal, payments cover the total. */
export function transactionDetailFixture(row: SalesHistoryItemWire): TransactionDetailWire {
  const total = roundMoney(row.total)
  const subtotal = roundMoney(total / (1 + TAX_RATE))
  const taxes = roundMoney(total - subtotal)
  const firstAmount = roundMoney(subtotal * 0.6)
  const items = [
    { dish_name: DISHES[0], quantity: 2, amount: firstAmount },
    { dish_name: DISHES[total > 300 ? 1 : 2], quantity: 1, amount: roundMoney(subtotal - firstAmount) },
  ].map((item) => ({ ...item, unit_price: roundMoney(item.amount / item.quantity) }))

  const isCardOnly = row.payment_breakdowns.every((payment) => payment.method !== 'EFECTIVO')
  const received = isCardOnly ? total : Math.ceil(total / 50) * 50
  return {
    folio: row.folio,
    status: 'COMPLETADO',
    paid_at: row.paid_at,
    subtotal,
    taxes,
    tip: 0,
    total,
    change_given: roundMoney(received - total),
    items,
    payment_breakdowns: isCardOnly
      ? [{ method: 'TARJETA_CREDITO', amount: total, authorization_reference: 'AUTH-987654' }]
      : [{ method: 'EFECTIVO', amount: received, authorization_reference: null }],
  }
}

export function ticketFixture(detail: TransactionDetailWire): TicketReceiptWire {
  return {
    restaurant_name: 'FMAT-RESTAURANT',
    folio: detail.folio,
    paid_at: detail.paid_at,
    table_name: 'Mesa 4',
    cashier_name: 'Edwing Molina',
    items: detail.items,
    subtotal: detail.subtotal,
    taxes: detail.taxes,
    tip: detail.tip,
    total: detail.total,
    change_given: detail.change_given,
    payments: detail.payment_breakdowns,
  }
}
