/** Accounts ready to be charged (PMC-19 / PMC-20). Models in English, payload in snake_case. */
export interface PendingAccountItemDTO {
  dish_id: string
  name: string
  quantity: number
  unit_price: number
  amount: number
  notes?: string
}

export type PreAccountStatus = 'PRE_ACCOUNT_PRINTED' | 'ACCOUNT_REQUESTED'

export interface PendingAccountCardDTO {
  dinning_session_id: string
  /** e.g. "#ORD-9938" */
  order_folio: string
  /** e.g. "Mesa 04" | "Barra 02"; when missing, the UI shows the abbreviated session id. */
  table_name?: string | null
  /** e.g. "Carlos R."; when missing, the UI shows the abbreviated session id. */
  waiter_name?: string | null
  /** ISO-8601 */
  timestamp: string
  /** Payments-BE does not send it; the card hides the label when it is missing. */
  pre_account_status?: PreAccountStatus
  items: PendingAccountItemDTO[]
  totals: {
    subtotal: number
    taxes: number
    expected_total: number
  }
}

/** Wire shape of Payments-BE: flat totals and no pre-account status. */
export interface PendingAccountWire extends Omit<PendingAccountCardDTO, 'pre_account_status' | 'totals'> {
  subtotal: number
  taxes: number
  total: number
}
