/**
 * Endpoint map of the Payments microservice, relative to `/api/v1/payments` (PMC-18 "Mapa de Rutas").
 * Path segments are encoded so a folio such as "#TX-..." or a UUID can never break the URL.
 */
const segment = (value: string): string => encodeURIComponent(value.replace(/^#/, ''))

export const endpoints = {
  /** PMC-19 */
  pendingAccounts: () => '/pendings',
  /** PMC-20 */
  pendingAccount: (dinningSessionId: string) => `/pendings/${segment(dinningSessionId)}`,
  /** PMC-20 */
  charge: () => '/charge',
  /** PMC-21, PMC-25 */
  ticket: (folio: string) => `/${segment(folio)}/ticket`,
  /** PMC-22 */
  openCashShift: () => '/cash-shifts/open',
  /** PMC-22 */
  myCashShift: () => '/cash-shifts/me',
  /** PMC-23 */
  cashShiftSummary: () => '/cash-shifts/summary',
  /** PMC-23 */
  closeCashShift: () => '/cash-shifts/close',
  /** PMC-24 */
  salesHistory: () => '',
  /** PMC-24 (Administrador only) */
  salesExport: () => '/export',
  /** PMC-25 */
  transactionDetail: (folio: string) => `/${segment(folio)}`,
  /** PMC-31 */
  openCashShifts: () => '/cash-shifts/open',
  /** PMC-31 */
  cashShiftSummaryById: (cashShiftId: string) => `/cash-shifts/${segment(cashShiftId)}/summary`,
  /** PMC-31 */
  forceCloseCashShift: (cashShiftId: string) => `/cash-shifts/${segment(cashShiftId)}/force-close`,
} as const
