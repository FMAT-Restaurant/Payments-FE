import type { PaymentMethodType } from '../../api/contracts/charge'
import type { TicketPaymentDTO, TicketReceiptDTO } from '../../api/contracts/ticket'
import { formatCurrency, roundMoney } from '../../lib/money'
import { PAYMENT_METHOD_LABELS } from '../charge/paymentMethods'

const isCash = (payment: TicketPaymentDTO) => payment.payment_method === 'CASH'

/** Label of a payment line on the receipt: "Efectivo recibido" or "Tarjeta de Crédito (AUTH-987654)". */
export function ticketPaymentLabel(payment: TicketPaymentDTO): string {
  if (isCash(payment)) return 'Efectivo recibido'
  const label = PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethodType] ?? payment.payment_method
  return payment.authorization_reference ? `${label} (${payment.authorization_reference})` : label
}

/**
 * Explains how the change was produced, as in the post-charge mock:
 * "Pagado: $173.47 Efectivo ($200.00 recibidos) + $100.00 Tarjeta".
 */
export function describePaidAmounts(ticket: TicketReceiptDTO): string {
  const { payments, change_given: change } = ticket.totals
  const cashReceived = roundMoney(payments.filter(isCash).reduce((sum, p) => sum + p.amount, 0))
  const cards = roundMoney(payments.filter((p) => !isCash(p)).reduce((sum, p) => sum + p.amount, 0))

  const parts: string[] = []
  if (cashReceived > 0) {
    const applied = roundMoney(cashReceived - change)
    parts.push(
      change > 0
        ? `${formatCurrency(applied)} Efectivo (${formatCurrency(cashReceived)} recibidos)`
        : `${formatCurrency(applied)} Efectivo`,
    )
  }
  if (cards > 0) parts.push(`${formatCurrency(cards)} Tarjeta`)
  return `Pagado: ${parts.join(' + ')}`
}
