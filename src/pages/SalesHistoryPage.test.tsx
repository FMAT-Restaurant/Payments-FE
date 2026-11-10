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

const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

async function renderHistory(role: (typeof ROLES)[keyof typeof ROLES] = ROLES.ADMIN, route: string = ROUTES.salesHistory) {
  const view = renderWithProviders(null, { routes, route, token: makeUserToken(role, 'Ana Admin') })
  await screen.findByRole('heading', { name: 'Historial de Ventas' })
  return { user: userEvent.setup(), ...view }
}

const rowsCount = () => within(screen.getByRole('table')).getAllByRole('row').length - 1

describe('PMC-24 · Historial de ventas', () => {
  const downloads: string[] = []

  beforeEach(() => {
    downloads.length = 0
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:csv'), revokeObjectURL: vi.fn() }))
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
  })

  afterEach(() => {
    toastStore.setState([])
    vi.restoreAllMocks()
  })

  it('AC1/AC3: lists the first page with the six columns and a detail link per row', async () => {
    await renderHistory()

    expect(await screen.findByRole('table')).toBeInTheDocument()
    for (const header of ['Folio', 'Fecha y hora', 'Total cobrado', 'Método de pago', 'Estado', 'Acciones']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(rowsCount()).toBe(20)
    expect(screen.getByText('#TX-20260908-000048')).toBeInTheDocument()
    expect(screen.getAllByText('Completado')).toHaveLength(20)
    expect(screen.getByText('Mostrando 1 a 20 de 48 transacciones')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver detalle de #TX-20260908-000048/ })).toHaveAttribute(
      'href',
      '/historial-ventas/TX-20260908-000048',
    )
    expect(screen.getAllByText('Efectivo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mixto').length).toBeGreaterThan(0)
  })

  it('AC4: paginates with the 0-based page of the story translated to the 1-based Backend page', async () => {
    const pages: string[] = []
    server.use(
      http.get(url(''), ({ request }) => {
        pages.push(new URL(request.url).searchParams.get('page_index') ?? '')
        return undefined
      }),
    )
    const { user } = await renderHistory()
    await screen.findByRole('table')
    expect(pages[0]).toBe('1')

    await user.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(await screen.findByText('Mostrando 21 a 40 de 48 transacciones')).toBeInTheDocument()
    expect(pages.at(-1)).toBe('2')

    await user.click(screen.getByRole('button', { name: 'Página 3' }))
    expect(await screen.findByText('Mostrando 41 a 48 de 48 transacciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
    expect(rowsCount()).toBe(8)

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(await screen.findByText('Mostrando 21 a 40 de 48 transacciones')).toBeInTheDocument()
  })

  it('AC2: filters by the chosen days, covering the whole last day, and resets to the first page', async () => {
    const { user } = await renderHistory(ROLES.ADMIN, `${ROUTES.salesHistory}?page=2`)
    await screen.findByText('Mostrando 21 a 40 de 48 transacciones')

    await user.type(screen.getByLabelText('Desde'), '2026-09-08')
    await user.type(screen.getByLabelText('Hasta'), '2026-09-08')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(await screen.findByText('Mostrando 1 a 4 de 4 transacciones')).toBeInTheDocument()
    expect(rowsCount()).toBe(4)
    expect(screen.queryByRole('navigation', { name: 'Paginación' })).not.toBeInTheDocument()
  })

  it('AC2: does not apply a range whose end is before its start', async () => {
    const { user } = await renderHistory()
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Desde'), '2026-09-08')
    await user.type(screen.getByLabelText('Hasta'), '2026-09-01')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(await screen.findByText('La fecha final no puede ser anterior a la inicial')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1 a 20 de 48 transacciones')).toBeInTheDocument()
  })

  it('shows an empty state when the range has no transactions', async () => {
    const { user } = await renderHistory()
    await screen.findByRole('table')

    await user.type(screen.getByLabelText('Desde'), '2025-01-01')
    await user.type(screen.getByLabelText('Hasta'), '2025-01-02')
    await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(await screen.findByText('No hay transacciones en el rango seleccionado')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows a retry when the history cannot be loaded', async () => {
    let fail = true
    server.use(
      http.get(url(''), () =>
        fail ? HttpResponse.json({ code: 'X', message: 'boom' }, { status: 500 }) : undefined,
      ),
    )
    const { user } = await renderHistory()

    expect(await screen.findByText('No se pudo cargar el historial')).toBeInTheDocument()
    fail = false
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('table')).toBeInTheDocument()
  })

  it('AC5: only the Administrador sees "Exportar CSV"', async () => {
    await renderHistory(ROLES.CASHIER)
    await screen.findByRole('table')
    expect(screen.queryByRole('button', { name: /Exportar CSV/ })).not.toBeInTheDocument()
  })

  it('AC5: refuses to export without a range or with more than 31 days', async () => {
    let exports = 0
    server.use(http.get(url('/export'), () => { exports += 1; return new HttpResponse('x') }))
    const { user } = await renderHistory(ROLES.ADMIN, `${ROUTES.salesHistory}?start=2026-07-01&end=2026-09-08`)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: /Exportar CSV/ }))
    expect(await screen.findByText('El rango máximo de exportación es de 31 días')).toBeInTheDocument()
    expect(exports).toBe(0)
  })

  it('AC5: downloads the CSV named by Content-Disposition for a valid range', async () => {
    const queries: Array<Record<string, string>> = []
    server.use(
      http.get(url('/export'), ({ request }) => {
        queries.push(Object.fromEntries(new URL(request.url).searchParams))
        return new HttpResponse('folio,total', {
          headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="ventas-sep.csv"' },
        })
      }),
    )
    const { user } = await renderHistory(ROLES.ADMIN, `${ROUTES.salesHistory}?start=2026-09-01&end=2026-09-08`)
    await screen.findByRole('table')

    await user.click(screen.getByRole('button', { name: /Exportar CSV/ }))

    await waitFor(() => expect(downloads).toEqual(['ventas-sep.csv']))
    expect(queries).toHaveLength(1)
    expect(Date.parse(queries[0].end_date) - Date.parse(queries[0].start_date)).toBe(8 * 24 * 60 * 60 * 1000)
  })

  it('AC3: "Ver detalle" opens the detail over the history and closing it keeps the filters', async () => {
    const { user, router } = await renderHistory(ROLES.ADMIN, `${ROUTES.salesHistory}?start=2026-09-08&end=2026-09-08`)
    await screen.findByRole('table')

    await user.click(screen.getAllByRole('link', { name: /Ver detalle/ })[0])

    const dialog = await screen.findByRole('dialog', { name: /Detalle de Venta #TX-20260908-000048/ })
    expect(router.state.location.pathname).toBe('/historial-ventas/TX-20260908-000048')
    expect(screen.getByRole('table')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Cerrar ventana' }))
    await waitFor(() => expect(router.state.location.pathname).toBe(ROUTES.salesHistory))
    expect(router.state.location.search).toBe('?start=2026-09-08&end=2026-09-08')
  })
})
