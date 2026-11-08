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
