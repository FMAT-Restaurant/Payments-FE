import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'
import { listPendingAccounts } from '../../api/pendingAccounts'
import { queryKeys } from '../../api/queryKeys'
import { env } from '../../config/env'
import { notify } from '../notifications/toastStore'
import { findRemovedAccounts, removedAccountsMessage } from './accountsView'

/**
 * PMC-19 AC4: pending accounts refreshed by polling (no WebSockets / SSE).
 * The interval comes from `VITE_PENDINGS_POLL_MS` and only runs while the tab is visible.
 */
export function usePendingAccounts() {
  return useQuery({
    queryKey: queryKeys.pendingAccounts,
    queryFn: ({ signal }) => listPendingAccounts(signal),
    refetchInterval: env.pendingsPollMs,
    refetchIntervalInBackground: false,
    // A new visit always starts from a fresh load. Keeping the cache would replay the list from before the
    // cashier charged an account and then announce that account as "removed" by someone else.
    gcTime: 0,
  })
}

/**
 * Shows ONE info toast when accounts that were visible disappear between two polls.
 * The previous list lives in this component's state, so the first response after mounting never notifies.
 */
export function useRemovedAccountsNotice(accounts: PendingAccountCardDTO[] | undefined): void {
  const previous = useRef<PendingAccountCardDTO[] | null>(null)

  useEffect(() => {
    if (!accounts) return
    const before = previous.current
    previous.current = accounts
    if (!before) return

    const removed = findRemovedAccounts(before, accounts)
    if (removed.length > 0) notify.info(removedAccountsMessage(removed))
  }, [accounts])
}
