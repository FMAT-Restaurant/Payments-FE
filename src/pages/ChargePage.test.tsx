import { screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { ChargeRequestDTO } from '../api/contracts/charge'
import type { PendingAccountCardDTO } from '../api/contracts/pendingAccounts'
import { endpoints } from '../api/endpoints'
import { routes } from '../app/router'
import { chargePath, ROUTES } from '../app/routes'
import { ROLES } from '../auth/roles'
import { toastStore } from '../features/notifications/toastStore'
import { CARD_EXCEEDS_TOTAL_MESSAGE, UNNECESSARY_CASH_MESSAGE } from '../features/charge/chargeRules'
import { server } from '../test/server'
import { makeUserToken, renderWithProviders } from '../test/utils'

const SESSION_ID = 'SESSION_123'
const url = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

/** Account of the Gherkin scenarios: consumption total of $200.00. */
const account: PendingAccountCardDTO = {
  dinning_session_id: SESSION_ID,
  order_folio: '#ORD-1001',
  table_name: 'Mesa 04',
  waiter_name: 'Carlos R.',
  timestamp: new Date().toISOString(),
  pre_account_status: 'ACCOUNT_REQUESTED',
  items: [
    { dish_id: 'd-1', name: 'Tacos al Pastor', quantity: 2, unit_price: 60, amount: 120, notes: 'Sin cebolla' },
    { dish_id: 'd-2', name: 'Agua de Horchata', quantity: 1, unit_price: 52.41, amount: 52.41 },
  ],
  totals: { subtotal: 172.41, taxes: 27.59, expected_total: 200 },
}

let requestedSessions: string[] = []

function mockAccount(data: PendingAccountCardDTO = account) {
  requestedSessions = []
  server.use(
    http.get(url('/pendings/:id'), ({ params }) => {
      requestedSessions.push(String(params.id))
      return HttpResponse.json(data)
    }),
  )
}

async function renderChargePage() {
  const user = userEvent.setup()
  const view = renderWithProviders(null, { routes, route: chargePath(SESSION_ID), token: makeUserToken(ROLES.CASHIER) })
  await screen.findByRole('heading', { name: 'Procesar Pago' })
  return { user, ...view }
}

const line = (number: number) => screen.getByRole('listitem', { name: `Método ${number}` })
const confirmButton = () => screen.getByRole('button', { name: 'Confirmar cobro' })

async function setCustomTip(user: UserEvent, amount: string) {
  await user.click(screen.getByRole('button', { name: 'Otro monto' }))
  await user.type(screen.getByLabelText('Monto de propina'), amount)
}

async function fillLine(user: UserEvent, number: number, method: string, amount: string, reference?: string) {
  const row = line(number)
  await user.selectOptions(within(row).getByLabelText(/Método/), method)
  await user.type(within(row).getByLabelText(/Monto/), amount)
  if (reference) await user.type(within(row).getByLabelText(/Referencia de autorización/), reference)
}

afterEach(() => {
  toastStore.setState([])
})

describe('PMC-20 · Procesar Pago', () => {
  it('Scenario 1: cobro mixto exacto y envío de payload reducido', async () => {
    mockAccount()
    let body: ChargeRequestDTO | null = null
    server.use(
      http.post(url(endpoints.charge()), async ({ request }) => {
        body = (await request.json()) as ChargeRequestDTO
        return HttpResponse.json(
          { folio: 'TX-20260929-002', total: 230, change_delivered: 0, status: 'COMPLETED', message: 'OK' },
          { status: 201 },
        )
      }),
      http.get(url('/:folio/ticket'), () => HttpResponse.json({ code: 'TRANSACTION_NOT_FOUND', message: 'x' }, { status: 404 })),
    )
    const { user, router } = await renderChargePage()

    await setCustomTip(user, '30')
    expect(screen.getByText('Monto a Cobrar (Total + Propina)').nextElementSibling).toHaveTextContent('$230.00')
    await fillLine(user, 1, 'CASH', '100')
    await user.click(screen.getByRole('button', { name: '+ Agregar método de pago' }))
    await fillLine(user, 2, 'CREDIT_CARD', '130', 'AUTH-123')

    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())

    expect(await screen.findByRole('dialog', { name: 'Transacción #TX-20260929-002' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(chargePath(SESSION_ID))
    expect(body).toEqual({
      dinning_session_id: SESSION_ID,
      tip: 30,
      payments: [
        { payment_method: 'CASH', amount: 100, authorization_reference: null },
        { payment_method: 'CREDIT_CARD', amount: 130, authorization_reference: 'AUTH-123' },
      ],
    })
  })

  it('Scenario 2: cálculo automático de cambio solo con efectivo excedente', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await setCustomTip(user, '30')
    await fillLine(user, 1, 'CREDIT_CARD', '100', 'AUTH-123')
    await user.click(screen.getByRole('button', { name: '+ Agregar método de pago' }))
    await fillLine(user, 2, 'CASH', '150')

    expect(screen.getByText('Cambio a entregar (Efectivo)').nextElementSibling).toHaveTextContent('$20.00')
    expect(screen.getByText('Total Ingresado').nextElementSibling).toHaveTextContent('$250.00')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
  })

  it('Scenario 3: bloqueo por excedente en tarjeta', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await setCustomTip(user, '30')
    await fillLine(user, 1, 'DEBIT_CARD', '250', 'AUTH-999')

    expect(within(line(1)).getByText(CARD_EXCEEDS_TOTAL_MESSAGE)).toBeInTheDocument()
    expect(within(line(1)).getByLabelText(/Monto cobrado en terminal/)).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Cambio a entregar (Efectivo)').nextElementSibling).toHaveTextContent('—')
    expect(confirmButton()).toBeDisabled()
  })

  it('Scenario 4: restricción de efectivo innecesario', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await setCustomTip(user, '30')
    await fillLine(user, 1, 'CREDIT_CARD', '230', 'AUTH-123')
    await user.click(screen.getByRole('button', { name: '+ Agregar método de pago' }))
    await fillLine(user, 2, 'CASH', '20')

    expect(within(line(2)).getByText(UNNECESSARY_CASH_MESSAGE)).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('Scenario 5: recuperación de datos al recargar (F5) desde la ruta', async () => {
    mockAccount()
    await renderChargePage()

    expect(requestedSessions).toEqual([SESSION_ID])
    const summary = screen.getByRole('region', { name: 'Resumen de la comanda' })
    expect(within(summary).getByRole('heading', { name: 'Mesa 04' })).toBeInTheDocument()
    expect(within(summary).getByText(/Mesero: Carlos R\./)).toHaveTextContent('3 artículos')
    expect(within(summary).getByText('#ORD-1001')).toBeInTheDocument()
    expect(within(summary).getByText('2x Tacos al Pastor')).toBeInTheDocument()
    expect(within(summary).getByText('Total de consumo').nextElementSibling).toHaveTextContent('$200.00')
  })

  it('shows the mock figures: 15% tip of $35.67 and $273.47 to charge', async () => {
    mockAccount({ ...account, totals: { subtotal: 205, taxes: 32.8, expected_total: 237.8 } })
    const { user } = await renderChargePage()

    const fifteen = screen.getByRole('button', { name: /15%/ })
    expect(fifteen).toHaveTextContent('$35.67')
    await user.click(fifteen)

    expect(fifteen).toHaveAttribute('aria-pressed', 'true')
    expect(fifteen).toHaveClass('bg-primary-soft', 'border-primary')
    const summary = screen.getByRole('region', { name: 'Resumen de la comanda' })
    expect(within(summary).getByText('IVA (16%)')).toBeInTheDocument()
    expect(within(summary).getByText('Propina (15%)').nextElementSibling).toHaveTextContent('+$35.67')
    expect(within(summary).getByText('Total Cuenta').nextElementSibling).toHaveTextContent('$273.47')

    await user.click(fifteen)
    expect(fifteen).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the missing amount and keeps the button disabled', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await fillLine(user, 1, 'CASH', '150')

    expect(screen.getByText('Faltante por cubrir: $50.00')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('does not accept negative custom tips', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await user.click(screen.getByRole('button', { name: 'Otro monto' }))
    const input = screen.getByLabelText('Monto de propina')
    await user.type(input, '-15')

    expect(input).toHaveValue(15)
  })

  it('requires the voucher reference for card payments', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await fillLine(user, 1, 'CREDIT_CARD', '200')
    const reference = within(line(1)).getByLabelText(/Referencia de autorización/)
    await user.type(reference, 'A')
    await user.clear(reference)

    expect(await within(line(1)).findByText('La referencia de autorización es obligatoria')).toBeInTheDocument()
    expect(confirmButton()).toBeDisabled()
  })

  it('removes payment lines', async () => {
    mockAccount()
    const { user } = await renderChargePage()

    await user.click(screen.getByRole('button', { name: '+ Agregar método de pago' }))
    expect(within(line(2)).getByLabelText(/Método 2/)).toHaveValue('CREDIT_CARD')
    await user.click(screen.getByRole('button', { name: 'Quitar método 2' }))

    expect(screen.queryByRole('listitem', { name: 'Método 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument()
  })

  it('AC5: keeps the form data and shows the Backend message when the charge fails', async () => {
    mockAccount()
    server.use(
      http.post(url(endpoints.charge()), () =>
        HttpResponse.json(
          { code: 'TRANSACTION_ALREADY_PAID', message: 'La transacción ya ha sido pagada previamente' },
          { status: 409 },
        ),
      ),
    )
    const { user, router } = await renderChargePage()

    await fillLine(user, 1, 'CASH', '200')
    await waitFor(() => expect(confirmButton()).toBeEnabled())
    await user.click(confirmButton())

    expect(await screen.findByText('La transacción ya ha sido pagada previamente')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(chargePath(SESSION_ID))
    expect(within(line(1)).getByLabelText(/Monto recibido en efectivo/)).toHaveValue(200)
    expect(confirmButton()).toBeEnabled()
  })

  it('AC5: "Cancelar" returns to the cash tray', async () => {
    mockAccount()
    const { user, router } = await renderChargePage()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(router.state.location.pathname).toBe(ROUTES.cashTray)
  })

  it('explains when the account is no longer pending', async () => {
    server.use(
      http.get(url('/pendings/:id'), () =>
        HttpResponse.json({ code: 'BILL_NOT_FOUND', message: 'No existe' }, { status: 404 }),
      ),
    )
    renderWithProviders(null, { routes, route: chargePath(SESSION_ID), token: makeUserToken(ROLES.CASHIER) })

    expect(await screen.findByText('Esta cuenta ya no está pendiente de cobro')).toBeInTheDocument()
    expect(toastStore.getState()).toEqual([])
  })

  it('offers a retry when the account cannot be loaded', async () => {
    let attempts = 0
    server.use(
      http.get(url('/pendings/:id'), () => {
        attempts += 1
        return attempts === 1 ? HttpResponse.error() : HttpResponse.json(account)
      }),
    )
    const user = userEvent.setup()
    renderWithProviders(null, { routes, route: chargePath(SESSION_ID), token: makeUserToken(ROLES.CASHIER) })

    await user.click(await screen.findByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByRole('heading', { name: 'Procesar Pago' })).toBeInTheDocument()
  })
})
