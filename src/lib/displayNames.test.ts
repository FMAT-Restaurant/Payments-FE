import { describe, expect, it } from 'vitest'
import { displayTableName, displayWaiterName, shortId } from './displayNames'

const session = 'a91c4e27-5d3b-4f60-8e2a-6b7c1d0e9f12'

describe('display name fallbacks (PMC-19 / PMC-20)', () => {
  it('uses the names sent by the Backend', () => {
    const account = { dinning_session_id: session, table_name: 'Barra 02', waiter_name: ' Carlos R. ' }
    expect(displayTableName(account)).toBe('Barra 02')
    expect(displayWaiterName(account)).toBe('Carlos R.')
  })

  it('falls back to the abbreviated session id when a name is null, empty or missing', () => {
    expect(displayTableName({ dinning_session_id: session, table_name: null })).toBe('a91c4e27')
    expect(displayWaiterName({ dinning_session_id: session, waiter_name: '  ' })).toBe('a91c4e27')
    expect(displayWaiterName({ dinning_session_id: session })).toBe(shortId(session))
  })
})
