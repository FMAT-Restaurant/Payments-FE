import { describe, expect, it } from 'vitest'
import { formatCurrency, roundMoney } from './money'

describe('roundMoney', () => {
  it.each([
    [1.005, 1.01],
    [0.1 + 0.2, 0.3],
    [237.8 * 0.15, 35.67],
    [273.47 - 300, -26.53],
    [10, 10],
  ])('rounds %d to %d', (value, expected) => {
    expect(roundMoney(value)).toBe(expected)
  })
})

describe('formatCurrency', () => {
  it('formats MXN with two decimals and thousands separator', () => {
    expect(formatCurrency(4250)).toBe('$4,250.00')
    expect(formatCurrency(26.531)).toBe('$26.53')
  })
})
