import { httpClient } from './client'
import type { PendingAccountCardDTO } from './contracts/pendingAccounts'
import { endpoints } from './endpoints'

/** PMC-20 AC1: the charge screen always reloads the account from the API (also after F5). */
export async function getPendingAccount(dinningSessionId: string): Promise<PendingAccountCardDTO> {
  // The screen renders its own "account not available" state instead of a toast.
  const { data } = await httpClient.get<PendingAccountCardDTO>(endpoints.pendingAccount(dinningSessionId), {
    skipErrorToast: true,
  })
  return data
}
