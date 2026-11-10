import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { CashShiftWire } from '../../api/contracts/cashShift'
import { routes } from '../../app/router'
import { ROUTES } from '../../app/routes'
import { ROLES } from '../../auth/roles'
import { server } from '../../test/server'
import { makeUserToken, renderWithProviders } from '../../test/utils'
import { toastStore } from '../notifications/toastStore'
import { cashShiftGate, requireCashShiftOpening, resolveCashShiftOpening } from './cashShiftGate'
import { INITIAL_AMOUNT_MESSAGE } from './CashShiftOpeningModal'

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

const activeShift: CashShiftWire = {
  cash_shift_id: 'cs-1',
  cashier_name: 'Edwing Molina',
  opened_at: '2026-11-08T08:00:00Z',
  opening_float: 1000,
}

interface MockOptions {
  shiftOpen?: boolean
  openAnswer?: 'created' | 'already-open'
}

function mockShiftApi({ shiftOpen = false, openAnswer = 'created' }: MockOptions = {}) {
  const calls = { me: 0, openBodies: [] as unknown[] }
  let open = shiftOpen
  server.use(
    http.get(url('/cash-shifts/me'), () => {
      calls.me += 1
      return open
        ? HttpResponse.json(activeShift)
        : HttpResponse.json({ code: 'CASH_SHIFT_NOT_FOUND', message: 'Sin turno' }, { status: 404 })
    }),
    http.post(url('/cash-shifts/open'), async ({ request }) => {
      calls.openBodies.push(await request.json())
      open = true
      return openAnswer === 'created'
        ? HttpResponse.json({ cash_shift_id: 'cs-1', status: 'OPEN', message: 'Turno abierto' }, { status: 201 })
        : HttpResponse.json(
            { code: 'CASH_SHIFT_ALREADY_OPEN', message: 'Ya tienes un turno de caja abierto en otra sesión' },
            { status: 409 },
          )
    }),
  )
  return calls
}

const renderAt = (route: string) =>
  renderWithProviders(null, { routes, route, token: makeUserToken(ROLES.CASHIER, 'Edwing Molina') })

const openingDialog = () => screen.findByRole('dialog', { name: 'Apertura de Turno de Caja' })

afterEach(() => {
  act(() => {
    resolveCashShiftOpening()
    toastStore.setState([])
  })
})

describe('PMC-22 · Apertura de turno de caja', () => {
  it('Scenario 1: apertura exitosa de turno operativo', async () => {
    const calls = mockShiftApi()
    const user = userEvent.setup()
    renderAt(ROUTES.cashTray)

    const dialog = await openingDialog()
    expect(calls.me).toBeGreaterThanOrEqual(1)
    expect(within(dialog).getByText('Inicio de Jornada')).toBeInTheDocument()
    const cashier = within(dialog).getByLabelText('Cajero responsable')
    expect(cashier).toHaveValue('Edwing Molina')
    expect(cashier).toBeDisabled()
    expect(screen.getByText('Caja Cerrada')).toBeInTheDocument()

    const fund = within(dialog).getByLabelText(/Fondo inicial en efectivo/)
    expect(fund).toHaveAttribute('placeholder', '$ 0.00')
    await user.type(fund, '1000.00')
    const openButton = within(dialog).getByRole('button', { name: 'Abrir turno' })
    await waitFor(() => expect(openButton).toBeEnabled())
    await user.click(openButton)

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls.openBodies).toEqual([{ opening_float: 1000 }])
    expect(await screen.findByText('Cajero Activo: Edwing Molina')).toBeInTheDocument()
  })

  it.each([
    ['empty', ''],
    ['negative', '-100'],
  ])('Scenario 2: rejects a %s initial fund', async (_case, value) => {
    mockShiftApi()
    const user = userEvent.setup()
    renderAt(ROUTES.cashTray)
    const dialog = await openingDialog()

    const fund = within(dialog).getByLabelText(/Fondo inicial en efectivo/)
    await user.click(fund)
    if (value) await user.type(fund, value)
    await user.tab()

    expect(await within(dialog).findByText(INITIAL_AMOUNT_MESSAGE)).toBeInTheDocument()
    expect(fund).toHaveAttribute('aria-invalid', 'true')
    expect(within(dialog).getByRole('button', { name: 'Abrir turno' })).toBeDisabled()
  })

  it('accepts a fund of 0', async () => {
    mockShiftApi()
    const user = userEvent.setup()
    renderAt(ROUTES.cashTray)
    const dialog = await openingDialog()

    await user.type(within(dialog).getByLabelText(/Fondo inicial en efectivo/), '0')

    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Abrir turno' })).toBeEnabled())
  })

  it('Scenario 3: cancelación de la apertura de caja', async () => {
    mockShiftApi()
    const user = userEvent.setup()
    const { router } = renderAt(ROUTES.cashTray)
    const dialog = await openingDialog()

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    expect(router.state.location.pathname).toBe(ROUTES.menu)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Scenario 4: recuperación concurrente de turno abierto (HTTP 409)', async () => {
    const calls = mockShiftApi({ openAnswer: 'already-open' })
    const user = userEvent.setup()
    renderAt(ROUTES.cashTray)
    const dialog = await openingDialog()

    await user.type(within(dialog).getByLabelText(/Fondo inicial en efectivo/), '500.00')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Abrir turno' })).toBeEnabled())
    const meCallsBefore = calls.me
    await user.click(within(dialog).getByRole('button', { name: 'Abrir turno' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(calls.me).toBeGreaterThan(meCallsBefore)
    expect(screen.getByText('Ya tienes un turno de caja abierto en otra sesión')).toBeInTheDocument()
    expect(await screen.findByText('Cajero Activo: Edwing Molina')).toBeInTheDocument()
  })

  it('does not block the tray when the shift is already open', async () => {
    mockShiftApi({ shiftOpen: true })
    renderAt(ROUTES.cashTray)

    expect(await screen.findByText('Cajero Activo: Edwing Molina')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not ask for the shift on screens that do not need it', async () => {
    const calls = mockShiftApi()
    renderAt(ROUTES.menu)

    await screen.findByRole('heading', { name: 'FMAT-RESTAURANT' })
    expect(calls.me).toBe(0)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('AC5: opens the modal anywhere after a 403 CASH_SHIFT_NOT_OPEN and keeps the user on that screen', async () => {
    mockShiftApi()
    const user = userEvent.setup()
    const { router } = renderAt(ROUTES.salesHistory)
    await screen.findByRole('heading', { name: 'Historial de Ventas' })

    act(() => requireCashShiftOpening())
    const dialog = await openingDialog()
    await user.type(within(dialog).getByLabelText(/Fondo inicial en efectivo/), '250')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Abrir turno' })).toBeEnabled())
    await user.click(within(dialog).getByRole('button', { name: 'Abrir turno' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(cashShiftGate.getState().openingRequired).toBe(false)
    expect(router.state.location.pathname).toBe(ROUTES.salesHistory)
  })
})
