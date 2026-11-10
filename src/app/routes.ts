/** Module routes. The paths named in the stories are kept as written (PMC-20, PMC-21, PMC-22). */
export const ROUTES = {
  menu: '/menu',
  /** PMC-19, PMC-21, PMC-22 */
  cashTray: '/bandeja-caja',
  /** PMC-20 */
  charge: '/payments/charge/:dinningSessionId',
  /** PMC-23 */
  cashShiftClose: '/arqueo-turno',
  /** PMC-31: Administrador / Gerente */
  supervision: '/supervision-cajas',
  /** PMC-31 */
  supervisionDetail: '/supervision-cajas/:cashShiftId',
  /** PMC-24, PMC-25 */
  salesHistory: '/historial-ventas',
  /** PMC-25: child route; the history stays mounted behind the modal. */
  salesDetail: '/historial-ventas/:folio',
} as const

export const chargePath = (dinningSessionId: string): string =>
  ROUTES.charge.replace(':dinningSessionId', encodeURIComponent(dinningSessionId))

/** PMC-31: audit view of an open shift. */
export const supervisionDetailPath = (cashShiftId: string): string =>
  ROUTES.supervisionDetail.replace(':cashShiftId', encodeURIComponent(cashShiftId))

/** Detail of a sale; `search` keeps the filters and the page of the history (PMC-25 AC3). */
export const salesDetailPath = (folio: string, search = ''): string =>
  `${ROUTES.salesDetail.replace(':folio', encodeURIComponent(folio.replace(/^#/, '')))}${search}`

/** Route metadata read with `useMatches()`. */
export interface RouteHandle {
  /** PMC-22 AC1: the screen needs an open cash shift; without one the opening modal blocks it. */
  requiresCashShift?: boolean
}
