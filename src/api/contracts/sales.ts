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
