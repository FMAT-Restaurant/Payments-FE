import { useEffect, type ReactNode } from 'react'
import { EmptyState } from '../components/ui'
import { useAuth } from './AuthContext'
import { authNavigation } from './navigation'
import type { Permission, Role } from './roles'

interface RequireAuthProps {
  children: ReactNode
  /** Roles allowed to see the content. Defaults to any valid role of the module. */
  roles?: readonly Role[]
  onUnauthenticated?: () => void
}

/** Route guard: without a valid JWT the user goes to the Auth login; without a valid role, the module is locked. */
export function RequireAuth({ children, roles, onUnauthenticated = authNavigation.toLogin }: Readonly<RequireAuthProps>) {
  const { user, isAuthenticated, hasAnyRole } = useAuth()

  useEffect(() => {
    if (!isAuthenticated) onUnauthenticated()
  }, [isAuthenticated, onUnauthenticated])

  if (!isAuthenticated) {
    return <EmptyState title="Redirigiendo al inicio de sesión..." />
  }

  const allowed = roles ? hasAnyRole(roles) : (user?.roles.length ?? 0) > 0
  if (!allowed) {
    return (
      <EmptyState
        title="No tienes acceso a este módulo"
        description="Tu rol no tiene permisos para Cuenta y Pagos. Contacta a un Administrador."
      />
    )
  }

  return <>{children}</>
}

interface CanProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

/** Renders role-restricted controls only for the users allowed to use them (e.g. "Exportar CSV"). */
export function Can({ permission, children, fallback = null }: Readonly<CanProps>) {
  const { can } = useAuth()
  return <>{can(permission) ? children : fallback}</>
}
