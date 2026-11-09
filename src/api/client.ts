import { authNavigation, SESSION_EXPIRED_REDIRECT_DELAY_MS } from '../auth/navigation'
import { tokenStorage } from '../auth/tokenStorage'
import { env } from '../config/env'
import { requireCashShiftOpening } from '../features/cash-shift/cashShiftGate'
import { notify } from '../features/notifications/toastStore'
import { createHttpClient } from './httpClient'

let sessionExpiring = false

/** Shared HTTP client of the module. Feature code imports this instance, never axios directly. */
export const httpClient = createHttpClient({
  baseURL: env.apiBaseUrl,
  getToken: tokenStorage.get,
  onSessionExpired: (message) => {
    // Parallel requests can all fail with 401; show the message and redirect only once.
    if (sessionExpiring) return
    sessionExpiring = true
    notify.warning(message)
    tokenStorage.clear()
    window.setTimeout(authNavigation.toLogin, SESSION_EXPIRED_REDIRECT_DELAY_MS)
  },
  onPasswordChangeRequired: (error) => {
    notify.warning(error.message)
    authNavigation.toChangePassword()
  },
  onCashShiftNotOpen: (error) => {
    notify.error(error.message)
    requireCashShiftOpening()
  },
  onError: (error) => notify.error(error.message),
})
