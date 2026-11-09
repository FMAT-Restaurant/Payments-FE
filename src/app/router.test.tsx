import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ROLES } from '../auth/roles'
import { makeUserToken, renderWithProviders } from '../test/utils'
import { routes } from './router'
import { chargePath, ROUTES } from './routes'

describe('module router', () => {
  it('redirects the root to the menu and shows the module sections', () => {
    const { router } = renderWithProviders(null, { routes, route: '/', token: makeUserToken(ROLES.CASHIER) })

    expect(router.state.location.pathname).toBe(ROUTES.menu)
    expect(screen.getByRole('heading', { level: 1, name: 'FMAT-RESTAURANT' })).toBeInTheDocument()
    expect(screen.getByText(/Cajero: Edwing Molina/)).toBeInTheDocument()
    const sections = screen.getByRole('navigation', { name: 'Secciones de Cuenta y Pagos' })
    expect(within(sections).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      ROUTES.cashTray,
      ROUTES.cashShiftClose,
      ROUTES.salesHistory,
    ])
    expect(screen.getByRole('link', { name: 'Bandeja de Caja' })).toBeInTheDocument()
  })

  it('does not render a sidebar or topbar of its own (the Shell owns them)', () => {
    renderWithProviders(null, { routes, route: ROUTES.menu, token: makeUserToken(ROLES.ADMIN) })

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getAllByRole('main')).toHaveLength(1)
  })

  it('navigates from a menu card and back to the menu', async () => {
    const user = userEvent.setup()
    const { router } = renderWithProviders(null, { routes, route: ROUTES.menu, token: makeUserToken(ROLES.CASHIER) })

    await user.click(screen.getByRole('link', { name: 'Historial de Ventas' }))
    expect(router.state.location.pathname).toBe(ROUTES.salesHistory)
    expect(screen.getByRole('heading', { name: 'Historial de Ventas' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /Regresar al Menú/ }))
    expect(router.state.location.pathname).toBe(ROUTES.menu)
  })

  it('keeps the charge route of PMC-20 and shows a not found page for unknown paths', () => {
    expect(chargePath('SESSION_123')).toBe('/payments/charge/SESSION_123')

    renderWithProviders(null, { routes, route: '/no-existe', token: makeUserToken(ROLES.CASHIER) })
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument()
  })
})
