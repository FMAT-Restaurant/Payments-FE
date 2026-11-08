const SHORT_ID_LENGTH = 8

const nonEmpty = (value: string | null | undefined): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null

/** First 8 characters of an id, used when a display name is missing (PMC-19 / PMC-20). */
export const shortId = (id: string): string => id.slice(0, SHORT_ID_LENGTH)

interface NamedAccount {
  dinning_session_id: string
  table_name?: string | null
  waiter_name?: string | null
}

/** Table or bar name, or the abbreviated session id when the Backend does not send it. */
export const displayTableName = (account: NamedAccount): string =>
  nonEmpty(account.table_name) ?? shortId(account.dinning_session_id)

/** Waiter name, or the abbreviated session id when the Backend does not send it. */
export const displayWaiterName = (account: NamedAccount): string =>
  nonEmpty(account.waiter_name) ?? shortId(account.dinning_session_id)
