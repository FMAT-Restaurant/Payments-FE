import { inclusiveDays, parseDateInput } from '../../lib/dates'

export const PAGE_SIZE = 20
/** PMC-24 AC5: the range limit applies only when exporting, never when querying. */
export const MAX_EXPORT_DAYS = 31

export const RANGE_ORDER_MESSAGE = 'La fecha final no puede ser anterior a la inicial'
export const EXPORT_RANGE_MESSAGE = `El rango máximo de exportación es de ${MAX_EXPORT_DAYS} días`
export const EXPORT_MISSING_RANGE_MESSAGE = `Selecciona un rango de fechas para exportar (máximo ${MAX_EXPORT_DAYS} días)`

/** Filters that live in the URL, so the detail modal (PMC-25) can return to the same view. */
export interface HistoryFilters {
  /** "yyyy-MM-dd" or "". */
  start: string
  /** "yyyy-MM-dd" or "". */
  end: string
  /** 1-based, as shown in the URL and in the pagination. */
  page: number
}

const validDay = (value: string | null): string => (value && parseDateInput(value) ? value : '')

export function readFilters(params: URLSearchParams): HistoryFilters {
  const page = Number(params.get('page'))
  return {
    start: validDay(params.get('start')),
    end: validDay(params.get('end')),
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  }
}

/** Query string for the URL; empty values and page 1 are omitted to keep it short. */
export function toSearchParams({ start, end, page }: HistoryFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (start) params.set('start', start)
  if (end) params.set('end', end)
  if (page > 1) params.set('page', String(page))
  return params
}

/** Message when the end of the range is before its start; `null` when the range is usable. */
export function rangeOrderError(start: string, end: string): string | null {
  if (start && end && end < start) return RANGE_ORDER_MESSAGE
  return null
}

/** PMC-24 AC5: validation that runs only when the Administrador presses "Exportar CSV". */
export function exportRangeError(start: string, end: string): string | null {
  const days = start && end ? inclusiveDays(start, end) : null
  if (days === null) return EXPORT_MISSING_RANGE_MESSAGE
  return days > MAX_EXPORT_DAYS ? EXPORT_RANGE_MESSAGE : null
}

/** Pages to render: first, last and the neighbours of the current one, with `null` for the gaps. */
export function pageWindow(current: number, total: number): Array<number | null> {
  const wanted = new Set([1, total, current - 1, current, current + 1].filter((page) => page >= 1 && page <= total))
  const sorted = [...wanted].sort((a, b) => a - b)
  return sorted.flatMap((page, index) => (index > 0 && page - sorted[index - 1] > 1 ? [null, page] : [page]))
}

export const rangeSummary = (pageIndex: number, pageSize: number, rows: number, total: number): string =>
  `Mostrando ${pageIndex * pageSize + 1} a ${pageIndex * pageSize + rows} de ${total} transacciones`
