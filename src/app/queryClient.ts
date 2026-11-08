import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '../api/errors'

const MAX_RETRIES = 2

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 4xx answers (validation, permissions, missing shift) do not change by retrying.
        retry: (failureCount, error) => !(isApiError(error) && error.isClientError) && failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}
