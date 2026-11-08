import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStorage } from '../auth/tokenStorage'
import { server } from '../test/server'
import { endpoints } from './endpoints'
import { SESSION_EXPIRED_MESSAGE } from './errors'

const apiUrl = (path: string) => new URL(`/api/v1/payments${path}`, window.location.origin).toString()

/** Fresh module graph per test: the 401 "only once" flag and the stores start clean. */
const loadClient = async () => {
  const [{ httpClient }, { toastStore }, { cashShiftGate }, navigation] = await Promise.all([
    import('./client'),
    import('../features/notifications/toastStore'),
    import('../features/cash-shift/cashShiftGate'),
    import('../auth/navigation'),
  ])
  return { httpClient, toastStore, cashShiftGate, ...navigation }
}

describe('shared httpClient wiring', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads the JWT from storage and shows API errors as toasts', async () => {
    tokenStorage.set('stored-token')
    let authorization: string | null = null
    server.use(
      http.post(apiUrl(endpoints.charge()), ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json(
          { code: 'TRANSACTION_ALREADY_PAID', message: 'La transacción ya ha sido pagada previamente' },
          { status: 409 },
        )
      }),
    )
    const { httpClient, toastStore } = await loadClient()

    await expect(httpClient.post(endpoints.charge(), {})).rejects.toMatchObject({ code: 'TRANSACTION_ALREADY_PAID' })

    expect(authorization).toBe('Bearer stored-token')
    expect(toastStore.getState()).toEqual([
      expect.objectContaining({ variant: 'error', message: 'La transacción ya ha sido pagada previamente' }),
    ])
  })

  it('on 401 shows the session message once, clears the token and redirects to login', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] })
    tokenStorage.set('expired-token')
    const { httpClient, toastStore, authNavigation, SESSION_EXPIRED_REDIRECT_DELAY_MS } = await loadClient()
    const toLogin = vi.spyOn(authNavigation, 'toLogin').mockImplementation(() => {})
    server.use(http.get(apiUrl(endpoints.pendingAccounts()), () => new HttpResponse(null, { status: 401 })))

    await Promise.allSettled([httpClient.get(endpoints.pendingAccounts()), httpClient.get(endpoints.pendingAccounts())])

    expect(toastStore.getState()).toEqual([expect.objectContaining({ message: SESSION_EXPIRED_MESSAGE })])
    expect(tokenStorage.get()).toBeNull()
    expect(toLogin).not.toHaveBeenCalled()
    vi.advanceTimersByTime(SESSION_EXPIRED_REDIRECT_DELAY_MS)
    expect(toLogin).toHaveBeenCalledOnce()
  })

  it('redirects to the password change screen on 403 PASSWORD_CHANGE_REQUIRED', async () => {
    const { httpClient, authNavigation } = await loadClient()
    const toChangePassword = vi.spyOn(authNavigation, 'toChangePassword').mockImplementation(() => {})
    server.use(
      http.get(apiUrl(endpoints.pendingAccounts()), () =>
        HttpResponse.json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Debes cambiar tu contraseña' }, { status: 403 }),
      ),
    )

    await expect(httpClient.get(endpoints.pendingAccounts())).rejects.toBeDefined()

    expect(toChangePassword).toHaveBeenCalledOnce()
  })

  it('opens the cash shift gate on 403 CASH_SHIFT_NOT_OPEN', async () => {
    server.use(
      http.post(apiUrl(endpoints.charge()), () =>
        HttpResponse.json({ code: 'CASH_SHIFT_NOT_OPEN', message: 'Debe abrir caja antes de cobrar' }, { status: 403 }),
      ),
    )
    const { httpClient, toastStore, cashShiftGate } = await loadClient()

    await expect(httpClient.post(endpoints.charge(), {})).rejects.toBeDefined()

    expect(cashShiftGate.getState().openingRequired).toBe(true)
    expect(toastStore.getState()).toEqual([expect.objectContaining({ message: 'Debe abrir caja antes de cobrar' })])
  })
})

describe('endpoints', () => {
  it('maps the story routes under the payments base path', () => {
    expect(endpoints.pendingAccount('a1b2')).toBe('/pendings/a1b2')
    expect(endpoints.ticket('#TX-20260908-000001')).toBe('/TX-20260908-000001/ticket')
    expect(endpoints.transactionDetail('TX 1/2')).toBe('/TX%201%2F2')
    expect(endpoints.salesHistory()).toBe('')
    expect(endpoints.forceCloseCashShift('cs-1')).toBe('/cash-shifts/cs-1/force-close')
  })
})
