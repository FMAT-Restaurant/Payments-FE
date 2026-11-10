import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { PendingAccountWire } from '../api/contracts/pendingAccounts'
import { endpoints } from '../api/endpoints'
import { routes } from '../app/router'
import { chargePath, ROUTES } from '../app/routes'
import { ROLES } from '../auth/roles'
import { toastStore } from '../features/notifications/toastStore'
import { server } from '../test/server'
import { makeUserToken, renderWithProviders } from '../test/utils'

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const mesa04: PendingAccountWire = {
  dinning_session_id: '3f2b8c1e-7a4d-4e9b-b1c2-9d8e7f6a5b40',
  order_folio: '#ORD-9938',
  table_name: 'Mesa 04',
  waiter_name: 'Carlos R.',
  timestamp: minutesAgo(2),
  items: [
    { dish_id: 'd-101', name: 'Tacos al Pastor', quantity: 2, unit_price: 60, amount: 120 },
    { dish_id: 'd-205', name: 'Cerveza Artesanal', quantity: 1, unit_price: 85, amount: 85 },
  ],
  subtotal: 205, taxes: 32.8, total: 237.8,
}

const mesa12: PendingAccountWire = {
  ...mesa04,
  dinning_session_id: 'c0a8e1f2-0000-4000-8000-000000000012',
  order_folio: '#ORD-9939',
  table_name: 'Mesa 12',
  waiter_name: 'Ana M.',
  timestamp: minutesAgo(17),
  subtotal: 1250, taxes: 200, total: 1450,
}

const barra02: PendingAccountWire = {
  ...mesa04,
  dinning_session_id: 'd1b9f203-0000-4000-8000-000000000002',
  order_folio: '#ORD-9940',
  table_name: 'Barra 02',
  waiter_name: 'Luis T.',
  timestamp: minutesAgo(6),
  subtotal: 276.5, taxes: 44.0, total: 320.5,
}

const sinNombres: PendingAccountWire = {
  ...mesa04,
  dinning_session_id: 'a91c4e27-5d3b-4f60-8e2a-6b7c1d0e9f12',
  order_folio: '#ORD-9941',
  table_name: null,
  waiter_name: null,
  subtotal: 150, taxes: 24, total: 174,
}

const openShift = {
  cash_shift_id: 'cs-1',
  cashier_name: 'Edwing Molina',
  opened_at: new Date().toISOString(),
  opening_float: 1000,
}

/** Serves one list per polling cycle; the last one repeats. */
function mockPendings(...cycles: PendingAccountWire[][]) {
  const state = { calls: 0 }
  server.use(
    http.get(url('/pendings'), () => HttpResponse.json(cycles[Math.min(state.calls++, cycles.length - 1)])),
    http.get(url(endpoints.myCashShift()), () => HttpResponse.json(openShift)),
  )
  return state
}

async function renderTray() {
  const view = renderWithProviders(null, { routes, route: ROUTES.cashTray, token: makeUserToken(ROLES.CASHIER) })
  await screen.findByRole('heading', { name: 'Bandeja de Caja' })
  return { user: userEvent.setup(), ...view }
}

const cards = () => screen.getAllByRole('listitem')
const cardOf = (folio: string) => {
  const card = screen.getByText(folio).closest('li')
  if (!card) throw new Error(`No card for ${folio}`)
  return within(card)
}

afterEach(() => {
  toastStore.setState([])
})

describe('PMC-19 · Bandeja de Caja', () => {
  it('AC1/AC3: shows the header, the active cashier and the card structure', async () => {
    mockPendings([mesa04])
    await renderTray()

    expect(await screen.findByText('#ORD-9938')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Regresar al Menú/ })).toBeInTheDocument()
    expect(await screen.findByText('Cajero Activo: Edwing Molina')).toBeInTheDocument()

    const card = cardOf('#ORD-9938')
    expect(card.getByText('Mesa 04')).toBeInTheDocument()
    expect(card.getByText(/^Hace \d+ min$/)).toBeInTheDocument()
    expect(card.getByText('Mesero: Carlos R.')).toBeInTheDocument()
    expect(card.getByText('$237.80')).toBeInTheDocument()
    // Payments-BE does not send the pre-account status, so the card only shows the item count.
    expect(card.getByText('3 artículos')).toBeInTheDocument()
    expect(card.getByRole('button', { name: 'Procesar cobro' })).toBeEnabled()
  })

  it('AC3: waits of 15 minutes or more use the error style, recent ones do not', async () => {
    mockPendings([mesa04, mesa12])
    await renderTray()
    await screen.findByText('#ORD-9939')

    expect(cardOf('#ORD-9939').getByText('Hace 17 min')).toHaveClass('text-error')
    expect(cardOf('#ORD-9938').getByText('Hace 2 min')).toHaveClass('text-success')
  })

  it('AC3: a card without table or waiter shows the abbreviated session id', async () => {
    mockPendings([sinNombres])
    await renderTray()
    await screen.findByText('#ORD-9941')

    const card = cardOf('#ORD-9941')
    expect(card.getByText('a91c4e27')).toBeInTheDocument()
    expect(card.getByText('Mesero: a91c4e27')).toBeInTheDocument()
  })

  it('Scenario 1: a new account arrives by polling', async () => {
    mockPendings([mesa12], [mesa12, mesa04])
    await renderTray()
    await screen.findByText('#ORD-9939')
    expect(cards()).toHaveLength(1)

    await screen.findByText('#ORD-9938')

    expect(cards()).toHaveLength(2)
    expect(cardOf('#ORD-9938').getByText('$237.80')).toBeInTheDocument()
    expect(cardOf('#ORD-9938').getByRole('button', { name: 'Procesar cobro' })).toBeEnabled()
  })

  it('Scenario 2: a modified account updates in place without duplicating the card', async () => {
    const before = { ...mesa04, items: [mesa04.items[0]], subtotal: 120, taxes: 19.2, total: 139.2 }
    mockPendings([before], [mesa04])
    await renderTray()
    expect(await screen.findByText('$139.20')).toBeInTheDocument()
    expect(screen.getByText(/^2 artículos/)).toBeInTheDocument()

    expect(await screen.findByText('$237.80')).toBeInTheDocument()

    expect(screen.getByText(/^3 artículos/)).toBeInTheDocument()
    expect(screen.queryByText('$139.20')).not.toBeInTheDocument()
    expect(cards()).toHaveLength(1)
  })

  it('Scenario 3: an account that disappears is removed and announced once', async () => {
    mockPendings([mesa12, mesa04], [mesa04])
    await renderTray()
    await screen.findByText('#ORD-9939')

    expect(await screen.findByText('La cuenta de la Mesa 12 fue removida de la bandeja')).toBeInTheDocument()
    expect(screen.queryByText('#ORD-9939')).not.toBeInTheDocument()
    expect(cards()).toHaveLength(1)
    expect(toastStore.getState()).toHaveLength(1)
  })

  it('Scenario 3: several accounts leaving in one cycle produce a single unified message', async () => {
    mockPendings([mesa12, mesa04, barra02], [barra02])
    await renderTray()

    expect(
      await screen.findByText('Las cuentas de Mesa 12 y Mesa 04 fueron removidas de la bandeja'),
    ).toBeInTheDocument()
    expect(toastStore.getState()).toHaveLength(1)
  })

  it('does not announce anything on the first load or while the list does not change', async () => {
    const polls = mockPendings([mesa04])
    await renderTray()
    await screen.findByText('#ORD-9938')

    await waitFor(() => expect(polls.calls).toBeGreaterThanOrEqual(4))

    expect(toastStore.getState()).toHaveLength(0)
  })

  it('Scenario 4: filters by table, folio, abbreviated id and waiter, with a 300 ms debounce', async () => {
    mockPendings([mesa04, mesa12, barra02, sinNombres])
    const { user } = await renderTray()
    await screen.findByText('#ORD-9941')
    const search = screen.getByRole('searchbox', { name: 'Buscar cuenta' })

    // Each search is checked by waiting for the card it must leave, so a stale result cannot pass.
    await user.type(search, 'barra 02')
    expect(cards()).toHaveLength(4) // still debouncing
    await waitFor(() => expect(screen.queryByText('#ORD-9938')).not.toBeInTheDocument())
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('#ORD-9940')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, 'a91c4e27')
    await waitFor(() => expect(screen.queryByText('#ORD-9940')).not.toBeInTheDocument())
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('#ORD-9941')).toBeInTheDocument()

    await user.clear(search)
    await user.type(search, '#ORD-9938')
    await waitFor(() => expect(screen.queryByText('#ORD-9941')).not.toBeInTheDocument())
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('#ORD-9938')).toBeInTheDocument()

    await user.clear(search)
    await waitFor(() => expect(cards()).toHaveLength(4))
    await user.selectOptions(screen.getByLabelText('Por Mesero'), 'Ana M.')
    expect(cards()).toHaveLength(1)
    expect(screen.getByText('#ORD-9939')).toBeInTheDocument()
  })

  it('AC2: has no status filter and lists the waiters of the visible accounts', async () => {
    mockPendings([mesa04, mesa12])
    await renderTray()
    await screen.findByText('#ORD-9938')

    expect(screen.queryByLabelText(/Estado/i)).not.toBeInTheDocument()
    const options = within(screen.getByLabelText('Por Mesero')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['Todos los meseros', 'Ana M.', 'Carlos R.'])
  })

  it('shows "no results" with a way back when the filters match nothing', async () => {
    mockPendings([mesa04])
    const { user } = await renderTray()
    await screen.findByText('#ORD-9938')

    await user.type(screen.getByRole('searchbox', { name: 'Buscar cuenta' }), 'zzz')
    expect(await screen.findByText('Ninguna cuenta coincide con tu búsqueda')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(await screen.findByText('#ORD-9938')).toBeInTheDocument()
  })

  it('falls back to "all waiters" when the selected waiter has no accounts left', async () => {
    mockPendings([mesa04, mesa12], [mesa04])
    await renderTray()
    await screen.findByText('#ORD-9939')
    await userEvent.selectOptions(screen.getByLabelText('Por Mesero'), 'Ana M.')
    expect(cards()).toHaveLength(1)

    await waitFor(() => expect(screen.queryByText('#ORD-9939')).not.toBeInTheDocument())

    expect(screen.getByText('#ORD-9938')).toBeInTheDocument()
    expect(screen.getByLabelText('Por Mesero')).toHaveValue('')
  })

  it('AC5: shows skeletons on the first load and the empty state without accounts', async () => {
    server.use(
      http.get(url('/pendings'), async () => {
        await delay(150)
        return HttpResponse.json([])
      }),
      http.get(url(endpoints.myCashShift()), () => HttpResponse.json(openShift)),
    )
    await renderTray()

    expect(screen.getByText('Cargando cuentas pendientes...')).toBeInTheDocument()
    expect(await screen.findByText('Aún no hay cuentas pendientes por cobrar')).toBeInTheDocument()
    expect(screen.queryByText('Cargando cuentas pendientes...')).not.toBeInTheDocument()
  })

  it('shows its own error state, without toasts, when the first load fails', async () => {
    let calls = 0
    server.use(
      http.get(url('/pendings'), () => {
        calls++
        return HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Error interno' }, { status: 500 })
      }),
      http.get(url(endpoints.myCashShift()), () => HttpResponse.json(openShift)),
    )
    const { user } = await renderTray()

    expect(await screen.findByText('No se pudo cargar la bandeja')).toBeInTheDocument()
    expect(toastStore.getState()).toHaveLength(0)

    const before = calls
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(calls).toBeGreaterThan(before))
  })

  it('keeps showing the last accounts when a later poll fails', async () => {
    let calls = 0
    server.use(
      http.get(url('/pendings'), () =>
        ++calls === 1
          ? HttpResponse.json([mesa04])
          : HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Error interno' }, { status: 500 }),
      ),
      http.get(url(endpoints.myCashShift()), () => HttpResponse.json(openShift)),
    )
    await renderTray()
    await screen.findByText('#ORD-9938')

    expect(await screen.findByText(/No se pudo actualizar la bandeja/)).toBeInTheDocument()
    expect(screen.getByText('#ORD-9938')).toBeInTheDocument()
    expect(toastStore.getState()).toHaveLength(0)
  })

  it('"Procesar cobro" opens the charge screen of that account', async () => {
    mockPendings([mesa04, mesa12])
    const { user, router } = await renderTray()
    await screen.findByText('#ORD-9939')

    await user.click(cardOf('#ORD-9939').getByRole('button', { name: 'Procesar cobro' }))

    await waitFor(() => expect(router.state.location.pathname).toBe(chargePath(mesa12.dinning_session_id)))
  })
})
