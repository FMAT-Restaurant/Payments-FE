import { describe, expect, it } from 'vitest'
import { toCashShift, toCashShiftSummary } from './cashShifts'
import { toChargeRequestWire, toChargeResponse } from './charge'
import { fromWireMethod } from './contracts/charge'
import { toPendingAccount } from './pendingAccounts'
import { historyPaymentMethod, MIXED_PAYMENT_METHOD } from './sales'
import { toTicketReceipt } from './tickets'
import { toTransactionDetail } from './transactions'

describe('wire mappers of Payments-BE', () => {
  it('translates the payment methods both ways and passes unknown ones through', () => {
    expect(fromWireMethod('TARJETA_DEBITO')).toBe('DEBIT_CARD')
    expect(fromWireMethod('VALES')).toBe('VALES')
    expect(
      toChargeRequestWire({
        dinning_session_id: 's-1',
        tip: 10,
        payments: [
          { payment_method: 'CASH', amount: 100, authorization_reference: null },
          { payment_method: 'CREDIT_CARD', amount: 50, authorization_reference: 'AUTH-1' },
        ],
      }).payments,
    ).toEqual([
      { method: 'EFECTIVO', amount: 100, authorization_reference: null },
      { method: 'TARJETA_CREDITO', amount: 50, authorization_reference: 'AUTH-1' },
    ])
  })

  it('reads the Spanish charge response', () => {
    expect(toChargeResponse({ folio: 'TX-1', total: 230, change_given: 20, estado: 'COMPLETADO', mensaje: 'OK' })).toEqual({
      folio: 'TX-1',
      total: 230,
      change_delivered: 20,
      status: 'COMPLETED',
      message: 'OK',
    })
  })

  it('nests the flat totals of a pending account', () => {
    const account = toPendingAccount({
      dinning_session_id: 's-1',
      order_folio: '#ORD-1',
      timestamp: '2026-11-10T00:00:00Z',
      items: [],
      subtotal: 100,
      taxes: 16,
      total: 116,
    })
    expect(account.totals).toEqual({ subtotal: 100, taxes: 16, expected_total: 116 })
    expect(account.pre_account_status).toBeUndefined()
  })

  it('maps the opening fund and derives the cash sales of the shift', () => {
    expect(toCashShift({ cash_shift_id: 'c-1', opened_at: 'x', opening_float: 500 }).initial_amount).toBe(500)
    expect(
      toCashShiftSummary({
        cash_shift_id: 'c-1',
        opened_at: 'x',
        opening_float: 1000,
        expected_cash: 4250.1,
        card_total: 8140,
        card_transaction_count: 3,
        retained_tips: 40,
      }),
    ).toMatchObject({ initial_amount: 1000, cash_sales: 3250.1, card_sales: 8140 })
  })

  it('collapses the history breakdowns into one method', () => {
    expect(historyPaymentMethod([])).toBeNull()
    expect(historyPaymentMethod([{ method: 'EFECTIVO', amount: 1 }, { method: 'EFECTIVO', amount: 2 }])).toBe('CASH')
    expect(historyPaymentMethod([{ method: 'EFECTIVO', amount: 1 }, { method: 'TARJETA_CREDITO', amount: 2 }])).toBe(
      MIXED_PAYMENT_METHOD,
    )
  })

  it('maps the sale detail', () => {
    const detail = toTransactionDetail({
      folio: 'TX-1',
      status: 'COMPLETADO',
      paid_at: '2026-09-08T20:30:00Z',
      subtotal: 100,
      taxes: 16,
      tip: 5,
      total: 121,
      change_given: 9,
      items: [{ dish_name: 'Tacos', quantity: 2, unit_price: 50, amount: 100 }],
      // The cash line comes as applied ($21); the screen shows the $30 received.
      payment_breakdowns: [
        { method: 'TARJETA_CREDITO', amount: 100, authorization_reference: 'AUTH-1' },
        { method: 'EFECTIVO', amount: 21, authorization_reference: null },
      ],
    })
    expect(detail).toMatchObject({
      id: 'TX-1',
      status: 'COMPLETED',
      tip: 5,
      items: [{ dish_name: 'Tacos', quantity: 2, unit_price: 50, amount: 100 }],
      payment_breakdowns: [
        { payment_method: 'CREDIT_CARD', amount: 100, authorization_reference: 'AUTH-1' },
        { payment_method: 'CASH', amount: 30, authorization_reference: null },
      ],
    })
  })

  it('rebuilds the header and totals blocks of the flat ticket', () => {
    const ticket = toTicketReceipt({
      restaurant_name: 'FMAT',
      folio: 'TX-1',
      paid_at: '2026-09-08T20:30:00Z',
      table_name: null,
      cashier_name: 'Ana',
      items: [],
      subtotal: 100,
      taxes: 16,
      tip: 0,
      total: 116,
      change_given: 34,
      // Payments-BE sends the cash applied (116); the receipt shows the cash received (116 + 34 of change).
      payments: [{ method: 'EFECTIVO', amount: 116 }, { method: 'TARJETA_DEBITO', amount: 10, authorization_reference: 'A-1' }],
    })
    expect(ticket.header).toEqual({
      restaurant_name: 'FMAT',
      folio: 'TX-1',
      payment_date: '2026-09-08T20:30:00Z',
      table_name: '',
      cashier_name: 'Ana',
    })
    expect(ticket.totals).toMatchObject({ total: 116, change_given: 34, payments: [{ payment_method: 'CASH', amount: 150 }, { payment_method: 'DEBIT_CARD', amount: 10 }] })
  })
})
