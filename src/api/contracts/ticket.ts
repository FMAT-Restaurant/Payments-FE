/** Thermal ticket of PMC-21 / PMC-25 (`GET /api/v1/payments/{folio}/ticket`). Models in English, payload in snake_case. */
export interface TicketItemDTO {
  quantity: number
  dish_name: string
  unit_price: number
  amount: number
}

export interface TicketPaymentDTO {
  payment_method: string
  amount: number
  authorization_reference?: string | null
}

export interface TicketReceiptDTO {
  header: {
    restaurant_name: string
    folio: string
    /** ISO-8601 */
    payment_date: string
    table_name: string
    cashier_name: string
  }
  items: TicketItemDTO[]
  totals: {
    subtotal: number
    taxes: number
    tip: number
    total: number
    payments: TicketPaymentDTO[]
    change_given: number
  }
}

/** Wire shape of Payments-BE: flat, without the `header` and `totals` blocks. */
export interface TicketReceiptWire {
  restaurant_name: string
  folio: string
  /** ISO-8601 */
  paid_at: string
  table_name?: string | null
  cashier_name?: string | null
  items: TicketItemDTO[]
  subtotal: number
  taxes: number
  tip: number
  total: number
  change_given: number
  payments: Array<{ method: string; amount: number; authorization_reference?: string | null }>
}
