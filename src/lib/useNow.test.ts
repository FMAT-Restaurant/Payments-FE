import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

afterEach(() => vi.useRealTimers())

describe('useNow', () => {
  it('refreshes the time on every interval and stops on unmount', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-08T12:00:00.000Z'))
    const { result, unmount } = renderHook(() => useNow(30_000))
    const first = result.current

    act(() => vi.advanceTimersByTime(30_000))
    expect(result.current).toBe(first + 30_000)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
