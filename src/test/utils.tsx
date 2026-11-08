import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { AppProviders } from '../app/AppProviders'
import { base64UrlJson } from '../lib/base64Url'

/** Unsigned JWT for tests. */
export function makeToken(claims: Record<string, unknown>): string {
  return `${base64UrlJson({ alg: 'none', typ: 'JWT' })}.${base64UrlJson(claims)}.`
}

export const futureExp = () => Math.floor(Date.now() / 1000) + 3600

export function makeUserToken(role: string | string[], name = 'Edwing Molina'): string {
  return makeToken({ sub: 'user-123', name, role, exp: futureExp() })
}

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

interface RenderOptions {
  token?: string | null
  route?: string
  routes?: RouteObject[]
}

/** Renders inside the module providers. Without `routes`, `ui` is mounted at `route`. */
export function renderWithProviders(ui: ReactElement | null, { token = null, route = '/', routes }: RenderOptions = {}) {
  const router = createMemoryRouter(routes ?? [{ path: '*', element: ui }], { initialEntries: [route] })

  return {
    router,
    ...render(
      <AppProviders queryClient={createTestQueryClient()} getToken={() => token}>
        <RouterProvider router={router} />
      </AppProviders>,
    ),
  }
}
