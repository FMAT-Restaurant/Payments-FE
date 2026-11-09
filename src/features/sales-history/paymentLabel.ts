import type { PaymentMethodType } from '../../api/contracts/charge'
import { PAYMENT_METHOD_LABELS } from '../charge/paymentMethods'

const isKnownMethod = (value: string): value is PaymentMethodType => value in PAYMENT_METHOD_LABELS

/** Column "Método de pago". The Backend does not send it yet, so a missing value shows "—". */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  return isKnownMethod(method) ? PAYMENT_METHOD_LABELS[method] : method
}

/** "#TX-20260908-000001" (the Backend sends the folio without "#"). */
export const folioLabel = (folio: string): string => `#${folio.replace(/^#/, '')}`
