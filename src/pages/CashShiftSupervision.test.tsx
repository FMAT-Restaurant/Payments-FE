import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type {
  CashShiftSummaryDTO,
  ForceCloseCashShiftRequestDTO,
  OpenCashShiftItemDTO,
} from '../api/contracts/cashShift'
import { endpoints } from '../api/endpoints'
import { routes } from '../app/router'
import { ROUTES, supervisionDetailPath } from '../app/routes'
import { ROLES } from '../auth/roles'
import { toastStore } from '../features/notifications/toastStore'
import { server } from '../test/server'
import { makeUserToken, renderWithProviders } from '../test/utils'

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

const ana: OpenCashShiftItemDTO = {
  cash_shift_id: 'cs-ana-0001',
  cashier_name: 'Ana M.',
  opened_at: new Date(2026, 10, 4, 8, 30).toISOString(),
  opening_float: 1000,
}
const carlos: OpenCashShiftItemDTO = {
  cash_shift_id: 'cs-carlos-0002',
  cashier_name: 'Carlos R.',
  opened_at: new Date(2026, 10, 3, 15, 45).toISOString(),
  opening_float: 500,
}
const carlosSummary: CashShiftSummaryDTO = {
  cash_shift_id: carlos.cash_shift_id,
  cashier_name: carlos.cashier_name,
  opened_at: carlos.opened_at,
  initial_amount: 500,
  cash_sales: 2950,
  expected_cash: 3450,
  card_sales: 5120,
  card_transaction_count: 18,
  retained_tips: 512,
}

type ForceCloseAnswer = 'ok' | { status: number; code: string; message: string }

function mockApi({
  list = [ana, carlos] as OpenCashShiftItemDTO[] | { status: number; code: string; message: string },
  summary = carlosSummary as CashShiftSummaryDTO | null,
  forceClose = 'ok' as ForceCloseAnswer,
} = {}) {
  const calls = { bodies: [] as ForceCloseCashShiftRequestDTO[], closedIds: [] as string[] }
  let open = Array.isArray(list) ? [...list] : []

  server.use(
    http.get(url(endpoints.openCashShifts()), () =>
      Array.isArray(list)
        ? HttpResponse.json(open)
        : HttpResponse.json({ code: list.code, message: list.message }, { status: list.status }),
    ),
    http.get(url('/cash-shifts/:cashShiftId/summary'), () =>
      summary
        ? HttpResponse.json(summary)
        : HttpResponse.json({ code: 'CASH_SHIFT_NOT_FOUND', message: 'No existe' }, { status: 404 }),
    ),
    http.post(url('/cash-shifts/:cashShiftId/force-close'), async ({ params, request }) => {
      calls.bodies.push((await request.json()) as ForceCloseCashShiftRequestDTO)
      calls.closedIds.push(String(params.cashShiftId))
      if (forceClose !== 'ok') {
        return HttpResponse.json({ code: forceClose.code, message: forceClose.message }, { status: forceClose.status })
      }
      open = open.filter((shift) => shift.cash_shift_id !== params.cashShiftId)
      return HttpResponse.json({ status: 'UNBALANCED', message: 'Turno cerrado con descuadre' })
    }),
  )
  return calls
}

const renderGrid = (role: string = ROLES.MANAGER) =>
  renderWithProviders(null, { routes, route: ROUTES.supervision, token: makeUserToken(role, 'Gerente Demo') })

async function renderDetail(role: string = ROLES.ADMIN) {
  const view = renderWithProviders(null, {
    routes,
    route: supervisionDetailPath(carlos.cash_shift_id),
    token: makeUserToken(role, 'Admin Demo'),
  })
  await screen.findByRole('heading', { name: 'Arqueo de Turno: Carlos R.' })
  return { user: userEvent.setup(), ...view }
}

const auditedInput = () => screen.getByLabelText(/Efectivo físico auditado en cajón/)
const reasonInput = () => screen.getByLabelText(/Motivo de cierre forzado/)
const executeButton = () => screen.getByRole('button', { name: 'Ejecutar cierre forzado' })

afterEach(() => {
  toastStore.setState([])
})

describe('PMC-31 · AC1 · protección por rol', () => {
  it('blocks the supervision route for a Cajero', async () => {
    mockApi()
    renderGrid(ROLES.CASHIER)

    expect(await screen.findByText('No tienes acceso a este módulo')).toBeInTheDocument()
    expect(screen.getByText('Solo un Administrador o un Gerente puede supervisar las cajas.')).toBeInTheDocument()
    expect(screen.queryByText(/Modo Supervisión/)).not.toBeInTheDocument()
  })

  it.each([ROLES.ADMIN, ROLES.MANAGER])('shows the menu entry for %s', (role) => {
    renderWithProviders(null, { routes, route: ROUTES.menu, token: makeUserToken(role) })

    expect(screen.getByRole('link', { name: 'Supervisión de Cajas' })).toHaveAttribute('href', ROUTES.supervision)
  })

  it('hides the menu entry for a Cajero', () => {
    renderWithProviders(null, { routes, route: ROUTES.menu, token: makeUserToken(ROLES.CASHIER) })

    expect(screen.queryByRole('link', { name: 'Supervisión de Cajas' })).not.toBeInTheDocument()
  })
})

describe('PMC-31 · AC2 · listado de turnos abiertos', () => {
  it('Scenario 1: renders one card per open shift with the supervision badge', async () => {
    mockApi()
    renderGrid()

    expect(await screen.findByRole('heading', { name: 'Supervisión de Cajas' })).toBeInTheDocument()
    expect(screen.getByText(/Modo Supervisión/)).toBeInTheDocument()

    const cards = await screen.findAllByRole('listitem')
    expect(cards).toHaveLength(2)
    const carlosCard = within(cards[1])
    expect(carlosCard.getByRole('heading', { name: 'Carlos R.' })).toBeInTheDocument()
    expect(carlosCard.getByText(/ID Turno: #cs-carlo/)).toBeInTheDocument()
    expect(carlosCard.getByText('$500.00')).toBeInTheDocument()
    expect(carlosCard.getByRole('link', { name: 'Ver arqueo y forzar cierre' })).toHaveAttribute(
      'href',
      supervisionDetailPath(carlos.cash_shift_id),
    )
  })

  it('shows an empty state when there are no open shifts', async () => {
    mockApi({ list: [] })
    renderGrid()

    expect(await screen.findByText('No hay turnos de caja abiertos')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
  })

  it('explains a 403 on the list without toasts', async () => {
    mockApi({ list: { status: 403, code: 'FORBIDDEN_ROLE', message: 'Sin permisos' } })
    renderGrid()

    expect(await screen.findByText('No tienes permisos para supervisar cajas')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers a retry when the list cannot be loaded', async () => {
    mockApi({ list: { status: 500, code: 'INTERNAL_ERROR', message: 'Error interno' } })
    renderGrid()

    expect(await screen.findByText('No se pudieron cargar los turnos abiertos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})

describe('PMC-31 · AC3/AC4 · arqueo ajeno y formulario de auditoría', () => {
  it('shows the same KPIs as the cashier close, with the supervision badge', async () => {
    mockApi()
    await renderDetail()

    expect(screen.getByText(/Modo Supervisión/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fondo + Ventas Efectivo' })).toBeInTheDocument()
    expect(screen.getByText('Fondo inicial: $500.00 + Cobros efectivo: $2,950.00')).toBeInTheDocument()
    expect(screen.getByText('$5,120.00')).toBeInTheDocument()
    expect(screen.getByText('18 transacciones con voucher registrado')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Propinas Retenidas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Auditoría y Declaración de Valores' })).toBeInTheDocument()
    expect(screen.getByText('Monto físico auditado')).toBeInTheDocument()
    expect(executeButton()).toBeDisabled()
  })

  it('explains that the shift is no longer open (404)', async () => {
    mockApi({ summary: null })
    renderWithProviders(null, {
      routes,
      route: supervisionDetailPath(carlos.cash_shift_id),
      token: makeUserToken(ROLES.ADMIN),
    })

    expect(await screen.findByText('Este turno ya no está abierto')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Supervisión' })).toHaveAttribute('href', ROUTES.supervision)
    expect(screen.queryByLabelText(/Efectivo físico auditado en cajón/)).not.toBeInTheDocument()
  })
})

describe('PMC-31 · AC5 · cierre forzado', () => {
  it('Scenario 2: closes with a shortage, sends snake_case and returns to the grid without that shift', async () => {
    const calls = mockApi()
    const { user, router } = await renderDetail()

    await user.type(auditedInput(), '3400.00')
    expect(await screen.findByText('-$50.00 (Faltante - Descuadre)')).toBeInTheDocument()
    expect(screen.getByText(/quedará registrado como DESCUADRADO/)).toBeInTheDocument()

    await user.type(reasonInput(), 'Cajero abandonó estación sin cerrar turno')
    await waitFor(() => expect(executeButton()).toBeEnabled())
    await user.click(executeButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.supervision))
    expect(calls.closedIds).toEqual([carlos.cash_shift_id])
    expect(calls.bodies).toEqual([
      { declared_cash: 3400, force_close_reason: 'Cajero abandonó estación sin cerrar turno' },
    ])
    expect(await screen.findAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('Carlos R.')).not.toBeInTheDocument()
    expect(screen.getByText('Ana M.')).toBeInTheDocument()
  })

  it('Scenario 3: a blank reason marks the field as invalid and keeps the button disabled', async () => {
    const calls = mockApi()
    const { user } = await renderDetail()

    await user.type(auditedInput(), '3450')
    await user.type(reasonInput(), '   ')

    expect(await screen.findByText('Escribe el motivo del cierre forzado')).toBeInTheDocument()
    expect(reasonInput()).toHaveAttribute('aria-invalid', 'true')
    expect(executeButton()).toBeDisabled()
    expect(calls.bodies).toHaveLength(0)
  })

  it('rejects more than two decimals', async () => {
    mockApi()
    const { user } = await renderDetail()

    await user.type(auditedInput(), '3400.555')

    expect(await screen.findByText('Usa máximo 2 decimales')).toBeInTheDocument()
    expect(executeButton()).toBeDisabled()
  })

  it('"Cancelar auditoría" goes back to the grid without closing anything', async () => {
    const calls = mockApi()
    const { user, router } = await renderDetail()
    await user.type(auditedInput(), '3400')

    await user.click(screen.getByRole('button', { name: 'Cancelar auditoría' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.supervision))
    expect(calls.bodies).toHaveLength(0)
  })

  it('409: tells the Backend message and refreshes the grid when another supervisor closed it first', async () => {
    mockApi({ forceClose: { status: 409, code: 'CASH_SHIFT_ALREADY_CLOSED', message: 'El turno ya se encuentra cerrado' } })
    const { user, router } = await renderDetail()
    await user.type(auditedInput(), '3400')
    await user.type(reasonInput(), 'Cierre por abandono')
    await waitFor(() => expect(executeButton()).toBeEnabled())

    await user.click(executeButton())

    expect(await screen.findByRole('alert')).toHaveTextContent('El turno ya se encuentra cerrado')
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.supervision))
  })

  it('404: goes back to the grid when the shift no longer exists', async () => {
    mockApi({ forceClose: { status: 404, code: 'CASH_SHIFT_NOT_FOUND', message: 'El turno no existe' } })
    const { user, router } = await renderDetail()
    await user.type(auditedInput(), '3400')
    await user.type(reasonInput(), 'Cierre por abandono')
    await waitFor(() => expect(executeButton()).toBeEnabled())

    await user.click(executeButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.supervision))
  })

  it('403: leaves the screen and goes back to the menu', async () => {
    mockApi({ forceClose: { status: 403, code: 'FORBIDDEN_ROLE', message: 'No tienes permisos para realizar esta acción.' } })
    const { user, router } = await renderDetail()
    await user.type(auditedInput(), '3400')
    await user.type(reasonInput(), 'Cierre por abandono')
    await waitFor(() => expect(executeButton()).toBeEnabled())

    await user.click(executeButton())

    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.menu))
  })
})
