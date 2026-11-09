import { describe, expect, it } from 'vitest'
import type { TransactionDetailWire } from './contracts/sales'
import { toTransactionDetail } from './transactions'

const base: TransactionDetailWire = {
  folio: 'TX-1',
  total: 116,
  estado: 'COMPLETED',
  detalles: [{ nombre_platillo: 'Tacos', cantidad: 2, precio_unitario: 50, importe: 100 }],
  desgloses: [{ metodo_pago: 'CASH', monto: 150 }],
}

describe('toTransactionDetail', () => {
  it('translates the Backend names to the contract of the story', () => {
    const detail = toTransactionDetail({
      ...base,
      fecha_cobro: '2026-09-08T20:30:00Z',
      subtotal: 100,
      impuestos: 16,
      propina: 5,
      cambio_entregado: 34,
      desgloses: [{ metodo_pago: 'CREDIT_CARD', monto: 116, referencia_autorizacion: 'AUTH-1' }],
    })
    expect(detail).toMatchObject({
      folio: 'TX-1',
      paid_at: '2026-09-08T20:30:00Z',
      status: 'COMPLETED',
      subtotal: 100,
      taxes: 16,
      tip: 5,
      change_given: 34,
      items: [{ dish_name: 'Tacos', quantity: 2, unit_price: 50, amount: 100 }],
      payment_breakdowns: [{ payment_method: 'CREDIT_CARD', amount: 116, authorization_reference: 'AUTH-1' }],
    })
  })

  it('derives what the Backend has not published yet', () => {
    expect(toTransactionDetail(base)).toMatchObject({ paid_at: '', subtotal: 100, taxes: 0, tip: 0, change_given: 34 })
  })
})
