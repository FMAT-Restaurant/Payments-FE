import { describe, expect, it } from 'vitest'
import { cashDifference, describeDifference, formatTransactions } from './closeView'

describe('cashDifference', () => {
  it('is declared minus expected', () => {
    expect(cashDifference(4150, 4250)).toBe(-100)
    expect(cashDifference(4300, 4250)).toBe(50)
    expect(cashDifference(4250, 4250)).toBe(0)
  })

  it('does not leak floating point noise', () => {
    expect(cashDifference(0.3, 0.1 + 0.2)).toBe(0)
    expect(cashDifference(1000.1, 1000.2)).toBe(-0.1)
  })
})

describe('describeDifference', () => {
  it('describes an exact match', () => {
    expect(describeDifference(0)).toEqual({ kind: 'exact', variant: 'success', label: '$0.00 (Cuadre Exacto)' })
  })

  it('describes a shortage with the error style', () => {
    expect(describeDifference(-100)).toEqual({
      kind: 'shortage',
      variant: 'error',
      label: '-$100.00 (Faltante - Descuadre)',
    })
  })

  it('describes a surplus with the warning style', () => {
    expect(describeDifference(50)).toEqual({
      kind: 'surplus',
      variant: 'warning',
      label: '+$50.00 (Sobrante - Descuadre)',
    })
  })
})

describe('formatTransactions', () => {
  it('pluralizes', () => {
    expect(formatTransactions(24)).toBe('24 transacciones con voucher registrado')
    expect(formatTransactions(1)).toBe('1 transacción con voucher registrado')
    expect(formatTransactions(0)).toBe('0 transacciones con voucher registrado')
  })
})
