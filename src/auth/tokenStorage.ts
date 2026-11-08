import { env } from '../config/env'

/** The JWT is issued by the Auth microservice; the App Shell leaves it in localStorage. */
export const tokenStorage = {
  get(): string | null {
    try {
      return window.localStorage.getItem(env.tokenStorageKey)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      window.localStorage.setItem(env.tokenStorageKey, token)
    } catch {
      // Storage unavailable (private mode); the session simply will not persist.
    }
  },
  clear(): void {
    try {
      window.localStorage.removeItem(env.tokenStorageKey)
    } catch {
      // Nothing to clear.
    }
  },
}
