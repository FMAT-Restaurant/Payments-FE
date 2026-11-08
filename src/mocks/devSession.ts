import { tokenStorage } from '../auth/tokenStorage'
import { isRole, ROLES } from '../auth/roles'

const base64Url = (value: object): string =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

const EIGHT_HOURS_S = 8 * 60 * 60

/**
 * Development only: stores an unsigned JWT so the module can run without the Shell and the Auth service.
 * It is never used against a real API Gateway, which validates the signature.
 */
export function createDevSession(role: string): void {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: '7f3c9a10-5b2e-4d8f-9c61-2a4b8e0d1f35',
    name: 'Edwing Molina',
    role: isRole(role) ? role : ROLES.CASHIER,
    iat: now,
    exp: now + EIGHT_HOURS_S,
  }
  tokenStorage.set(`${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url(payload)}.`)
}
