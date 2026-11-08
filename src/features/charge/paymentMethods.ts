import type { PaymentMethodType } from '../../api/contracts/charge'

/** Spanish labels of the payment methods, shared by the charge form and the receipts. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  CASH: 'Efectivo',
  CREDIT_CARD: 'Tarjeta de Crédito',
  DEBIT_CARD: 'Tarjeta de Débito',
}
