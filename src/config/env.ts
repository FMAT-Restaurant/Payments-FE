const readString = (value: string | undefined, fallback: string): string =>
  value && value.trim() !== '' ? value.trim() : fallback

const readPositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const env = {
  apiBaseUrl: readString(import.meta.env.VITE_API_BASE_URL, '/api/v1/payments'),
  authLoginUrl: readString(import.meta.env.VITE_AUTH_LOGIN_URL, '/login'),
  authChangePasswordUrl: readString(import.meta.env.VITE_AUTH_CHANGE_PASSWORD_URL, '/cambiar-contrasena'),
  tokenStorageKey: readString(import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY, 'access_token'),
  /** PMC-19: cash tray polling interval, in milliseconds. */
  pendingsPollMs: readPositiveInt(import.meta.env.VITE_PENDINGS_POLL_MS, 10_000),
  mockRole: readString(import.meta.env.VITE_MOCK_ROLE, 'Cajero'),
} as const
