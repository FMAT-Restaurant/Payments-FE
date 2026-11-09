/** Charge contract of PMC-20 (`POST /api/v1/payments/charge`). Models in English, payload in snake_case. */
export const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD'] as const

export type PaymentMethodType = (typeof PAYMENT_METHODS)[number]

export interface PaymentBreakdownRequestDTO {
  payment_method: PaymentMethodType
  /** Exact decimal with 2 positions. */
  amount: number
  /** Required unless the method is CASH. */
  authorization_reference: string | null
}

/** Only transactional data travels: dish snapshot and totals are read by the Backend from the session. */
export interface ChargeRequestDTO {
  dinning_session_id: string
  tip: number
  payments: PaymentBreakdownRequestDTO[]
}

export interface ChargeResponseDTO {
  /** e.g. "TX-20260929-002" */
  folio: string
  total: number
  change_delivered: number
  status: 'COMPLETED'
  message: string
}
