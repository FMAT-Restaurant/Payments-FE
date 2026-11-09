/** Sales history and CSV export (PMC-24). Models in English, payload in snake_case. */

/** Query of `GET /api/v1/payments`. The UI works with a 0-based `page_index`, as the story writes it. */
export interface SalesHistoryQuery {
  /** ISO-8601, start of the first day (inclusive). */
  start_date?: string
  /** ISO-8601, 00:00 of the day AFTER the last chosen day (exclusive). */
  end_date?: string
  page_index: number
  page_size: number
}

export interface SalesHistoryItemDTO {
  folio: string
  total: number
  /** The history only lists successfully processed payments. */
  status: 'COMPLETED'
  /** ISO-8601 */
  paid_at: string
  /** The Backend does not send it yet; the table shows "—" when it is missing. */
  payment_method?: string | null
}

export interface SalesHistoryPageDTO {
  /** 0-based, like the query. */
  page_index: number
  page_size: number
  total_count: number
  total_pages: number
  data: SalesHistoryItemDTO[]
}

/** Query of `GET /api/v1/payments/export`; same date convention as the history. */
export interface SalesExportQuery {
  start_date: string
  end_date: string
}

/** Wire shapes of Payments-BE (`qa`), kept apart so the screens only know the contract of the story. */
export interface SalesHistoryItemWire {
  folio: string
  total: number
  estado: string
  fecha_cobro: string
  metodo_pago?: string | null
}

export interface SalesHistoryPageWire {
  /** 1-based: the Backend validates `page_index > 0`. */
  page_index: number
  page_size: number
  total_count: number
  total_pages: number
  data: SalesHistoryItemWire[]
}

/** Immutable sale detail (PMC-25), `GET /api/v1/payments/{folio}`. Models in English, payload in snake_case. */
export interface TransactionDetailDTO {
  id: string
  folio: string
  /** ISO-8601; empty when the Backend does not send it yet. */
  paid_at: string
  status: 'COMPLETED'
  subtotal: number
  taxes: number
  tip: number
  total: number
  change_given: number
  items: Array<{
    dish_id?: string
    dish_name: string
    quantity: number
    unit_price: number
    amount: number
  }>
  payment_breakdowns: Array<{
    payment_method: string
    amount: number
    authorization_reference?: string | null
  }>
}

/** Wire shape of PMC-11 in Payments-BE; the optional fields are the ones the PO agreed to add. */
export interface TransactionDetailWire {
  folio: string
  total: number
  estado: string
  fecha_cobro?: string
  subtotal?: number
  impuestos?: number
  propina?: number
  cambio_entregado?: number
  turno_caja_id?: string
  dinning_session_id?: string
  detalles: Array<{ nombre_platillo: string; cantidad: number; precio_unitario: number; importe: number }>
  desgloses: Array<{ metodo_pago: string; monto: number; referencia_autorizacion?: string | null }>
}
