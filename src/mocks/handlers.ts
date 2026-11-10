import { http, HttpResponse, type HttpHandler } from 'msw'
import type {
  CashShiftSummaryWire,
  CashShiftWire,
  CloseCashShiftRequestDTO,
  ForceCloseCashShiftRequestDTO,
  OpenCashShiftItemDTO,
  OpenCashShiftRequestWire,
} from '../api/contracts/cashShift'
import type { ChargeRequestWire, ChargeResponseWire } from '../api/contracts/charge'
import type { TicketReceiptWire } from '../api/contracts/ticket'
import { endpoints } from '../api/endpoints'
import { roundMoney } from '../lib/money'
import { apiUrl } from './apiUrl'
import { pendingAccountsFixture } from './fixtures/pendingAccounts'
import { salesHistoryFixture } from './fixtures/salesHistory'
import { ticketFixture, transactionDetailFixture } from './fixtures/transactionDetail'

/**
 * Mock Service Worker handlers that answer with the wire shapes of Payments-BE (`qa`),
 * so the mappers of `src/api` run the same way against the mocks and the real Backend.
 * They follow the `{ code, message }` error contract.
 */
const pendingAccounts = pendingAccountsFixture()
const salesHistory = salesHistoryFixture()

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status })

const CASH = 'EFECTIVO'

let folioSequence = 1
const tickets = new Map<string, TicketReceiptWire>()
/** The demo session starts without an open shift, so the opening flow of PMC-22 can be tried. */
let openShift: CashShiftWire | null = null

/** Running totals of the open shift (PMC-23), updated by every mocked charge. */
const emptyTotals = () => ({ cashSales: 0, cardSales: 0, cardTransactions: 0, retainedTips: 0 })
let shiftTotals = emptyTotals()

/** PMC-31: shifts of other cashiers, visible to Administrador / Gerente. Force-closing one removes it. */
const supervisedShifts = (): Array<{ shift: OpenCashShiftItemDTO; summary: CashShiftSummaryWire }> => {
  const make = (id: string, name: string, openedAt: string, float: number, cash: number, card: number, count: number, tips: number) => ({
    shift: { cash_shift_id: id, cashier_name: name, opened_at: openedAt, opening_float: float },
    summary: {
      cash_shift_id: id,
      cashier_name: name,
      opened_at: openedAt,
      opening_float: float,
      expected_cash: roundMoney(float + cash),
      card_total: card,
      card_transaction_count: count,
      retained_tips: tips,
    },
  })
  return [
    make('8f1b6c3e-0a52-4c1e-9d7a-3c8891ab8891', 'Ana M.', '2026-11-04T08:30:00-06:00', 1000, 1840, 2650, 9, 265),
    make('2d7e5a90-61cb-47f4-b3a8-5e1c4ab88840', 'Carlos R.', '2026-11-03T15:45:00-06:00', 500, 2950, 5120, 18, 512),
  ]
}
let supervised = supervisedShifts()

/** Rows inside [start, end): `end_date` is exclusive, like the Backend range. */
const inRange = (iso: string, start: string | null, end: string | null): boolean => {
  const time = Date.parse(iso)
  return (!start || time >= Date.parse(start)) && (!end || time < Date.parse(end))
}

const csvOf = (rows: typeof salesHistory): string =>
  ['folio,total,status,paid_at', ...rows.map((row) => `${row.folio},${row.total},${row.status},${row.paid_at}`)].join('\n')

export const handlers: HttpHandler[] = [
  // PMC-19: accounts of the cash tray (polled). Charged accounts leave the list.
  http.get(apiUrl(endpoints.pendingAccounts()), () => HttpResponse.json(pendingAccounts)),

  // PMC-20: account of the "Procesar Pago" screen.
  http.get(apiUrl('/pendings/:dinningSessionId'), ({ params }) => {
    const account = pendingAccounts.find((item) => item.dinning_session_id === params.dinningSessionId)
    return account ? HttpResponse.json(account) : error(404, 'SESSION_NOT_FOUND', 'La cuenta no existe o ya fue cobrada')
  }),

  // PMC-22: shift of the logged-in cashier.
  http.get(apiUrl(endpoints.myCashShift()), () =>
    openShift ? HttpResponse.json(openShift) : error(404, 'CASH_SHIFT_NOT_OPEN', 'No tienes un turno de caja abierto'),
  ),

  // PMC-22: opening with the declared fund.
  http.post(apiUrl(endpoints.openCashShift()), async ({ request }) => {
    const body = (await request.json()) as OpenCashShiftRequestWire
    if (openShift) {
      return error(409, 'CASH_SHIFT_ALREADY_OPEN', 'Ya tienes un turno de caja abierto en otra sesión')
    }
    if (typeof body.opening_float !== 'number' || body.opening_float < 0) {
      return error(400, 'VALIDATION_ERROR', 'El fondo inicial debe ser mayor o igual a 0.')
    }
    openShift = {
      cash_shift_id: crypto.randomUUID(),
      opened_at: new Date().toISOString(),
      opening_float: body.opening_float,
    }
    shiftTotals = emptyTotals()
    return HttpResponse.json(
      { cash_shift_id: openShift.cash_shift_id, status: 'ABIERTO', message: 'Turno de caja abierto' },
      { status: 201 },
    )
  }),

  // PMC-23: real-time reconciliation of the open shift.
  http.get(apiUrl(endpoints.cashShiftSummary()), () => {
    if (!openShift) return error(404, 'CASH_SHIFT_NOT_OPEN', 'No tienes un turno de caja abierto')
    const summary: CashShiftSummaryWire = {
      cash_shift_id: openShift.cash_shift_id,
      cashier_name: 'Edwing Molina',
      opened_at: openShift.opened_at,
      opening_float: openShift.opening_float,
      expected_cash: roundMoney(openShift.opening_float + shiftTotals.cashSales),
      card_total: roundMoney(shiftTotals.cardSales),
      card_transaction_count: shiftTotals.cardTransactions,
      retained_tips: roundMoney(shiftTotals.retainedTips),
      status: 'ABIERTO',
      calculated_at: new Date().toISOString(),
    }
    return HttpResponse.json(summary)
  }),

  // PMC-23: the Backend accepts the close with or without a reason.
  http.post(apiUrl(endpoints.closeCashShift()), async ({ request }) => {
    if (!openShift) return error(422, 'CASH_SHIFT_NOT_OPEN', 'No tienes un turno de caja abierto')
    const body = (await request.json()) as CloseCashShiftRequestDTO
    if (typeof body.declared_cash !== 'number' || body.declared_cash < 0) {
      return error(400, 'VALIDATION_ERROR', 'El efectivo declarado debe ser mayor o igual a 0.')
    }
    const expected = roundMoney(openShift.opening_float + shiftTotals.cashSales)
    const difference = roundMoney(body.declared_cash - expected)
    const closed = openShift
    openShift = null
    return HttpResponse.json({
      cash_shift_id: closed.cash_shift_id,
      status: difference === 0 ? 'CERRADO' : 'DESCUADRADO',
      difference,
      message: difference === 0 ? 'Turno cerrado' : 'Turno cerrado con descuadre',
    })
  }),

  // PMC-31: open shifts of the restaurant.
  http.get(apiUrl(endpoints.openCashShifts()), () => HttpResponse.json(supervised.map((item) => item.shift))),

  // PMC-31: reconciliation of a shift of another cashier.
  http.get(apiUrl('/cash-shifts/:cashShiftId/summary'), ({ params }) => {
    const found = supervised.find((item) => item.shift.cash_shift_id === params.cashShiftId)
    return found ? HttpResponse.json(found.summary) : error(404, 'CASH_SHIFT_NOT_FOUND', 'El turno no existe o ya fue cerrado')
  }),

  // PMC-31: forced close with a mandatory audit reason.
  http.post(apiUrl('/cash-shifts/:cashShiftId/force-close'), async ({ params, request }) => {
    const found = supervised.find((item) => item.shift.cash_shift_id === params.cashShiftId)
    if (!found) return error(409, 'CASH_SHIFT_ALREADY_CLOSED', 'El turno ya se encuentra cerrado')
    const body = (await request.json()) as ForceCloseCashShiftRequestDTO
    if (typeof body.declared_cash !== 'number' || body.declared_cash < 0) {
      return error(400, 'VALIDATION_ERROR', 'El efectivo auditado debe ser mayor o igual a 0.')
    }
    if (!body.force_close_reason?.trim()) {
      return error(400, 'VALIDATION_ERROR', 'El motivo del cierre forzado es obligatorio.')
    }
    const difference = roundMoney(body.declared_cash - found.summary.expected_cash)
    supervised = supervised.filter((item) => item !== found)
    return HttpResponse.json({
      cash_shift_id: found.shift.cash_shift_id,
      status: difference === 0 ? 'CERRADO' : 'DESCUADRADO',
      difference,
      message: difference === 0 ? 'Turno cerrado' : 'Turno cerrado con descuadre',
    })
  }),

  // PMC-20: charge with the same business rules as the Backend.
  http.post(apiUrl(endpoints.charge()), async ({ request }) => {
    if (!openShift) return error(403, 'CASH_SHIFT_NOT_OPEN', 'Debe abrir caja antes de cobrar')
    const body = (await request.json()) as ChargeRequestWire
    const index = pendingAccounts.findIndex((item) => item.dinning_session_id === body.dinning_session_id)
    if (index === -1) return error(404, 'SESSION_NOT_FOUND', 'La cuenta no existe o ya fue cobrada')

    const total = roundMoney(pendingAccounts[index].total + body.tip)
    const cards = roundMoney(body.payments.filter((p) => p.method !== CASH).reduce((s, p) => s + p.amount, 0))
    const paid = roundMoney(body.payments.reduce((s, p) => s + p.amount, 0))

    if (body.payments.some((p) => p.method !== CASH && !p.authorization_reference)) {
      return error(422, 'AUTHORIZATION_REFERENCE_REQUIRED', 'La referencia de autorización es obligatoria')
    }
    if (cards > total) {
      return error(422, 'CARD_AMOUNT_EXCEEDS_BALANCE', 'Los pagos con tarjeta no pueden exceder el total de la cuenta')
    }
    if (cards === total && body.payments.some((p) => p.method === CASH)) {
      return error(422, 'CARD_COVERS_FULL_AMOUNT', 'La tarjeta cubre el total; no se admite efectivo adicional')
    }
    if (paid < total) {
      return error(422, 'INSUFFICIENT_FUNDS', 'El monto de los pagos no cubre el total de la cuenta')
    }

    const [account] = pendingAccounts.splice(index, 1)
    const cashPaid = roundMoney(body.payments.filter((p) => p.method === CASH).reduce((s, p) => s + p.amount, 0))
    shiftTotals.cashSales += roundMoney(cashPaid - roundMoney(paid - total))
    shiftTotals.cardSales += cards
    if (cards > 0) {
      shiftTotals.cardTransactions += 1
      shiftTotals.retainedTips += body.tip
    }
    const now = new Date()
    const folio = `TX-${now.toISOString().slice(0, 10).replaceAll('-', '')}-${String(folioSequence++).padStart(3, '0')}`
    const change = roundMoney(paid - total)
    tickets.set(folio, {
      restaurant_name: 'FMAT-RESTAURANT',
      folio,
      paid_at: now.toISOString(),
      table_name: account.table_name ?? account.dinning_session_id.slice(0, 8),
      cashier_name: 'Edwing Molina',
      items: account.items.map((item) => ({
        quantity: item.quantity,
        dish_name: item.name,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
      subtotal: account.subtotal,
      taxes: account.taxes,
      tip: body.tip,
      total,
      change_given: change,
      // Like the Backend: the cash line keeps the amount applied, not the cash received.
      payments: body.payments.map((p) => (p.method === CASH ? { ...p, amount: roundMoney(p.amount - change) } : p)),
    })

    const response: ChargeResponseWire = {
      folio,
      total,
      change_given: change,
      estado: 'COMPLETADO',
      mensaje: 'Cobro registrado correctamente',
    }
    return HttpResponse.json(response, { status: 201 })
  }),

  // PMC-21: thermal receipt of a completed charge.
  http.get(apiUrl('/:folio/ticket'), ({ params }) => {
    const folio = String(params.folio)
    const row = salesHistory.find((item) => item.folio === folio)
    const ticket = tickets.get(folio) ?? (row ? ticketFixture(transactionDetailFixture(row)) : undefined)
    return ticket ? HttpResponse.json(ticket) : error(404, 'TRANSACTION_NOT_FOUND', `El ticket '${params.folio}' no existe`)
  }),

  // PMC-24: CSV export (Administrador). Registered before the history so "/export" is not read as a folio.
  http.get(apiUrl(endpoints.salesExport()), ({ request }) => {
    const url = new URL(request.url)
    const rows = salesHistory.filter((row) => inRange(row.paid_at, url.searchParams.get('start_date'), url.searchParams.get('end_date')))
    return new HttpResponse(csvOf(rows), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="historial-ventas.csv"' },
    })
  }),

  // PMC-24: paginated history. The mock answers like the Backend: `page_index` is 1-based.
  http.get(apiUrl(endpoints.salesHistory()), ({ request }) => {
    const url = new URL(request.url)
    const pageIndex = Number(url.searchParams.get('page_index') ?? 1)
    const pageSize = Number(url.searchParams.get('page_size') ?? 20)
    if (!Number.isInteger(pageIndex) || pageIndex < 1) return error(400, 'VALIDATION_ERROR', 'page_index debe ser mayor a 0')
    const rows = salesHistory.filter((row) => inRange(row.paid_at, url.searchParams.get('start_date'), url.searchParams.get('end_date')))
    return HttpResponse.json({
      page_index: pageIndex,
      page_size: pageSize,
      total_count: rows.length,
      total_pages: Math.ceil(rows.length / pageSize),
      data: rows.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
    })
  }),

  // PMC-25: immutable detail of a history sale. Last handler, so "/export" and "/pendings" are not read as folios.
  http.get(apiUrl('/:folio'), ({ params }) => {
    const row = salesHistory.find((item) => item.folio === String(params.folio))
    return row ? HttpResponse.json(transactionDetailFixture(row)) : error(404, 'TRANSACTION_NOT_FOUND', `La transacción '${params.folio}' no existe`)
  }),
]
