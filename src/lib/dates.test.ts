import { describe, expect, it } from 'vitest'
import { formatDateTime, formatTime } from './dates'

describe('dates', () => {
  it('formats the time of day in the browser time zone', () => {
    expect(formatTime(new Date(2026, 10, 8, 8, 0).toISOString())).toBe('08:00')
    expect(formatTime(new Date(2026, 10, 8, 21, 5).toISOString())).toBe('21:05')
  })

  it('formats date and time', () => {
    expect(formatDateTime(new Date(2026, 8, 29, 14, 32).toISOString())).toBe('29/09/2026 14:32')
  })

  it('returns the raw value when it is not a date', () => {
    expect(formatTime('mañana')).toBe('mañana')
    expect(formatDateTime('mañana')).toBe('mañana')
  })
})
