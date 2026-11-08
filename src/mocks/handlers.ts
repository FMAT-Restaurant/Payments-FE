import { http, HttpResponse, type HttpHandler } from 'msw'
import type { ChargeRequestDTO, ChargeResponseDTO } from '../api/contracts/charge'
import { endpoints } from '../api/endpoints'
import { roundMoney } from '../lib/money'
import { apiUrl } from './apiUrl'
import { pendingAccountsFixture } from './fixtures/pendingAccounts'

/**
 * Mock Service Worker handlers for the endpoints the Backend has not published yet or whose
 * contract is still being aligned. They follow the `{ code, message }` error contract.
 */
const pendingAccounts = pendingAccountsFixture()

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status })

let folioSequence = 1

export const handlers: HttpHandler[] = [
  // PMC-20: account of the "Procesar Pago" screen.
  http.get(apiUrl('/pendings/:dinningSessionId'), ({ params }) => {
    const account = pendingAccounts.find((item) => item.dinning_session_id === params.dinningSessionId)
    return account ? HttpResponse.json(account) : error(404, 'BILL_NOT_FOUND', 'La cuenta no existe o ya fue cobrada')
  }),

  // PMC-20: charge with the same business rules as the Backend.
  http.post(apiUrl(endpoints.charge()), async ({ request }) => {
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

    pendingAccounts.splice(index, 1)
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '')
    const response: ChargeResponseDTO = {
      folio: `TX-${date}-${String(folioSequence++).padStart(3, '0')}`,
      total,
      change_delivered: roundMoney(paid - total),
      status: 'COMPLETED',
      message: 'Cobro registrado correctamente',
    }
    return HttpResponse.json(response, { status: 201 })
  }),
]
