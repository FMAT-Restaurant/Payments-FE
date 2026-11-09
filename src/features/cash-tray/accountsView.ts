import type { PendingAccountCardDTO, PreAccountStatus } from '../../api/contracts/pendingAccounts'
import { displayTableName, displayWaiterName, shortId } from '../../lib/displayNames'

/** PMC-19 AC3: from this wait on the card uses the error style (red). */
export const ALERT_AFTER_MINUTES = 15
/** Docs/Caja.png shows an amber badge between the fresh (green) and the late (red) ones. */
export const WARNING_AFTER_MINUTES = 5

export type WaitSeverity = 'success' | 'warning' | 'error'

/** Whole minutes elapsed since `timestamp`; never negative, 0 when the date is invalid. */
export function waitMinutes(timestamp: string, now: number): number {
  const time = new Date(timestamp).getTime()
  if (Number.isNaN(time)) return 0
  return Math.max(0, Math.floor((now - time) / 60_000))
}

export function formatWait(minutes: number): string {
  if (minutes < 1) return 'Hace menos de 1 min'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `Hace ${hours} h` : `Hace ${hours} h ${rest} min`
}

export function waitSeverity(minutes: number): WaitSeverity {
  if (minutes >= ALERT_AFTER_MINUTES) return 'error'
  if (minutes >= WARNING_AFTER_MINUTES) return 'warning'
  return 'success'
}

/** Units on the account (docs/Caja.png: 2x tacos + 1x beer = "3 artículos"). */
export function itemCount(account: PendingAccountCardDTO): number {
  return account.items.reduce((total, item) => total + item.quantity, 0)
}

export const formatItemCount = (count: number): string => `${count} ${count === 1 ? 'artículo' : 'artículos'}`

const STATUS_LABELS: Record<PreAccountStatus, string> = {
  PRE_ACCOUNT_PRINTED: 'Pre-cuenta impresa',
  ACCOUNT_REQUESTED: 'Cuenta solicitada',
}

export const preAccountStatusLabel = (status: PreAccountStatus): string => STATUS_LABELS[status] ?? status

/** Lowercase, no accents, no "#" and single spaces: "Mesa  04" ~ "mesa 04", "#ORD-9938" ~ "ord-9938". */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replaceAll('#', '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

/** PMC-19 AC2: local search by folio, table name or abbreviated session id. */
export function matchesSearch(account: PendingAccountCardDTO, term: string): boolean {
  const needle = normalizeSearch(term)
  if (needle === '') return true
  return [account.order_folio, displayTableName(account), shortId(account.dinning_session_id)].some((field) =>
    normalizeSearch(field).includes(needle),
  )
}

/** Distinct waiter labels, with the same fallback the cards show. Sorted for a stable select. */
export function waiterOptions(accounts: readonly PendingAccountCardDTO[]): string[] {
  return [...new Set(accounts.map(displayWaiterName))].sort((a, b) => a.localeCompare(b, 'es'))
}

export function filterAccounts(
  accounts: readonly PendingAccountCardDTO[],
  term: string,
  waiter: string,
): PendingAccountCardDTO[] {
  return accounts.filter(
    (account) => matchesSearch(account, term) && (waiter === '' || displayWaiterName(account) === waiter),
  )
}

/** Accounts of `previous` that are no longer in `next` (paid or cancelled between two polls). */
export function findRemovedAccounts(
  previous: readonly PendingAccountCardDTO[],
  next: readonly PendingAccountCardDTO[],
): PendingAccountCardDTO[] {
  const current = new Set(next.map((account) => account.dinning_session_id))
  return previous.filter((account) => !current.has(account.dinning_session_id))
}

const joinNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} y ${names.at(-1)}`

/** One unified message per polling cycle, even if several accounts left at once. */
export function removedAccountsMessage(removed: readonly PendingAccountCardDTO[]): string {
  const names = removed.map(displayTableName)
  if (names.length === 1) return `La cuenta de la ${names[0]} fue removida de la bandeja`
  return `Las cuentas de ${joinNames(names)} fueron removidas de la bandeja`
}
