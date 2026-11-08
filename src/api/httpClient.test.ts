import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { server } from '../test/server'
import { ApiError, ERROR_CODES, SESSION_EXPIRED_MESSAGE } from './errors'
import { createHttpClient, sanitizePayload, type HttpClientOptions } from './httpClient'

// Same origin as jsdom, so no CORS preflight is involved.
const BASE_URL = `${window.location.origin}/api/v1/payments`
const url = (path: string) => `${BASE_URL}${path}`

let token: string | null
let callbacks: Pick<HttpClientOptions, 'onSessionExpired' | 'onPasswordChangeRequired' | 'onCashShiftNotOpen' | 'onError'>

const buildClient = () => createHttpClient({ baseURL: BASE_URL, getToken: () => token, ...callbacks })

const captureError = async (promise: Promise<unknown>): Promise<ApiError> => {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('The request was expected to fail')
}

beforeEach(() => {
  token = 'jwt-token-123'
  callbacks = {
    onSessionExpired: vi.fn(),
    onPasswordChangeRequired: vi.fn(),
    onCashShiftNotOpen: vi.fn(),
    onError: vi.fn(),
  }
})

describe('Scenario: Inyección automática de JWT hacia el API Gateway y sanitización de payload', () => {
  it('adds "Authorization: Bearer <jwt>" and uses /api/v1/payments as base path', async () => {
    let authorization: string | null = null
    server.use(
      http.get(url('/cash-shifts/me'), ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json({ ok: true })
      }),
    )

    await buildClient().get('/cash-shifts/me')

    expect(authorization).toBe('Bearer jwt-token-123')
  })

  it('does not send the Authorization header when there is no token', async () => {
    token = null
    let hasAuthorization = true
    server.use(
      http.get(url('/pendings'), ({ request }) => {
        hasAuthorization = request.headers.has('authorization')
        return HttpResponse.json([])
      }),
    )

    await buildClient().get('/pendings')

    expect(hasAuthorization).toBe(false)
  })

  it('never sends X-User-Id or X-Staff-Id, even if a caller sets them', async () => {
    let headers: Headers | null = null
    server.use(
      http.post(url('/charge'), ({ request }) => {
        headers = request.headers
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    await buildClient().post('/charge', {}, { headers: { 'X-User-Id': 'u-1', 'x-staff-id': 's-1' } })

    expect(headers!.has('x-user-id')).toBe(false)
    expect(headers!.has('x-staff-id')).toBe(false)
  })

  it('removes user identifiers from the JSON payload', async () => {
    let body: unknown = null
    server.use(
      http.post(url('/charge'), async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({}, { status: 201 })
      }),
    )

    await buildClient().post('/charge', {
      dinning_session_id: 'session-1',
      tip: 30,
      cashier_id: 'cashier-1',
      payments: [{ payment_method: 'CASH', amount: 100, user_id: 'u-1' }],
    })

    expect(body).toEqual({ dinning_session_id: 'session-1', tip: 30, payments: [{ payment_method: 'CASH', amount: 100 }] })
  })
})

describe('Scenario: Manejo global de sesión expirada (HTTP 401)', () => {
  it('notifies the expired session with the agreed message and rejects', async () => {
    server.use(http.get(url('/pendings'), () => new HttpResponse(null, { status: 401 })))

    const error = await captureError(buildClient().get('/pendings'))

    expect(error.status).toBe(401)
    expect(callbacks.onSessionExpired).toHaveBeenCalledWith(SESSION_EXPIRED_MESSAGE)
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})

describe('Scenario: Redirección obligatoria por contraseña caducada', () => {
  it('runs the password change flow on 403 PASSWORD_CHANGE_REQUIRED', async () => {
    server.use(
      http.post(url('/charge'), () =>
        HttpResponse.json({ code: 'PASSWORD_CHANGE_REQUIRED', message: 'Tu contraseña caducó' }, { status: 403 }),
      ),
    )

    const error = await captureError(buildClient().post('/charge', {}))

    expect(error.code).toBe(ERROR_CODES.PASSWORD_CHANGE_REQUIRED)
    expect(callbacks.onPasswordChangeRequired).toHaveBeenCalledWith(error)
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})

describe('Scenario: Intercepción de operación sin caja abierta', () => {
  it('asks for the cash shift opening on 403 CASH_SHIFT_NOT_OPEN', async () => {
    server.use(
      http.post(url('/charge'), () =>
        HttpResponse.json({ code: 'CASH_SHIFT_NOT_OPEN', message: 'Debe abrir caja antes de cobrar' }, { status: 403 }),
      ),
    )

    const error = await captureError(buildClient().post('/charge', {}))

    expect(error.message).toBe('Debe abrir caja antes de cobrar')
    expect(callbacks.onCashShiftNotOpen).toHaveBeenCalledWith(error)
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})

describe('AC5: Manejo estandarizado de errores { code, message }', () => {
  it.each([
    [409, 'CASH_SHIFT_ALREADY_OPEN', 'Ya existe un turno abierto'],
    [409, 'TRANSACTION_ALREADY_PAID', 'La transacción ya ha sido pagada previamente'],
    [422, 'INSUFFICIENT_FUNDS', 'El monto de los pagos no cubre el total de la cuenta'],
    [422, 'CARD_AMOUNT_EXCEEDS_BALANCE', 'Los pagos con tarjeta no pueden exceder el total de la cuenta'],
    [422, 'CARD_COVERS_FULL_AMOUNT', 'La tarjeta cubre el total; no se admite efectivo adicional'],
    [422, 'AUTHORIZATION_REFERENCE_REQUIRED', 'La referencia de autorización es obligatoria'],
    [403, 'FORBIDDEN_ROLE', 'Tu rol no puede realizar esta operación'],
  ])('shows the Backend message for %i %s and keeps the code', async (status, code, message) => {
    server.use(http.post(url('/charge'), () => HttpResponse.json({ code, message }, { status })))

    const error = await captureError(buildClient().post('/charge', {}))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status, code, message })
    expect(callbacks.onError).toHaveBeenCalledWith(error)
  })

  it('falls back to FORBIDDEN_ROLE with a Spanish message when a 403 has no body', async () => {
    server.use(http.get(url('/export'), () => new HttpResponse(null, { status: 403 })))

    const error = await captureError(buildClient().get('/export'))

    expect(error.code).toBe(ERROR_CODES.FORBIDDEN_ROLE)
    expect(error.message).toBe('No tienes permisos para realizar esta acción.')
  })

  it('reports network failures with a Spanish message', async () => {
    server.use(http.get(url('/pendings'), () => HttpResponse.error()))

    const error = await captureError(buildClient().get('/pendings'))

    expect(error.status).toBeNull()
    expect(error.code).toBe(ERROR_CODES.NETWORK_ERROR)
    expect(callbacks.onError).toHaveBeenCalledOnce()
  })

  it('lets the caller handle the error when skipErrorToast is set', async () => {
    server.use(
      http.get(url('/cash-shifts/me'), () =>
        HttpResponse.json({ code: 'NOT_FOUND', message: 'Sin turno' }, { status: 404 }),
      ),
    )

    const error = await captureError(buildClient().get('/cash-shifts/me', { skipErrorToast: true }))

    expect(error.status).toBe(404)
    expect(callbacks.onError).not.toHaveBeenCalled()
  })
})

describe('sanitizePayload', () => {
  it('keeps non plain values untouched', () => {
    const form = new FormData()
    expect(sanitizePayload(form)).toBe(form)
    expect(sanitizePayload('text')).toBe('text')
    expect(sanitizePayload(null)).toBeNull()
  })

  it('does not mutate the original object', () => {
    const payload = { staff_id: 's-1', amount: 10 }
    sanitizePayload(payload)
    expect(payload).toEqual({ staff_id: 's-1', amount: 10 })
  })
})
