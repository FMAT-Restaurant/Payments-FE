import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/errors'
import { createQueryClient } from './queryClient'

const retry = createQueryClient().getDefaultOptions().queries?.retry as (count: number, error: unknown) => boolean

describe('createQueryClient', () => {
  it('does not retry 4xx answers', () => {
    expect(retry(0, new ApiError(404, 'NOT_FOUND', 'No encontrado'))).toBe(false)
    expect(retry(0, new ApiError(403, 'CASH_SHIFT_NOT_OPEN', 'Abre caja'))).toBe(false)
  })

  it('retries network and server errors up to two times', () => {
    const networkError = new ApiError(null, 'NETWORK_ERROR', 'Sin conexión')
    expect(retry(0, networkError)).toBe(true)
    expect(retry(1, new ApiError(503, 'INTERNAL_ERROR', 'Error'))).toBe(true)
    expect(retry(2, networkError)).toBe(false)
  })
})
