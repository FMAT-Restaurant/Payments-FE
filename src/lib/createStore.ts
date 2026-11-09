import { useSyncExternalStore } from 'react'

export interface Store<T> {
  getState: () => T
  setState: (next: T | ((previous: T) => T)) => void
  subscribe: (listener: () => void) => () => void
}

/**
 * Minimal external store. It lets non-React code (the HTTP interceptor) publish state
 * that React components read with `useStore`.
 */
export function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState: (next) => {
      state = typeof next === 'function' ? (next as (previous: T) => T)(state) : next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}
