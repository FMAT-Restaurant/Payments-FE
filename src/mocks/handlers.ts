import { http, HttpResponse, type HttpHandler } from 'msw'
import type {
  CashShiftDTO,
  CashShiftSummaryDTO,
  CloseCashShiftRequestDTO,
  OpenCashShiftRequestDTO,
} from '../api/contracts/cashShift'
import type { ChargeRequestDTO, ChargeResponseDTO } from '../api/contracts/charge'
import type { TicketReceiptDTO } from '../api/contracts/ticket'
import { endpoints } from '../api/endpoints'
import { roundMoney } from '../lib/money'
import { apiUrl } from './apiUrl'
import { pendingAccountsFixture } from './fixtures/pendingAccounts'
import { salesHistoryFixture } from './fixtures/salesHistory'

/**
 * Mock Service Worker handlers for the endpoints the Backend has not published yet or whose
 * contract is still being aligned. They follow the `{ code, message }` error contract.
 */
const pendingAccounts = pendingAccountsFixture()
const salesHistory = salesHistoryFixture()

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status })

let folioSequence = 1
const tickets = new Map<string, TicketReceiptDTO>()
/** The demo session starts without an open shift, so the opening flow of PMC-22 can be tried. */
let openShift: CashShiftDTO | null = null

/** Running totals of the open shift (PMC-23), updated by every mocked charge. */
const emptyTotals = () => ({ cashSales: 0, cardSales: 0, cardTransactions: 0, retainedTips: 0 })
let shiftTotals = emptyTotals()

/** Rows inside [start, end): `end_date` is exclusive, like the Backend range. */
const inRange = (iso: string, start: string | null, end: string | null): boolean => {
  const time = Date.parse(iso)
  return (!start || time >= Date.parse(start)) && (!end || time < Date.parse(end))
}

const csvOf = (rows: typeof salesHistory): string =>
  ['folio,total,estado,fecha_cobro', ...rows.map((row) => `${row.folio},${row.total},${row.estado},${row.fecha_cobro}`)].join('\n')

export const handlers: HttpHandler[] = [
  // PMC-19: accounts of the cash tray (polled). Charged accounts leave the list.
  http.get(apiUrl(endpoints.pendingAccounts()), () => HttpResponse.json(pendingAccounts)),

  // PMC-20: account of the "Procesar Pago" screen.
  http.get(apiUrl('/pendings/:dinningSessionId'), ({ params }) => {
    const account = pendingAccounts.find((item) => item.dinning_session_id === params.dinningSessionId)
    return account ? HttpResponse.json(account) : error(404, 'BILL_NOT_FOUND', 'La cuenta no existe o ya fue cobrada')
  }),

  // PMC-22: shift of the logged-in cashier.
  http.get(apiUrl(endpoints.myCashShift()), () =>
    openShift ? HttpResponse.json(openShift) : error(404, 'CASH_SHIFT_NOT_FOUND', 'No tienes un turno de caja abierto'),
  ),

  // PMC-22: opening with the declared fund.
  http.post(apiUrl(endpoints.openCashShift()), async ({ request }) => {
    const body = (await request.json()) as OpenCashShiftRequestDTO
    if (openShift) {
      return error(409, 'CASH_SHIFT_ALREADY_OPEN', 'Ya tienes un turno de caja abierto en otra sesión')
    }
    if (typeof body.initial_amount !== 'number' || body.initial_amount < 0) {
      return error(400, 'VALIDATION_ERROR', 'El fondo inicial debe ser mayor o igual a 0.')
    }
    openShift = {
      cash_shift_id: crypto.randomUUID(),
      cashier_name: 'Edwing Molina',
      opened_at: new Date().toISOString(),
      initial_amount: body.initial_amount,
    }
    shiftTotals = emptyTotals()
    return HttpResponse.json(
      { cash_shift_id: openShift.cash_shift_id, status: 'OPEN', message: 'Turno de caja abierto' },
      { status: 201 },
    )
  }),

  // PMC-23: real-time reconciliation of the open shift.
  http.get(apiUrl(endpoints.cashShiftSummary()), () => {
    if (!openShift) return error(404, 'CASH_SHIFT_NOT_FOUND', 'No tienes un turno de caja abierto')
    const summary: CashShiftSummaryDTO = {
      cash_shift_id: openShift.cash_shift_id,
      cashier_name: openShift.cashier_name,
      opened_at: openShift.opened_at,
      initial_amount: openShift.initial_amount,
      cash_sales: roundMoney(shiftTotals.cashSales),
      expected_cash: roundMoney(openShift.initial_amount + shiftTotals.cashSales),
      card_sales: roundMoney(shiftTotals.cardSales),
      card_transaction_count: shiftTotals.cardTransactions,
      retained_tips: roundMoney(shiftTotals.retainedTips),
    }
    return HttpResponse.json(summary)
  }),

  // PMC-23: closing needs the reason whenever the declared cash differs from the expected cash.
  http.post(apiUrl(endpoints.closeCashShift()), async ({ request }) => {
    if (!openShift) return error(404, 'CASH_SHIFT_NOT_FOUND', 'No tienes un turno de caja abierto')
    const body = (await request.json()) as CloseCashShiftRequestDTO
    if (typeof body.declared_cash !== 'number' || body.declared_cash < 0) {
      return error(400, 'VALIDATION_ERROR', 'El efectivo declarado debe ser mayor o igual a 0.')
    }
    const expected = roundMoney(openShift.initial_amount + shiftTotals.cashSales)
    const difference = roundMoney(body.declared_cash - expected)
    if (difference !== 0 && !body.reason?.trim()) {
      return error(400, 'VALIDATION_ERROR', 'El motivo es obligatorio cuando hay diferencia.')
    }
    const closed = openShift
    openShift = null
    return HttpResponse.json({
      cash_shift_id: closed.cash_shift_id,
      status: difference === 0 ? 'CLOSED' : 'UNBALANCED',
      difference,
      message: difference === 0 ? 'Turno cerrado' : 'Turno cerrado con descuadre',
    })
  }),

  // PMC-20: charge with the same business rules as the Backend.
  http.post(apiUrl(endpoints.charge()), async ({ request }) => {
    if (!openShift) return error(403, 'CASH_SHIFT_NOT_OPEN', 'Debe abrir caja antes de cobrar')
    const body = (await request.json()) as ChargeRequestDTO
    const index = pendingAccounts.findIndex((item) => item.dinning_session_id === body.dinning_session_id)
    if (index === -1) return error(404, 'BILL_NOT_FOUND', 'La cuenta no existe o ya fue cobrada')

    const total = roundMoney(pendingAccounts[index].totals.expected_total + body.tip)
    const cards = roundMoney(body.payments.filter((p) => p.payment_method !== 'CASH').reduce((s, p) => s + p.amount, 0))
    const paid = roundMoney(body.payments.reduce((s, p) => s + p.amount, 0))

    if (body.payments.some((p) => p.payment_method !== 'CASH' && !p.authorization_reference)) {
      return error(422, 'AUTHORIZATION_REFERENCE_REQUIRED', 'La referencia de autorización es obligatoria')
    }
    if (cards > total) {
      return error(422, 'CARD_AMOUNT_EXCEEDS_BALANCE', 'Los pagos con tarjeta no pueden exceder el total de la cuenta')
    }
    if (cards === total && body.payments.some((p) => p.payment_method === 'CASH')) {
      return error(422, 'CARD_COVERS_FULL_AMOUNT', 'La tarjeta cubre el total; no se admite efectivo adicional')
    }
    if (paid < total) {
      return error(422, 'INSUFFICIENT_FUNDS', 'El monto de los pagos no cubre el total de la cuenta')
    }

    const [account] = pendingAccounts.splice(index, 1)
    const cashPaid = roundMoney(body.payments.filter((p) => p.payment_method === 'CASH').reduce((s, p) => s + p.amount, 0))
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
      header: {
        restaurant_name: 'FMAT-RESTAURANT',
        folio,
        payment_date: now.toISOString(),
        table_name: account.table_name ?? account.dinning_session_id.slice(0, 8),
        cashier_name: 'Edwing Molina',
      },
      items: account.items.map((item) => ({
        quantity: item.quantity,
        dish_name: item.name,
        unit_price: item.unit_price,
        amount: item.amount,
      })),
      totals: { ...account.totals, tip: body.tip, total, payments: body.payments, change_given: change },
    })

    const response: ChargeResponseDTO = {
      folio,
      total,
      change_delivered: change,
      status: 'COMPLETED',
      message: 'Cobro registrado correctamente',
    }
    return HttpResponse.json(response, { status: 201 })
  }),

  // PMC-21: thermal receipt of a completed charge.
  http.get(apiUrl('/:folio/ticket'), ({ params }) => {
    const ticket = tickets.get(String(params.folio))
    return ticket ? HttpResponse.json(ticket) : error(404, 'TRANSACTION_NOT_FOUND', `El ticket '${params.folio}' no existe`)
  }),

  // PMC-24: CSV export (Administrador). Registered before the history so "/export" is not read as a folio.
  http.get(apiUrl(endpoints.salesExport()), ({ request }) => {
    const url = new URL(request.url)
    const rows = salesHistory.filter((row) => inRange(row.fecha_cobro, url.searchParams.get('start_date'), url.searchParams.get('end_date')))
    return new HttpResponse(csvOf(rows), {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="historial-ventas.csv"' },
    })
  }),

  // PMC-24: paginated history. The mock answers like the Backend: `page_index` is 1-based.
  http.get(apiUrl(endpoints.salesHistory()), ({ request }) => {
    const url = new URL(request.url)
    const pageIndex = Number(url.searchParams.get('page_index') ?? 1)
    const pageSize = Number(url.searchParams.get('page_size') ?? 20)
    if (!Number.isInteger(pageIndex) || pageIndex < 1) return error(400, 'INVALID_PAGE_INDEX', 'page_index debe ser mayor a 0')
    const rows = salesHistory.filter((row) => inRange(row.fecha_cobro, url.searchParams.get('start_date'), url.searchParams.get('end_date')))
    return HttpResponse.json({
      page_index: pageIndex,
      page_size: pageSize,
      total_count: rows.length,
      total_pages: Math.ceil(rows.length / pageSize),
      data: rows.slice((pageIndex - 1) * pageSize, pageIndex * pageSize),
    })
  }),
]
