import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

afterEach(() => vi.useRealTimers())

describe('useDebouncedValue', () => {
  it('publishes the value only after the delay without changes', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
      initialProps: { value: '' },
    })

    rerender({ value: 'b' })
    act(() => vi.advanceTimersByTime(200))
    rerender({ value: 'ba' })
    act(() => vi.advanceTimersByTime(299))
    expect(result.current).toBe('')

    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('ba')
  })
})
