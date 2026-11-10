import { httpClient } from './client'
import {
  PAYMENT_METHOD_WIRE,
  type ChargeRequestDTO,
  type ChargeRequestWire,
  type ChargeResponseDTO,
  type ChargeResponseWire,
} from './contracts/charge'
import { endpoints } from './endpoints'

export const toChargeRequestWire = (request: ChargeRequestDTO): ChargeRequestWire => ({
  dinning_session_id: request.dinning_session_id,
  tip: request.tip,
  payments: request.payments.map((payment) => ({
    method: PAYMENT_METHOD_WIRE[payment.payment_method],
    amount: payment.amount,
    authorization_reference: payment.authorization_reference,
  })),
})

export const toChargeResponse = (wire: ChargeResponseWire): ChargeResponseDTO => ({
  folio: wire.folio,
  total: wire.total,
  change_delivered: wire.change_given,
  status: 'COMPLETED',
  message: wire.mensaje,
})

/** PMC-20: registers the charge. Errors reach the UI through the interceptor toast and keep the form intact. */
export async function postCharge(request: ChargeRequestDTO): Promise<ChargeResponseDTO> {
  const { data } = await httpClient.post<ChargeResponseWire>(endpoints.charge(), toChargeRequestWire(request))
  return toChargeResponse(data)
}
