/** Roles issued by Auth / Kong (PMC-18 AC4). "Admin" and "Contador" do not exist. */
export const ROLES = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  CASHIER: 'Cajero',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

const ALL_ROLES: readonly string[] = Object.values(ROLES)

export const isRole = (value: unknown): value is Role => typeof value === 'string' && ALL_ROLES.includes(value)

/** UI capabilities restricted by role. Screens ask for a permission, not for a role name. */
export const PERMISSIONS = {
  /** PMC-24: the CSV export is exclusive to Administrador. */
  exportSales: [ROLES.ADMIN],
  /** PMC-31: force-closing someone else's cash shift. */
  forceCloseCashShift: [ROLES.ADMIN, ROLES.MANAGER],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export const hasPermission = (roles: readonly Role[], permission: Permission): boolean =>
  (PERMISSIONS[permission] as readonly Role[]).some((role) => roles.includes(role))
