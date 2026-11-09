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
  retained_tips: number
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
