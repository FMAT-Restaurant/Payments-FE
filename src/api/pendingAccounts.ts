import { httpClient } from './client'
import type { PendingAccountCardDTO, PendingAccountWire } from './contracts/pendingAccounts'
import { endpoints } from './endpoints'

export const toPendingAccount = ({ subtotal, taxes, total, ...account }: PendingAccountWire): PendingAccountCardDTO => ({
  ...account,
  totals: { subtotal, taxes, expected_total: total },
})

/** PMC-20 AC1: the charge screen always reloads the account from the API (also after F5). */
export async function getPendingAccount(dinningSessionId: string): Promise<PendingAccountCardDTO> {
  // The screen renders its own "account not available" state instead of a toast.
  const { data } = await httpClient.get<PendingAccountWire>(endpoints.pendingAccount(dinningSessionId), {
    skipErrorToast: true,
  })
  return toPendingAccount(data)
}

/**
 * PMC-19 AC4: accounts ready to be charged, polled by the cash tray.
 * Errors are rendered by the screen itself: a toast every polling cycle would flood the cashier.
 */
export async function listPendingAccounts(signal?: AbortSignal): Promise<PendingAccountCardDTO[]> {
  const { data } = await httpClient.get<PendingAccountWire[]>(endpoints.pendingAccounts(), {
    skipErrorToast: true,
    signal,
  })
  return data.map(toPendingAccount)
}
