import { httpClient } from './client'
import type { ChargeRequestDTO, ChargeResponseDTO } from './contracts/charge'
import { endpoints } from './endpoints'

/** PMC-20: registers the charge. Errors reach the UI through the interceptor toast and keep the form intact. */
export async function postCharge(request: ChargeRequestDTO): Promise<ChargeResponseDTO> {
  const { data } = await httpClient.post<ChargeResponseDTO>(endpoints.charge(), request)
  return data
}
