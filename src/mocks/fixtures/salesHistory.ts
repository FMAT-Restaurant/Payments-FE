import type { SalesHistoryItemWire } from '../../api/contracts/sales'

const COUNT = 48
const FIRST_FOLIO = 1
/** Fixed reference so the demo and the tests do not depend on the clock: 2026-09-08 20:30 local. */
const BASE = new Date(2026, 8, 8, 20, 30, 0)
const METHODS = ['EFECTIVO', 'TARJETA_CREDITO', 'EFECTIVO', 'TARJETA_CREDITO', 'EFECTIVO'] as const

/**
 * 48 completed transactions, one every 6 hours going back from BASE, newest first, in the wire
 * shape of Payments-BE. Every third row is split between cash and card so "Mixto" can be seen.
 */
export function salesHistoryFixture(): SalesHistoryItemWire[] {
  return Array.from({ length: COUNT }, (_, index) => {
    const paidAt = new Date(BASE.getTime() - index * 6 * 60 * 60 * 1000)
    const day = `${paidAt.getFullYear()}${String(paidAt.getMonth() + 1).padStart(2, '0')}${String(paidAt.getDate()).padStart(2, '0')}`
    const sequence = String(FIRST_FOLIO + COUNT - 1 - index).padStart(6, '0')
    const total = 150 + ((index * 37) % 400) + (index % 4) * 0.5
    const half = Math.round(total * 50) / 100
    return {
      folio: `TX-${day}-${sequence}`,
      total,
      status: 'COMPLETADO',
      paid_at: paidAt.toISOString(),
      payment_breakdowns:
        index % 3 === 2
          ? [
              { method: 'TARJETA_CREDITO', amount: half },
              { method: 'EFECTIVO', amount: Math.round((total - half) * 100) / 100 },
            ]
          : [{ method: METHODS[index % METHODS.length], amount: total }],
    }
  })
}
