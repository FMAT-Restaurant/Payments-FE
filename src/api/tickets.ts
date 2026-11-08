import { httpClient } from './client'
import type { TicketReceiptDTO } from './contracts/ticket'
import { endpoints } from './endpoints'

/** PMC-21 / PMC-25: receipt of a completed charge. The screen shows its own error and retry. */
export async function getTicket(folio: string): Promise<TicketReceiptDTO> {
  const { data } = await httpClient.get<TicketReceiptDTO>(endpoints.ticket(folio), { skipErrorToast: true })
  return data
}
