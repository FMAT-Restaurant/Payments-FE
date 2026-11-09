import { jwtDecode } from 'jwt-decode'
import { isRole, type Role } from './roles'

/** Claim names accepted for each field: plain JWT names and the ASP.NET Core (Microsoft) URIs. */
const ROLE_CLAIMS = ['role', 'roles', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
const NAME_CLAIMS = [
  'name',
  'unique_name',
  'preferred_username',
  'given_name',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
]
const ID_CLAIMS = ['sub', 'nameid', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']

export interface SessionUser {
  id: string
  name: string
  roles: Role[]
  /** Expiration in epoch seconds, when the token carries `exp`. */
  expiresAt: number | null
}

type Claims = Record<string, unknown>

const firstString = (claims: Claims, keys: string[]): string | null => {
  for (const key of keys) {
    const value = claims[key]
    if (typeof value === 'string' && value.trim() !== '') return value
    if (typeof value === 'number') return String(value)
  }
  return null
}

const readRoles = (claims: Claims): Role[] => {
  const values = ROLE_CLAIMS.flatMap((key) => {
    const value = claims[key]
    return Array.isArray(value) ? value : [value]
  })
  return [...new Set(values.filter(isRole))]
}

/** Reads the session from the JWT. The signature is validated by Kong and the Backend, not by the browser. */
export function readSessionUser(token: string): SessionUser | null {
  let claims: Claims
  try {
    claims = jwtDecode<Claims>(token)
  } catch {
    return null
  }

  const id = firstString(claims, ID_CLAIMS)
  if (!id) return null

  return {
    id,
    name: firstString(claims, NAME_CLAIMS) ?? id.slice(0, 8),
    roles: readRoles(claims),
    expiresAt: typeof claims.exp === 'number' ? claims.exp : null,
  }
}

export const isExpired = (user: SessionUser, nowMs: number = Date.now()): boolean =>
  user.expiresAt !== null && user.expiresAt * 1000 <= nowMs
