import { httpClient } from './client'
import { fromWireMethod } from './contracts/charge'
import type { TicketReceiptDTO, TicketReceiptWire } from './contracts/ticket'
import { endpoints } from './endpoints'

export const toTicketReceipt = (wire: TicketReceiptWire): TicketReceiptDTO => ({
  header: {
    restaurant_name: wire.restaurant_name,
    folio: wire.folio,
    payment_date: wire.paid_at,
    table_name: wire.table_name ?? '',
    cashier_name: wire.cashier_name ?? '',
  },
  items: wire.items,
  totals: {
    subtotal: wire.subtotal,
    taxes: wire.taxes,
    tip: wire.tip,
    total: wire.total,
    change_given: wire.change_given,
    payments: wire.payments.map((payment) => ({
      payment_method: fromWireMethod(payment.method),
      amount: payment.amount,
      authorization_reference: payment.authorization_reference ?? null,
    })),
  },
})

/** PMC-21 / PMC-25: receipt of a completed charge. The screen shows its own error and retry. */
export async function getTicket(folio: string): Promise<TicketReceiptDTO> {
  const { data } = await httpClient.get<TicketReceiptWire>(endpoints.ticket(folio), { skipErrorToast: true })
  return toTicketReceipt(data)
}
