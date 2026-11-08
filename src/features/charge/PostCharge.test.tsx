import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'
import type { TicketReceiptDTO } from '../../api/contracts/ticket'
import { routes } from '../../app/router'
import { chargePath, ROUTES } from '../../app/routes'
import { ROLES } from '../../auth/roles'
import { server } from '../../test/server'
import { makeUserToken, renderWithProviders } from '../../test/utils'
import { describePaidAmounts, ticketPaymentLabel } from '../ticket/ticketSummary'
import { ThermalTicketPreview } from '../ticket/ThermalTicketPreview'
import { thermalPageStyle } from '../ticket/useThermalPrint'

const printMock = vi.fn()
const printOptions: { current: Record<string, unknown> | null } = { current: null }

vi.mock('react-to-print', () => ({
  useReactToPrint: (options: Record<string, unknown>) => {
    printOptions.current = options
    return printMock
  },
}))

const SESSION_ID = '3f2b8c1e-7a4d-4e9b-b1c2-9d8e7f6a5b40'
const FOLIO = 'TX-1042'
const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

const account: PendingAccountCardDTO = {
  dinning_session_id: SESSION_ID,
  order_folio: '#ORD-9938',
  table_name: 'Mesa 04',
  waiter_name: 'Carlos R.',
  timestamp: new Date().toISOString(),
  pre_account_status: 'ACCOUNT_REQUESTED',
  items: [
    { dish_id: 'd-101', name: 'Tacos al Pastor', quantity: 2, unit_price: 60, amount: 120 },
    { dish_id: 'd-205', name: 'Cerveza Artesanal', quantity: 1, unit_price: 85, amount: 85 },
  ],
  totals: { subtotal: 205, taxes: 32.8, expected_total: 237.8 },
}

const ticket: TicketReceiptDTO = {
  header: {
    restaurant_name: 'FMAT-RESTAURANT',
    folio: FOLIO,
    payment_date: '2026-09-29T14:32:00',
    table_name: 'Mesa 04',
    cashier_name: 'Edwing Molina',
  },
  items: [
    { quantity: 2, dish_name: 'Tacos al Pastor', unit_price: 60, amount: 120 },
    { quantity: 1, dish_name: 'Cerveza Artesanal', unit_price: 85, amount: 85 },
  ],
  totals: {
    subtotal: 205,
    taxes: 32.8,
    tip: 35.67,
    total: 273.47,
    payments: [
      { payment_method: 'CASH', amount: 200, authorization_reference: null },
      { payment_method: 'CREDIT_CARD', amount: 100, authorization_reference: 'AUTH-987654' },
    ],
    change_given: 26.53,
  },
}

let ticketRequests: string[]

function mockApi({ ticketFails = false } = {}) {
  ticketRequests = []
  let ticketAttempts = 0
  let charged = false
  server.use(
    // Like the Backend: once charged, the account is no longer pending.
    http.get(url('/pendings/:id'), () =>
      charged
        ? HttpResponse.json({ code: 'BILL_NOT_FOUND', message: 'No existe' }, { status: 404 })
        : HttpResponse.json(account),
    ),
    http.post(url('/charge'), () => {
      charged = true
      return HttpResponse.json(
        { folio: FOLIO, total: 273.47, change_delivered: 26.53, status: 'COMPLETED', message: 'OK' },
        { status: 201 },
      )
    }),
    http.get(url('/:folio/ticket'), ({ params }) => {
      ticketRequests.push(String(params.folio))
      ticketAttempts += 1
      return ticketFails && ticketAttempts === 1 ? HttpResponse.error() : HttpResponse.json(ticket)
    }),
  )
}

/** Charges the mock order: 15% tip, $200 cash and $100 card -> $26.53 of change. */
async function chargeMockOrder() {
  const user = userEvent.setup()
  const view = renderWithProviders(null, { routes, route: chargePath(SESSION_ID), token: makeUserToken(ROLES.CASHIER) })
  await screen.findByRole('heading', { name: 'Procesar Pago' })
  await user.click(screen.getByRole('button', { name: /15%/ }))
  await user.type(screen.getByLabelText(/Monto recibido en efectivo/), '200')
  await user.click(screen.getByRole('button', { name: '+ Agregar método de pago' }))
  await user.type(screen.getByLabelText(/Monto cobrado en terminal/), '100')
  await user.type(screen.getByLabelText(/Referencia de autorización/), 'AUTH-987654')
  await waitFor(() => expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeEnabled())
  await user.click(screen.getByRole('button', { name: 'Confirmar cobro' }))
  return { user, ...view }
}

beforeEach(() => {
  printMock.mockReset()
  printOptions.current = null
})

describe('PMC-21 · Confirmación post-cobro e impresión de ticket térmico', () => {
  it('Scenario: despliegue de cambio e impresión de ticket de 80mm tras cobro exitoso', async () => {
    mockApi()
    const { user, router } = await chargeMockOrder()

    const dialog = await screen.findByRole('dialog', { name: `Transacción #${FOLIO}` })
    expect(ticketRequests).toEqual([FOLIO])
    expect(within(dialog).getByText('Cobro completado')).toBeInTheDocument()
    const change = within(dialog).getByRole('region', { name: 'Cambio a entregar' })
    expect(change).toHaveTextContent('Cambio a entregar al cliente$26.53')
    expect(change).toHaveTextContent('Pagado: $173.47 Efectivo ($200.00 recibidos) + $100.00 Tarjeta')

    const receipt = within(dialog).getByRole('article', { name: `Ticket ${FOLIO}` })
    expect(receipt).toHaveTextContent('FMAT-RESTAURANT')
    expect(receipt).toHaveTextContent('Cajero: Edwing Molina')
    expect(receipt).toHaveClass('max-w-[80mm]')

    await user.click(within(dialog).getByRole('button', { name: 'Imprimir ticket' }))
    expect(printMock).toHaveBeenCalledOnce()
    expect(printOptions.current?.pageStyle).toContain('@page { size: 80mm auto; margin: 0; }')
    const contentRef = printOptions.current?.contentRef as { current: HTMLElement | null } | undefined
    expect(contentRef?.current).toBe(receipt)

    await user.click(within(dialog).getByRole('button', { name: 'Volver a bandeja' }))
    expect(router.state.location.pathname).toBe(ROUTES.cashTray)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('still shows the change when the receipt fails, and lets the cashier retry it', async () => {
    mockApi({ ticketFails: true })
    const { user } = await chargeMockOrder()

    const dialog = await screen.findByRole('dialog', { name: `Transacción #${FOLIO}` })
    expect(within(dialog).getByRole('region', { name: 'Cambio a entregar' })).toHaveTextContent('$26.53')
    expect(within(dialog).getByText('No se pudo cargar el ticket')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Imprimir ticket' })).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: 'Reintentar' }))

    expect(await within(dialog).findByRole('article', { name: `Ticket ${FOLIO}` })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Imprimir ticket' })).toBeEnabled()
  })

  it('does not let the cashier charge twice while the receipt loads', async () => {
    mockApi()
    await chargeMockOrder()

    expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled()
    await screen.findByRole('dialog')
    expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled()
  })
})

describe('<ThermalTicketPreview />', () => {
  it('renders every required field of the receipt', () => {
    render(<ThermalTicketPreview ticket={ticket} />)
    const receipt = screen.getByRole('article', { name: `Ticket ${FOLIO}` })

    for (const text of [
      'FMAT-RESTAURANT',
      `Folio: ${FOLIO}`,
      'Mesa 04 • 29/09/2026 14:32',
      'Cajero: Edwing Molina',
      '2 x Tacos al Pastor',
      '1 x Cerveza Artesanal',
      'IVA (16%)',
      'Propina$35.67',
      'Total$273.47',
      'Efectivo recibido$200.00',
      'Tarjeta de Crédito (AUTH-987654)$100.00',
      'Cambio entregado$26.53',
    ]) {
      expect(receipt).toHaveTextContent(text)
    }
  })
})

describe('thermalPageStyle', () => {
  it('keeps the rule of the story and adds the measured length that browsers do apply', () => {
    expect(thermalPageStyle()).toContain('@page { size: 80mm auto; margin: 0; }')
    expect(thermalPageStyle(101.2)).toContain('@page { size: 80mm auto; size: 80mm 108mm; margin: 0; }')
    expect(thermalPageStyle()).toContain('.thermal-ticket { width: 80mm; max-width: 80mm;')
  })
})

describe('ticket summary helpers', () => {
  it('labels payments and keeps unknown methods as sent', () => {
    expect(ticketPaymentLabel({ payment_method: 'DEBIT_CARD', amount: 10 })).toBe('Tarjeta de Débito')
    expect(ticketPaymentLabel({ payment_method: 'VALES', amount: 10 })).toBe('VALES')
  })

  it('describes card-only and exact cash payments', () => {
    const cardOnly = { ...ticket, totals: { ...ticket.totals, payments: [ticket.totals.payments[1]], change_given: 0 } }
    expect(describePaidAmounts(cardOnly)).toBe('Pagado: $100.00 Tarjeta')
    const exactCash = {
      ...ticket,
      totals: { ...ticket.totals, payments: [{ payment_method: 'CASH', amount: 50 }], change_given: 0 },
    }
    expect(describePaidAmounts(exactCash)).toBe('Pagado: $50.00 Efectivo')
  })
})
