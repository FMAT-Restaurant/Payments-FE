import { httpClient } from './client'
import { fromWireMethod } from './contracts/charge'
import type { TransactionDetailDTO, TransactionDetailWire } from './contracts/sales'
import { endpoints } from './endpoints'

/** Maps the Backend detail to the contract of PMC-25: only the payment method changes its name and language. */
export function toTransactionDetail(wire: TransactionDetailWire): TransactionDetailDTO {
  return {
    id: wire.folio,
    folio: wire.folio,
    paid_at: wire.paid_at,
    status: 'COMPLETED',
    subtotal: wire.subtotal,
    taxes: wire.taxes,
    tip: wire.tip,
    total: wire.total,
    change_given: wire.change_given,
    items: wire.items,
    payment_breakdowns: wire.payment_breakdowns.map((payment) => ({
      payment_method: fromWireMethod(payment.method),
      amount: payment.amount,
      authorization_reference: payment.authorization_reference ?? null,
    })),
  }
}

/** PMC-25 AC1. The modal renders its own error and retry, so no toast per request. */
export async function getTransactionDetail(folio: string, signal?: AbortSignal): Promise<TransactionDetailDTO> {
  const { data } = await httpClient.get<TransactionDetailWire>(endpoints.transactionDetail(folio), {
    skipErrorToast: true,
    signal,
  })
  return toTransactionDetail(data)
}
