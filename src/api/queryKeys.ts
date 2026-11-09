import type { SalesHistoryQuery } from './contracts/sales'

/** React Query keys shared by the screens, so a mutation can refresh what other screens show. */
export const queryKeys = {
  pendingAccounts: ['pending-accounts'] as const,
  pendingAccount: (dinningSessionId: string) => ['pending-accounts', dinningSessionId] as const,
  ticket: (folio: string) => ['ticket', folio] as const,
  myCashShift: ['cash-shift', 'me'] as const,
  cashShiftSummary: ['cash-shift', 'summary'] as const,
  salesHistory: (query: SalesHistoryQuery) => ['sales-history', query] as const,
}
