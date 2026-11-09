import type { SalesHistoryItemWire } from '../../api/contracts/sales'

const COUNT = 48
const FIRST_FOLIO = 1
/** Fixed reference so the demo and the tests do not depend on the clock: 2026-09-08 20:30 local. */
const BASE = new Date(2026, 8, 8, 20, 30, 0)
const METHODS = ['CASH', 'CARD', 'CASH', 'CARD', 'CASH'] as const

/**
 * 48 completed transactions, one every 6 hours going back from BASE, newest first.
 * The Backend does not send the payment method yet; the mock leaves it out of every third row
 * so the "—" fallback of the table can be seen.
 */
export function salesHistoryFixture(): SalesHistoryItemWire[] {
  return Array.from({ length: COUNT }, (_, index) => {
    const paidAt = new Date(BASE.getTime() - index * 6 * 60 * 60 * 1000)
    const day = `${paidAt.getFullYear()}${String(paidAt.getMonth() + 1).padStart(2, '0')}${String(paidAt.getDate()).padStart(2, '0')}`
    const sequence = String(FIRST_FOLIO + COUNT - 1 - index).padStart(6, '0')
    return {
      folio: `TX-${day}-${sequence}`,
      total: 150 + ((index * 37) % 400) + (index % 4) * 0.5,
      estado: 'COMPLETED',
      fecha_cobro: paidAt.toISOString(),
      ...(index % 3 === 2 ? {} : { metodo_pago: METHODS[index % METHODS.length] }),
    }
  })
}
