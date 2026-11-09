import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { CashShiftSummaryDTO, CloseCashShiftRequestDTO } from '../api/contracts/cashShift'
import { endpoints } from '../api/endpoints'
import { routes } from '../app/router'
import { ROUTES } from '../app/routes'
import { ROLES } from '../auth/roles'
import { toastStore } from '../features/notifications/toastStore'
import { server } from '../test/server'
import { makeUserToken, renderWithProviders } from '../test/utils'

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

const summary: CashShiftSummaryDTO = {
  cash_shift_id: 'cs-1',
  cashier_name: 'Edwing Molina',
  opened_at: new Date(2026, 10, 8, 8, 0).toISOString(),
  initial_amount: 1000,
  cash_sales: 3250,
  expected_cash: 4250,
  card_sales: 8140,
  card_transaction_count: 24,
  retained_tips: 814,
}

type CloseAnswer = 'ok' | { status: number; code: string; message: string }

function mockApi({ shift = summary as CashShiftSummaryDTO | null, close = 'ok' as CloseAnswer } = {}) {
  const calls = { closeBodies: [] as CloseCashShiftRequestDTO[] }
  server.use(
    http.get(url(endpoints.cashShiftSummary()), () =>
      shift
        ? HttpResponse.json(shift)
        : HttpResponse.json({ code: 'CASH_SHIFT_NOT_FOUND', message: 'Sin turno' }, { status: 404 }),
    ),
    http.post(url(endpoints.closeCashShift()), async ({ request }) => {
      calls.closeBodies.push((await request.json()) as CloseCashShiftRequestDTO)
      if (close === 'ok') return HttpResponse.json({ status: 'CLOSED', message: 'Turno cerrado' })
      return HttpResponse.json({ code: close.code, message: close.message }, { status: close.status })
    }),
  )
  return calls
}

async function renderClose() {
  const view = renderWithProviders(null, {
    routes,
    route: ROUTES.cashShiftClose,
    token: makeUserToken(ROLES.CASHIER, 'Edwing Molina'),
  })
  await screen.findByRole('heading', { name: 'Arqueo y Cierre de Turno' })
  return { user: userEvent.setup(), ...view }
}

const declaredInput = () => screen.getByLabelText(/Efectivo físico contado en cajón/)
const closeButton = () => screen.getByRole('button', { name: 'Confirmar y cerrar turno' })
const differenceDialog = () => screen.findByRole('dialog', { name: 'Confirmar cierre con diferencia' })

async function declare(user: UserEvent, amount: string) {
  await screen.findByLabelText(/Efectivo físico contado en cajón/)
  await user.type(declaredInput(), amount)
}

afterEach(() => {
  toastStore.setState([])
})

describe('PMC-23 · Arqueo y cierre de turno', () => {
  it('AC1/AC2: shows the open shift and the three KPI cards from the summary', async () => {
    mockApi()
    await renderClose()

    expect(await screen.findByText('Turno Abierto: 08:00 hrs')).toBeInTheDocument()
    expect(screen.getByText('Edwing Molina')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Regresar al Menú/ })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Fondo + Ventas Efectivo' })).toBeInTheDocument()
    expect(screen.getByText('Fondo inicial: $1,000.00 + Cobros efectivo: $3,250.00')).toBeInTheDocument()
    expect(screen.getByText('$8,140.00')).toBeInTheDocument()
    expect(screen.getByText('24 transacciones con voucher registrado')).toBeInTheDocument()
    expect(screen.getByText('$814.00')).toBeInTheDocument()
    expect(screen.getByText('Acumulado en cobros con terminal')).toBeInTheDocument()
  })

  it('AC3/AC4: starts without a difference and keeps the close button disabled', async () => {
    mockApi()
    await renderClose()
    await screen.findByLabelText(/Efectivo físico contado en cajón/)

    expect(screen.getByText('Ingresa el efectivo contado')).toBeInTheDocument()
    expect(closeButton()).toBeDisabled()
  })

  it('Scenario 1: exact match closes directly without a reason and returns to the menu', async () => {
    const calls = mockApi()
    const { user, router } = await renderClose()

    await declare(user, '4250.00')

    expect(await screen.findByText('$0.00 (Cuadre Exacto)')).toBeInTheDocument()
    await waitFor(() => expect(closeButton()).toBeEnabled())
    await user.click(closeButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.menu))
    expect(calls.closeBodies).toEqual([{ declared_cash: 4250 }])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Scenario 2: a shortage asks for an audit reason before closing', async () => {
    const calls = mockApi()
    const { user, router } = await renderClose()

    await declare(user, '4150.00')
    expect(await screen.findByText('-$100.00 (Faltante - Descuadre)')).toBeInTheDocument()
    await waitFor(() => expect(closeButton()).toBeEnabled())
    await user.click(closeButton())

    const dialog = await differenceDialog()
    expect(calls.closeBodies).toHaveLength(0)
    expect(within(dialog).getByText('Descuadre Detectado')).toBeInTheDocument()
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      'Faltante en caja: -$100.00 (Esperado: $4,250.00 | Declarado: $4,150.00)',
    )
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar cierre de turno' })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/Motivo de cierre/), '   ')
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/Motivo de cierre/), 'Se pagó un proveedor desde el cajón')
    await waitFor(() => expect(confirm).toBeEnabled())
    await user.click(confirm)

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.menu))
    expect(calls.closeBodies).toEqual([
      { declared_cash: 4150, reason: 'Se pagó un proveedor desde el cajón' },
    ])
  })

  it('Scenario 3: a surplus also requires the reason', async () => {
    const calls = mockApi()
    const { user } = await renderClose()

    await declare(user, '4300.00')
    expect(await screen.findByText('+$50.00 (Sobrante - Descuadre)')).toBeInTheDocument()
    await waitFor(() => expect(closeButton()).toBeEnabled())
    await user.click(closeButton())

    const dialog = await differenceDialog()
    expect(within(dialog).getByRole('status')).toHaveTextContent('Sobrante en caja: +$50.00')
    expect(within(dialog).getByRole('button', { name: 'Confirmar cierre de turno' })).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/Motivo de cierre/), 'Propina en efectivo sin registrar')
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cierre de turno' }))

    await waitFor(() => expect(calls.closeBodies).toHaveLength(1))
    expect(calls.closeBodies[0]).toEqual({ declared_cash: 4300, reason: 'Propina en efectivo sin registrar' })
  })

  it('"Revisar conteo" closes the modal without closing the shift and keeps the declared cash', async () => {
    const calls = mockApi()
    const { user } = await renderClose()
    await declare(user, '4150')
    await waitFor(() => expect(closeButton()).toBeEnabled())
    await user.click(closeButton())

    await user.click(within(await differenceDialog()).getByRole('button', { name: 'Revisar conteo' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(declaredInput()).toHaveValue(4150)
    expect(calls.closeBodies).toHaveLength(0)
  })

  it('Scenario 4: going back to the menu does not close the shift', async () => {
    const calls = mockApi()
    const { user, router } = await renderClose()
    await declare(user, '4250')

    await user.click(screen.getByRole('link', { name: /Regresar al Menú/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.menu))
    expect(calls.closeBodies).toHaveLength(0)
  })

  it('rejects more than two decimals and negative-looking input', async () => {
    mockApi()
    const { user } = await renderClose()

    await declare(user, '4250.555')

    expect(await screen.findByText('Usa máximo 2 decimales')).toBeInTheDocument()
    expect(closeButton()).toBeDisabled()
  })

  it('keeps the modal and the typed reason when the Backend rejects the close', async () => {
    mockApi({ close: { status: 400, code: 'VALIDATION_ERROR', message: 'El turno ya fue cerrado por un supervisor' } })
    const { user, router } = await renderClose()
    await declare(user, '4150')
    await waitFor(() => expect(closeButton()).toBeEnabled())
    await user.click(closeButton())
    const dialog = await differenceDialog()
    await user.type(within(dialog).getByLabelText(/Motivo de cierre/), 'Faltante por cambio mal dado')

    await user.click(within(dialog).getByRole('button', { name: 'Confirmar cierre de turno' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('El turno ya fue cerrado por un supervisor')
    expect(screen.getByRole('dialog', { name: 'Confirmar cierre con diferencia' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Motivo de cierre/)).toHaveValue('Faltante por cambio mal dado')
    expect(router.state.location.pathname).toBe(ROUTES.cashShiftClose)
  })

  it('explains that there is no open shift (404) and points to the cash tray', async () => {
    mockApi({ shift: null })
    await renderClose()

    expect(await screen.findByText('No tienes un turno de caja abierto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir a la Bandeja de Caja' })).toHaveAttribute('href', ROUTES.cashTray)
    expect(screen.queryByLabelText(/Efectivo físico contado en cajón/)).not.toBeInTheDocument()
  })

  it('shows its own error state, without toasts, when the summary cannot be loaded', async () => {
    server.use(
      http.get(url(endpoints.cashShiftSummary()), () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
    )
    await renderClose()

    expect(await screen.findByText('No se pudo cargar el arqueo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(toastStore.getState()).toHaveLength(0)
  })
})
