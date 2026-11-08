import type { KeyboardEvent } from 'react'

const BLOCKED_KEYS = new Set(['-', '+', 'e', 'E'])

/** Money inputs never accept negative numbers or scientific notation. */
export const blockNonAmountKeys = (event: KeyboardEvent<HTMLInputElement>): void => {
  if (BLOCKED_KEYS.has(event.key)) event.preventDefault()
}
