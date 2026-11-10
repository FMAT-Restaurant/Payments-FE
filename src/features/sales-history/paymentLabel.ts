import type { PaymentMethodType } from '../../api/contracts/charge'
import { MIXED_PAYMENT_METHOD } from '../../api/sales'
import { PAYMENT_METHOD_LABELS } from '../charge/paymentMethods'

const isKnownMethod = (value: string): value is PaymentMethodType => value in PAYMENT_METHOD_LABELS

/** Column "Método de pago". A sale without payments shows "—"; a split one shows "Mixto". */
export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—'
  if (method === MIXED_PAYMENT_METHOD) return 'Mixto'
  return isKnownMethod(method) ? PAYMENT_METHOD_LABELS[method] : method
}

/** "#TX-20260908-000001" (the Backend sends the folio without "#"). */
export const folioLabel = (folio: string): string => `#${folio.replace(/^#/, '')}`
