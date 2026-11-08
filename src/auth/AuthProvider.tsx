import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { isExpired, readSessionUser, type SessionUser } from './claims'
import { hasPermission } from './roles'
import { tokenStorage } from './tokenStorage'

const MAX_TIMEOUT_MS = 2_147_483_647

const loadUser =(getToken: () => string | null): SessionUser | null => {
  const token = getToken()
  if (!token) return null
  const user = readSessionUser(token)
  return user && !isExpired(user) ? user : null
}

interface AuthProviderProps {
  children: ReactNode
  /** Injectable for tests; defaults to the token left by the App Shell. */
  getToken?: () => string | null
}

export function AuthProvider({ children, getToken = tokenStorage.get }: AuthProviderProps) {
  const [user, setUser] = useState(() => loadUser(getToken))

  // Login, logout or token refresh made by the Shell in another tab.
  useEffect(() => {
    const refresh = () => setUser(loadUser(getToken))
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [getToken])

  // Drop the session as soon as the token expires.
  useEffect(() => {
    if (!user?.expiresAt) return
    const delay = Math.max(user.expiresAt * 1000 - Date.now(), 0)
    // setTimeout overflows above ~24.8 days and would fire immediately.
    if (delay > MAX_TIMEOUT_MS) return
    const timer = window.setTimeout(() => setUser(null), delay)
    return () => window.clearTimeout(timer)
  }, [user])

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? []
    return {
      user,
      isAuthenticated: user !== null,
      hasRole: (role) => roles.includes(role),
      hasAnyRole: (allowed) => allowed.some((role) => roles.includes(role)),
      can: (permission) => hasPermission(roles, permission),
    }
  }, [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
