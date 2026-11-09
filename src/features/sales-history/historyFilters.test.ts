import { describe, expect, it } from 'vitest'
import {
  EXPORT_MISSING_RANGE_MESSAGE,
  EXPORT_RANGE_MESSAGE,
  RANGE_ORDER_MESSAGE,
  exportRangeError,
  pageWindow,
  rangeOrderError,
  rangeSummary,
  readFilters,
  toSearchParams,
} from './historyFilters'

describe('historyFilters', () => {
  it('reads valid filters from the URL and ignores invalid ones', () => {
    expect(readFilters(new URLSearchParams('start=2026-09-01&end=2026-09-08&page=3'))).toEqual({
      start: '2026-09-01',
      end: '2026-09-08',
      page: 3,
    })
    expect(readFilters(new URLSearchParams('start=nope&end=2026-13-40&page=-2'))).toEqual({ start: '', end: '', page: 1 })
    expect(readFilters(new URLSearchParams('page=1.5')).page).toBe(1)
  })

  it('writes only what differs from the defaults', () => {
    expect(toSearchParams({ start: '', end: '', page: 1 }).toString()).toBe('')
    expect(toSearchParams({ start: '2026-09-01', end: '2026-09-08', page: 2 }).toString()).toBe(
      'start=2026-09-01&end=2026-09-08&page=2',
    )
  })

  it('rejects a range whose end is before its start', () => {
    expect(rangeOrderError('2026-09-08', '2026-09-01')).toBe(RANGE_ORDER_MESSAGE)
    expect(rangeOrderError('2026-09-01', '2026-09-01')).toBeNull()
    expect(rangeOrderError('', '2026-09-01')).toBeNull()
  })

  it('AC5: allows exporting up to 31 days inclusive and nothing more', () => {
    expect(exportRangeError('2026-09-01', '2026-10-01')).toBeNull()
    expect(exportRangeError('2026-09-01', '2026-10-02')).toBe(EXPORT_RANGE_MESSAGE)
    expect(exportRangeError('', '')).toBe(EXPORT_MISSING_RANGE_MESSAGE)
    expect(exportRangeError('2026-09-01', '')).toBe(EXPORT_MISSING_RANGE_MESSAGE)
  })

  it('builds a compact window of pages with gaps', () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3])
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10])
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, null, 10])
  })

  it('describes the visible range', () => {
    expect(rangeSummary(1, 20, 20, 48)).toBe('Mostrando 21 a 40 de 48 transacciones')
  })
})
