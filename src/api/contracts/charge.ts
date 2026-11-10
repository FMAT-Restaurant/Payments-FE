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

/** Payments-BE sends the methods in Spanish; the UI keeps the English codes above. */
export const PAYMENT_METHOD_WIRE = {
  CASH: 'EFECTIVO',
  CREDIT_CARD: 'TARJETA_CREDITO',
  DEBIT_CARD: 'TARJETA_DEBITO',
} as const satisfies Record<PaymentMethodType, string>

export type PaymentMethodWire = (typeof PAYMENT_METHOD_WIRE)[PaymentMethodType]

const METHOD_FROM_WIRE = Object.fromEntries(
  Object.entries(PAYMENT_METHOD_WIRE).map(([code, wire]) => [wire, code]),
) as Record<string, PaymentMethodType>

/** Unknown methods pass through unchanged, so the labels fall back to the raw value. */
export const fromWireMethod = (method: string): string => METHOD_FROM_WIRE[method] ?? method

export interface ChargeRequestWire {
  dinning_session_id: string
  tip: number
  payments: Array<{ method: PaymentMethodWire; amount: number; authorization_reference: string | null }>
}

/** The charge response keeps `estado` and `mensaje` in Spanish. */
export interface ChargeResponseWire {
  folio: string
  total: number
  change_given: number
  estado: string
  mensaje: string
}
