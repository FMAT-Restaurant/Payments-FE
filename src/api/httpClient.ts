import axios, { AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ApiError, ERROR_CODES, SESSION_EXPIRED_MESSAGE, toApiError } from './errors'

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * The caller shows its own message for this request (e.g. 404 of /cash-shifts/me means "no shift").
     * Session (401), password (403 PASSWORD_CHANGE_REQUIRED) and cash-shift (403 CASH_SHIFT_NOT_OPEN) flows still run.
     */
    skipErrorToast?: boolean
  }
}

/** Kong purges these headers; the user identity travels only inside the JWT (PMC-18 AC3). */
export const FORBIDDEN_HEADERS = ['x-user-id', 'x-staff-id'] as const

/** User identifiers must never travel in the payload; the Backend reads them from the JWT claims. */
export const FORBIDDEN_BODY_KEYS = ['user_id', 'staff_id', 'cashier_id', 'employee_id'] as const

export interface HttpClientOptions {
  baseURL: string
  getToken: () => string | null
  /** 401: the session is no longer valid. */
  onSessionExpired: (message: string) => void
  /** 403 PASSWORD_CHANGE_REQUIRED */
  onPasswordChangeRequired: (error: ApiError) => void
  /** 403 CASH_SHIFT_NOT_OPEN */
  onCashShiftNotOpen: (error: ApiError) => void
  /** Any other failure, unless the request asked for `skipErrorToast`. */
  onError: (error: ApiError) => void
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype

/** Returns a copy of the payload without user identifiers, at any depth. */
export function sanitizePayload<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item)) as T
  }
  if (!isPlainObject(payload)) {
    return payload
  }

  const forbidden: readonly string[] = FORBIDDEN_BODY_KEYS
  return Object.fromEntries(
    Object.entries(payload)
      .filter(([key]) => !forbidden.includes(key.toLowerCase()))
      .map(([key, value]) => [key, sanitizePayload(value)]),
  ) as T
}

function prepareRequest(config: InternalAxiosRequestConfig, getToken: () => string | null) {
  const headers = AxiosHeaders.from(config.headers)
  FORBIDDEN_HEADERS.forEach((header) => headers.delete(header))

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  } else {
    headers.delete('Authorization')
  }

  config.headers = headers
  config.data = sanitizePayload(config.data)
  return config
}

/**
 * Axios client for the API Gateway (PMC-18 AC3 and AC5).
 * Every failure is rejected as an `ApiError` so forms keep their data and can react to `code`.
 */
export function createHttpClient(options: HttpClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    headers: { Accept: 'application/json' },
  })

  client.interceptors.request.use((config) => prepareRequest(config, options.getToken))

  client.interceptors.response.use(undefined, (rawError: unknown) => {
    const error = toApiError(rawError)
    const skipErrorToast = axios.isAxiosError(rawError) && rawError.config?.skipErrorToast === true

    if (error.status === 401) {
      options.onSessionExpired(SESSION_EXPIRED_MESSAGE)
    } else if (error.status === 403 && error.code === ERROR_CODES.PASSWORD_CHANGE_REQUIRED) {
      options.onPasswordChangeRequired(error)
    } else if (error.status === 403 && error.code === ERROR_CODES.CASH_SHIFT_NOT_OPEN) {
      options.onCashShiftNotOpen(error)
    } else if (!skipErrorToast) {
      options.onError(error)
    }

    return Promise.reject(error)
  })

  return client
}
