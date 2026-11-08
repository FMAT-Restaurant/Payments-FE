/** React Query keys shared by the screens, so a mutation can refresh what other screens show. */
export const queryKeys = {
  pendingAccounts: ['pending-accounts'] as const,
  pendingAccount: (dinningSessionId: string) => ['pending-accounts', dinningSessionId] as const,
}
