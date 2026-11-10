import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../app/router'
import { ROUTES } from '../app/routes'
import { ROLES } from '../auth/roles'
import { toastStore } from '../features/notifications/toastStore'
import { server } from '../test/server'
import { makeUserToken, renderWithProviders } from '../test/utils'

const printMock = vi.fn()
vi.mock('react-to-print', () => ({ useReactToPrint: () => printMock }))

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()
const FOLIO = 'TX-20260908-000048'

async function renderDetail(search = '?start=2026-09-08&end=2026-09-08') {
  const route = `${ROUTES.salesHistory}/${FOLIO}${search}`
  const view = renderWithProviders(null, { routes, route, token: makeUserToken(ROLES.CASHIER, 'Edwing') })
  const dialog = await screen.findByRole('dialog', { name: `Detalle de Venta #${FOLIO}` })
  return { user: userEvent.setup(), dialog, ...view }
}

beforeEach(() => printMock.mockReset())
afterEach(() => toastStore.setState([]))

describe('PMC-25 · Detalle de venta y reimpresión', () => {
  it('Scenario 1/AC1/AC3/AC4: shows header, two-column snapshot and only "Cerrar ventana"', async () => {
    const { dialog } = await renderDetail()
    const view = within(dialog)

    expect(await view.findByText('Artículos cobrados')).toBeInTheDocument()
    expect(view.getByText('Completado')).toBeInTheDocument()
    expect(view.getByText(/Cobrado el/)).toBeInTheDocument()
    expect(view.getByRole('button', { name: /Reimprimir ticket/ })).toBeInTheDocument()

    const items = within(view.getByRole('region', { name: 'Artículos cobrados' }))
    expect(items.getByText(/2 x Tacos al Pastor/)).toBeInTheDocument()
    for (const label of ['Subtotal', 'IVA', 'Propina', 'Total', 'Cambio entregado']) {
      expect(items.getByText(label)).toBeInTheDocument()
    }
    const payments = within(view.getByRole('region', { name: 'Desglose de pagos' }))
    expect(payments.getAllByRole('listitem').length).toBeGreaterThan(0)

    const buttons = view.getAllByRole('button').map((button) => button.textContent)
    expect(buttons).toEqual(['🖨️ Reimprimir ticket', 'Cerrar ventana'])
    expect(view.queryByText(/cancel/i)).not.toBeInTheDocument()
  })

  it('AC3: shows the authorization reference of card payments', async () => {
    server.use(
      http.get(url(`/${FOLIO}`), () =>
        HttpResponse.json({
          folio: FOLIO,
          status: 'COMPLETADO',
          paid_at: '2026-09-08T20:30:00Z',
          subtotal: 100,
          taxes: 16,
          tip: 0,
          total: 116,
          change_given: 0,
          items: [{ dish_name: 'Tacos', quantity: 1, unit_price: 100, amount: 100 }],
          payment_breakdowns: [{ method: 'TARJETA_CREDITO', amount: 116, authorization_reference: 'AUTH-987654' }],
        }),
      ),
    )
    const { dialog } = await renderDetail()
    expect(await within(dialog).findByText('Tarjeta de Crédito (AUTH-987654)')).toBeInTheDocument()
  })

  it('Scenario 2/AC2: requests the ticket only on demand, then prints without closing the modal', async () => {
    let ticketRequests = 0
    server.use(
      http.get(url(`/${FOLIO}/ticket`), () => {
        ticketRequests += 1
        return undefined
      }),
    )
    const { user, dialog, router } = await renderDetail()
    await within(dialog).findByText('Artículos cobrados')
    expect(ticketRequests).toBe(0)

    await user.click(within(dialog).getByRole('button', { name: /Reimprimir ticket/ }))

    await waitFor(() => expect(printMock).toHaveBeenCalledOnce())
    expect(ticketRequests).toBe(1)
    expect(await screen.findByRole('article', { name: `Ticket ${FOLIO}`, hidden: true })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: `Detalle de Venta #${FOLIO}` })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`${ROUTES.salesHistory}/${FOLIO}`)
  })

  it('notifies and does not print when the ticket cannot be loaded', async () => {
    server.use(http.get(url(`/${FOLIO}/ticket`), () => HttpResponse.json({ code: 'X', message: 'boom' }, { status: 500 })))
    const { user, dialog } = await renderDetail()
    await within(dialog).findByText('Artículos cobrados')

    await user.click(within(dialog).getByRole('button', { name: /Reimprimir ticket/ }))

    await waitFor(() => expect(toastStore.getState().length).toBeGreaterThan(0))
    expect(printMock).not.toHaveBeenCalled()
  })

  it('shows a retry when the detail cannot be loaded and disables the reprint', async () => {
    let fail = true
    server.use(http.get(url(`/${FOLIO}`), () => (fail ? HttpResponse.json({ code: 'X', message: 'boom' }, { status: 500 }) : undefined)))
    const { user, dialog } = await renderDetail()

    expect(await within(dialog).findByText('No se pudo cargar el detalle')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Reimprimir ticket/ })).toBeDisabled()
    fail = false
    await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }))
    expect(await within(dialog).findByText('Artículos cobrados')).toBeInTheDocument()
  })

  it('Scenario 3: closing (button or overlay) returns to the history keeping filters and page', async () => {
    const { user, dialog, router } = await renderDetail('?start=2026-09-08&end=2026-09-08&page=1')
    await within(dialog).findByText('Artículos cobrados')

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar ventana' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.salesHistory))
    expect(router.state.location.search).toBe('?start=2026-09-08&end=2026-09-08&page=1')
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('Scenario 3: Escape also closes the modal', async () => {
    const { user, dialog, router } = await renderDetail()
    await within(dialog).findByText('Artículos cobrados')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.salesHistory))
  })
})
