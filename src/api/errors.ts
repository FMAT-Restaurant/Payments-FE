import { isAxiosError } from 'axios'

/** Error codes of the `{ code, message }` contract (PMC-18 AC5) plus the client-side fallbacks. */
export const ERROR_CODES = {
  PASSWORD_CHANGE_REQUIRED: 'PASSWORD_CHANGE_REQUIRED',
  CASH_SHIFT_NOT_OPEN: 'CASH_SHIFT_NOT_OPEN',
  FORBIDDEN_ROLE: 'FORBIDDEN_ROLE',
  CASH_SHIFT_ALREADY_OPEN: 'CASH_SHIFT_ALREADY_OPEN',
  TRANSACTION_ALREADY_PAID: 'TRANSACTION_ALREADY_PAID',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  CARD_AMOUNT_EXCEEDS_BALANCE: 'CARD_AMOUNT_EXCEEDS_BALANCE',
  CARD_COVERS_FULL_AMOUNT: 'CARD_COVERS_FULL_AMOUNT',
  AUTHORIZATION_REFERENCE_REQUIRED: 'AUTHORIZATION_REFERENCE_REQUIRED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  BILL_NOT_FOUND: 'BILL_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  REDIS_TIMEOUT: 'REDIS_TIMEOUT',
  CASH_SHIFT_NOT_FOUND: 'CASH_SHIFT_NOT_FOUND',
  CASH_SHIFT_CLOSED: 'CASH_SHIFT_CLOSED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type KnownErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export const SESSION_EXPIRED_MESSAGE = 'Tu sesión ha expirado. Inicia sesión nuevamente.'

/** Spanish messages used when the response has no `{ code, message }` body (e.g. 403 from [Authorize], network errors). */
const FALLBACK_MESSAGES: Record<KnownErrorCode, string> = {
  PASSWORD_CHANGE_REQUIRED: 'Debes cambiar tu contraseña para continuar.',
  CASH_SHIFT_NOT_OPEN: 'Debe abrir caja antes de cobrar.',
  FORBIDDEN_ROLE: 'No tienes permisos para realizar esta acción.',
  CASH_SHIFT_ALREADY_OPEN: 'Ya tienes un turno de caja abierto.',
  TRANSACTION_ALREADY_PAID: 'La transacción ya ha sido pagada previamente.',
  INSUFFICIENT_FUNDS: 'El monto de los pagos no cubre el total de la cuenta.',
  CARD_AMOUNT_EXCEEDS_BALANCE: 'Los pagos electrónicos no pueden exceder el total de la cuenta.',
  CARD_COVERS_FULL_AMOUNT: 'La tarjeta cubre el total; no se admite efectivo adicional.',
  AUTHORIZATION_REFERENCE_REQUIRED: 'La referencia de autorización es obligatoria para pagos con tarjeta.',
  VALIDATION_ERROR: 'Revisa los datos capturados e inténtalo de nuevo.',
  TRANSACTION_NOT_FOUND: 'No se encontró la transacción solicitada.',
  BILL_NOT_FOUND: 'No se encontró la cuenta solicitada.',
  SESSION_NOT_FOUND: 'La cuenta no existe o ya fue cobrada.',
  REDIS_TIMEOUT: 'El servicio de cuentas no está disponible. Se reintentará en unos segundos.',
  CASH_SHIFT_NOT_FOUND: 'No se encontró el turno de caja.',
  CASH_SHIFT_CLOSED: 'El turno de caja ya está cerrado.',
  UNAUTHORIZED: SESSION_EXPIRED_MESSAGE,
  NOT_FOUND: 'No se encontró el recurso solicitado.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado en el servidor. Inténtalo más tarde.',
  UNKNOWN_ERROR: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
}

const isKnownCode = (code: string): code is KnownErrorCode => code in FALLBACK_MESSAGES

const codeFromStatus = (status: number): KnownErrorCode => {
  if (status === 401) return ERROR_CODES.UNAUTHORIZED
  if (status === 403) return ERROR_CODES.FORBIDDEN_ROLE
  if (status === 404) return ERROR_CODES.NOT_FOUND
  if (status >= 500) return ERROR_CODES.INTERNAL_ERROR
  return ERROR_CODES.UNKNOWN_ERROR
}

export interface ApiErrorBody {
  code: string
  message: string
}

/** Normalized API failure. The UI decides the flow with `code` and shows `message`. */
export class ApiError extends Error {
  readonly status: number | null
  readonly code: string
  readonly body: unknown

  constructor(status: number | null, code: string, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.body = body
  }

  /** True for 4xx responses, which must not be retried. */
  get isClientError(): boolean {
    return this.status !== null && this.status >= 400 && this.status < 500
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

/** Converts any thrown value into an `ApiError`, reading the `{ code, message }` body when present. */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (!isAxiosError(error)) {
    return new ApiError(null, ERROR_CODES.UNKNOWN_ERROR, FALLBACK_MESSAGES.UNKNOWN_ERROR, error)
  }

  if (!error.response) {
    return new ApiError(null, ERROR_CODES.NETWORK_ERROR, FALLBACK_MESSAGES.NETWORK_ERROR)
  }

  const { status, data } = error.response
  const body = isRecord(data) ? data : null
  const code = nonEmptyString(body?.code) ?? codeFromStatus(status)
  const message =
    nonEmptyString(body?.message) ??
    (isKnownCode(code) ? FALLBACK_MESSAGES[code] : FALLBACK_MESSAGES[codeFromStatus(status)])

  return new ApiError(status, code, message, data)
}
