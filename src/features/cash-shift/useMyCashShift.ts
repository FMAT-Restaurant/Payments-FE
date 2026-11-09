import { useQuery } from '@tanstack/react-query'
import { getMyCashShift } from '../../api/cashShifts'
import { isApiError } from '../../api/errors'
import { queryKeys } from '../../api/queryKeys'

export type CashShiftState = 'checking' | 'open' | 'closed' | 'unknown'

/** Open shift of the logged-in cashier, shared by the opening gate and the "Cajero Activo" indicator. */
export function useMyCashShift(enabled = true) {
  const query = useQuery({
    queryKey: queryKeys.myCashShift,
    queryFn: getMyCashShift,
    enabled,
    staleTime: 30_000,
  })

  let state: CashShiftState = 'checking'
  if (query.isSuccess) state = 'open'
  else if (isApiError(query.error) && query.error.status === 404) state = 'closed'
  else if (query.isError) state = 'unknown'

  return { ...query, state }
}
