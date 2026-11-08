import { setupWorker } from 'msw/browser'
import { env } from '../config/env'
import { createDevSession } from './devSession'
import { handlers } from './handlers'

export async function startMockWorker(): Promise<void> {
  createDevSession(env.mockRole)
  await setupWorker(...handlers).start({ onUnhandledFrame: 'bypass' })
}
