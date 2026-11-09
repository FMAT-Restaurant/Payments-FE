/** Module routes. The paths named in the stories are kept as written (PMC-20, PMC-21, PMC-22). */
export const ROUTES = {
  menu: '/menu',
  /** PMC-19, PMC-21, PMC-22 */
  cashTray: '/bandeja-caja',
  /** PMC-20 */
  charge: '/payments/charge/:dinningSessionId',
  /** PMC-23 */
  cashShiftClose: '/arqueo-turno',
  /** PMC-24, PMC-25 */
  salesHistory: '/historial-ventas',
} as const

export const chargePath = (dinningSessionId: string): string =>
  ROUTES.charge.replace(':dinningSessionId', encodeURIComponent(dinningSessionId))
