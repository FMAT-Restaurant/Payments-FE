import { env } from '../config/env'

/** Login and password change screens belong to the Auth microservice, outside this module's router. */
export const authNavigation = {
  toLogin: () => window.location.assign(env.authLoginUrl),
  toChangePassword: () => window.location.assign(env.authChangePasswordUrl),
}

/** Time the "session expired" message stays on screen before leaving the module. */
export const SESSION_EXPIRED_REDIRECT_DELAY_MS = 2000
