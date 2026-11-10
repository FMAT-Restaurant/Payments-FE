import { httpClient } from './client'
import { fromWireMethod } from './contracts/charge'
import type {
  SalesExportQuery,
  SalesHistoryItemDTO,
  SalesHistoryItemWire,
  SalesHistoryPageDTO,
  SalesHistoryPageWire,
  SalesHistoryQuery,
} from './contracts/sales'
import { endpoints } from './endpoints'

export const MIXED_PAYMENT_METHOD = 'MIXED'

/**
 * The story shows `page_index=0` but the Backend validates `page_index > 0`: the UI keeps the
 * 0-based index of the story and this mapper shifts it. Remove it if the Backend aligns to 0.
 */
export const toWirePageIndex = (pageIndex: number): number => pageIndex + 1

export function toSalesHistoryPage(wire: SalesHistoryPageWire): SalesHistoryPageDTO {
  return {
    page_index: wire.page_index - 1,
    page_size: wire.page_size,
    total_count: wire.total_count,
    total_pages: wire.total_pages,
    data: wire.data.map(
      (row): SalesHistoryItemDTO => ({
        folio: row.folio,
        total: row.total,
        status: 'COMPLETED',
        paid_at: row.paid_at,
        payment_method: historyPaymentMethod(row.payment_breakdowns),
      }),
    ),
  }
}

/** One method for the "Método de pago" column: the method itself, or MIXED when the sale was split. */
export function historyPaymentMethod(breakdowns: SalesHistoryItemWire['payment_breakdowns']): string | null {
  const methods = [...new Set(breakdowns.map((payment) => fromWireMethod(payment.method)))]
  if (methods.length === 0) return null
  return methods.length === 1 ? methods[0] : MIXED_PAYMENT_METHOD
}

/** PMC-24 AC4: paginated history. The screen renders its own error state, so no toast per request. */
export async function getSalesHistory(query: SalesHistoryQuery, signal?: AbortSignal): Promise<SalesHistoryPageDTO> {
  const { data } = await httpClient.get<SalesHistoryPageWire>(endpoints.salesHistory(), {
    params: { ...query, page_index: toWirePageIndex(query.page_index) },
    skipErrorToast: true,
    signal,
  })
  return toSalesHistoryPage(data)
}

export interface SalesExportFile {
  blob: Blob
  /** Raw `Content-Disposition` header, when the Backend exposes it through CORS. */
  contentDisposition: string | null
}

/** PMC-24 AC5 (Administrador only): CSV as a blob. */
export async function exportSales(query: SalesExportQuery): Promise<SalesExportFile> {
  const response = await httpClient.get<Blob>(endpoints.salesExport(), { params: query, responseType: 'blob' })
  const header = response.headers['content-disposition']
  return { blob: response.data, contentDisposition: typeof header === 'string' ? header : null }
}
