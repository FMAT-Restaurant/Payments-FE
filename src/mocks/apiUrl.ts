import { env } from '../config/env'

/** Absolute pattern for MSW handlers, e.g. apiUrl('/cash-shifts/me') -> '/api/v1/payments/cash-shifts/me'. */
export const apiUrl = (path: string): string => `${env.apiBaseUrl}${path}`
