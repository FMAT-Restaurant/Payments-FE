/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AUTH_LOGIN_URL?: string
  readonly VITE_AUTH_CHANGE_PASSWORD_URL?: string
  readonly VITE_AUTH_TOKEN_STORAGE_KEY?: string
  readonly VITE_API_MOCKS?: string
  readonly VITE_MOCK_ROLE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
