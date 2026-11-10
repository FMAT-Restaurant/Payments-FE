/**
 * Cash shift opening (PMC-22). Models in English, payload in snake_case.
 * The story fixes the request (`initial_amount`) but not the response of `GET /cash-shifts/me`;
 * `CashShiftDTO` follows the names of the cash shift summary of PMC-23.
 */
export interface OpenCashShiftRequestDTO {
  initial_amount: number
}

export interface OpenCashShiftResponseDTO {
  cash_shift_id: string
  status: string
  message: string
}

export interface CashShiftDTO {
  cash_shift_id: string
  cashier_name?: string | null
  /** ISO-8601 */
  opened_at: string
  initial_amount: number
}

/** Real-time reconciliation of the open shift (PMC-23). Models in English, payload in snake_case. */
export interface CashShiftSummaryDTO {
  cash_shift_id: string
  cashier_name?: string | null
  /** ISO-8601 */
  opened_at: string
  initial_amount: number
  cash_sales: number
  /** initial_amount + cash_sales (includes the tip paid in cash). */
  expected_cash: number
  card_sales: number
  card_transaction_count: number
  /** PMC-23 AC2 shows it; the Backend summary does not return it yet, so the KPI renders only when present. */
  retained_tips?: number
}

export interface CloseCashShiftRequestDTO {
  declared_cash: number
  /** Required by the Backend when `declared_cash` differs from `expected_cash`. */
  reason?: string
}

/** The story does not define the close response; the screen only needs the request to succeed. */
export interface CloseCashShiftResponseDTO {
  cash_shift_id?: string
  status?: string
  difference?: number
  message?: string
}

/** PMC-31 AC2: row of `GET /cash-shifts/open`. Cashier names come from the shift (PMC-8), never from the JWT of the viewer. */
export interface OpenCashShiftItemDTO {
  cash_shift_id: string
  cashier_name: string
  /** ISO-8601 */
  opened_at: string
  opening_float: number
}

/** PMC-31 AC5: body of `POST /cash-shifts/{cash_shift_id}/force-close`. */
export interface ForceCloseCashShiftRequestDTO {
  declared_cash: number
  /** Mandatory audit reason. */
  force_close_reason: string
}

/** The story does not define the response; the screen only needs the request to succeed. */
export interface ForceCloseCashShiftResponseDTO {
  cash_shift_id?: string
  status?: string
  difference?: number
  message?: string
}

/** Wire shapes of Payments-BE: the fund travels as `opening_float`; the summary has no `cash_sales`. */
export interface OpenCashShiftRequestWire {
  opening_float: number
}

export interface CashShiftWire extends Omit<CashShiftDTO, 'initial_amount'> {
  opening_float: number
}

export interface CashShiftSummaryWire extends Omit<CashShiftSummaryDTO, 'initial_amount' | 'cash_sales' | 'card_sales'> {
  opening_float: number
  card_total: number
  status?: string
  calculated_at?: string
}
