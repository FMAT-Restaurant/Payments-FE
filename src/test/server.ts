import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'

/** MSW server shared by the tests; each test adds its own handlers with `server.use(...)`. */
export const server = setupServer(...handlers)
