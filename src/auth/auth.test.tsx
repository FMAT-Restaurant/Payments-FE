import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { futureExp, makeToken, makeUserToken, renderWithProviders } from '../test/utils'
import { useAuth } from './AuthContext'
import { isExpired, readSessionUser } from './claims'
import { Can, RequireAuth } from './guards'
import { hasPermission, ROLES } from './roles'

describe('readSessionUser (JWT claims)', () => {
  it('reads id, name and roles from standard claims', () => {
    const user = readSessionUser(makeToken({ sub: 'u-1', name: 'Ana Pérez', role: 'Cajero', exp: 2000000000 }))

    expect(user).toEqual({ id: 'u-1', name: 'Ana Pérez', roles: [ROLES.CASHIER], expiresAt: 2000000000 })
  })

  it('reads ASP.NET Core claim URIs and role arrays', () => {
    const user = readSessionUser(
      makeToken({
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'u-2',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'Luis',
        'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': ['Gerente', 'Administrador'],
      }),
    )

    expect(user).toMatchObject({ id: 'u-2', name: 'Luis', roles: [ROLES.MANAGER, ROLES.ADMIN], expiresAt: null })
  })

  it('ignores roles that do not exist in the module ("Admin", "Contador")', () => {
    const user = readSessionUser(makeToken({ sub: 'u-3', roles: ['Admin', 'Contador', 'Cajero'] }))

    expect(user?.roles).toEqual([ROLES.CASHIER])
  })

  it('uses the abbreviated id when the token has no name', () => {
    expect(readSessionUser(makeToken({ sub: '7f3c9a10-5b2e-4d8f' }))?.name).toBe('7f3c9a10')
  })

  it('returns null for malformed tokens or tokens without subject', () => {
    expect(readSessionUser('not-a-jwt')).toBeNull()
    expect(readSessionUser(makeToken({ name: 'Sin id' }))).toBeNull()
  })

  it('detects expired tokens', () => {
    const user = readSessionUser(makeToken({ sub: 'u', exp: 100 }))!
    expect(isExpired(user, 100_000)).toBe(true)
    expect(isExpired(user, 99_000)).toBe(false)
  })
})

describe('permissions (AC4 RBAC)', () => {
  it('allows the CSV export only to Administrador', () => {
    expect(hasPermission([ROLES.ADMIN], 'exportSales')).toBe(true)
    expect(hasPermission([ROLES.MANAGER], 'exportSales')).toBe(false)
    expect(hasPermission([ROLES.CASHIER], 'exportSales')).toBe(false)
  })

  it('allows the forced cash shift close to Administrador and Gerente', () => {
    expect(hasPermission([ROLES.ADMIN], 'forceCloseCashShift')).toBe(true)
    expect(hasPermission([ROLES.MANAGER], 'forceCloseCashShift')).toBe(true)
    expect(hasPermission([ROLES.CASHIER], 'forceCloseCashShift')).toBe(false)
  })
})

function ExportButton() {
  return (
    <Can permission="exportSales" fallback={<span>sin exportación</span>}>
      <button type="button">↓ Exportar CSV</button>
    </Can>
  )
}

describe('<Can />', () => {
  it.each([
    [ROLES.ADMIN, true],
    [ROLES.MANAGER, false],
    [ROLES.CASHIER, false],
  ])('renders "Exportar CSV" for %s: %s', (role, visible) => {
    renderWithProviders(<ExportButton />, { token: makeUserToken(role) })

    expect(screen.queryByRole('button', { name: '↓ Exportar CSV' }) !== null).toBe(visible)
  })
})

describe('<RequireAuth />', () => {
  it('redirects to login when there is no token', () => {
    const onUnauthenticated = vi.fn()
    renderWithProviders(
      <RequireAuth onUnauthenticated={onUnauthenticated}>
        <p>contenido</p>
      </RequireAuth>,
    )

    expect(onUnauthenticated).toHaveBeenCalledOnce()
    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
  })

  it('treats an expired token as no session', () => {
    const onUnauthenticated = vi.fn()
    renderWithProviders(
      <RequireAuth onUnauthenticated={onUnauthenticated}>
        <p>contenido</p>
      </RequireAuth>,
      { token: makeToken({ sub: 'u', role: 'Cajero', exp: 1 }) },
    )

    expect(onUnauthenticated).toHaveBeenCalledOnce()
  })

  it('blocks users without a role of the module', () => {
    renderWithProviders(
      <RequireAuth onUnauthenticated={vi.fn()}>
        <p>contenido</p>
      </RequireAuth>,
      { token: makeToken({ sub: 'u', role: 'Contador', exp: futureExp() }) },
    )

    expect(screen.getByText('No tienes acceso a este módulo')).toBeInTheDocument()
  })

  it('restricts content to the given roles', () => {
    renderWithProviders(
      <RequireAuth roles={[ROLES.ADMIN]} onUnauthenticated={vi.fn()}>
        <p>contenido</p>
      </RequireAuth>,
      { token: makeUserToken(ROLES.CASHIER) },
    )

    expect(screen.queryByText('contenido')).not.toBeInTheDocument()
  })

  it('renders the content for a valid session', () => {
    renderWithProviders(
      <RequireAuth onUnauthenticated={vi.fn()}>
        <p>contenido</p>
      </RequireAuth>,
      { token: makeUserToken(ROLES.CASHIER) },
    )

    expect(screen.getByText('contenido')).toBeInTheDocument()
  })
})

function WhoAmI() {
  const { user, hasRole } = useAuth()
  return <p>{user ? `${user.name} ${hasRole(ROLES.CASHIER) ? 'es cajero' : ''}` : 'sin sesión'}</p>
}

describe('AuthProvider', () => {
  it('drops the session when the token expires', () => {
    vi.useFakeTimers()
    const exp = Math.floor(Date.now() / 1000) + 60
    renderWithProviders(<WhoAmI />, { token: makeToken({ sub: 'u', name: 'Ana', role: 'Cajero', exp }) })
    expect(screen.getByText('Ana es cajero')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(61_000))

    expect(screen.getByText('sin sesión')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('throws a clear error when useAuth is used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<WhoAmI />)).toThrow('useAuth must be used inside <AuthProvider>')
  })
})
