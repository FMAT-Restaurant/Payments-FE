import type { HttpHandler } from 'msw'

/**
 * Mock Service Worker handlers for the endpoints the Backend has not published yet or whose
 * contract is still being aligned. Each story adds the handlers of its own endpoints here,
 * following the `{ code, message }` error contract, e.g.:
 *
 *   http.get(apiUrl(endpoints.myCashShift()), () =>
 *     HttpResponse.json({ code: 'NOT_FOUND', message: 'No tienes un turno abierto' }, { status: 404 }))
 */
export const handlers: HttpHandler[] = []
