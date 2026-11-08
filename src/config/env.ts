const readString = (value: string | undefined, fallback: string): string =>
  value && value.trim() !== '' ? value.trim() : fallback

export const env = {
  apiBaseUrl: readString(import.meta.env.VITE_API_BASE_URL, '/api/v1/payments'),
  authLoginUrl: readString(import.meta.env.VITE_AUTH_LOGIN_URL, '/login'),
  authChangePasswordUrl: readString(import.meta.env.VITE_AUTH_CHANGE_PASSWORD_URL, '/cambiar-contrasena'),
  tokenStorageKey: readString(import.meta.env.VITE_AUTH_TOKEN_STORAGE_KEY, 'access_token'),
  mockRole: readString(import.meta.env.VITE_MOCK_ROLE, 'Cajero'),
} as const
