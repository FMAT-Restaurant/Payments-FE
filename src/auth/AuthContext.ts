import { createContext, useContext } from 'react'
import type { SessionUser } from './claims'
import type { Permission, Role } from './roles'

export interface AuthContextValue {
  /** `null` when there is no valid, unexpired token. */
  user: SessionUser | null
  isAuthenticated: boolean
  hasRole: (role: Role) => boolean
  hasAnyRole: (roles: readonly Role[]) => boolean
  can: (permission: Permission) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return context
}
