import { describe, expect, it } from 'vitest'
import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'
import {
  filterAccounts,
  findRemovedAccounts,
  formatItemCount,
  formatWait,
  itemCount,
  matchesSearch,
  normalizeSearch,
  preAccountStatusLabel,
  removedAccountsMessage,
  waiterOptions,
  waitMinutes,
  waitSeverity,
} from './accountsView'

const account = (overrides: Partial<PendingAccountCardDTO> = {}): PendingAccountCardDTO => ({
  dinning_session_id: '3f2b8c1e-7a4d-4e9b-b1c2-9d8e7f6a5b40',
  order_folio: '#ORD-9938',
  table_name: 'Mesa 04',
  waiter_name: 'Carlos R.',
  timestamp: '2026-11-08T12:00:00.000Z',
  pre_account_status: 'ACCOUNT_REQUESTED',
  items: [
    { dish_id: 'a', name: 'Tacos', quantity: 2, unit_price: 60, amount: 120 },
    { dish_id: 'b', name: 'Cerveza', quantity: 1, unit_price: 85, amount: 85 },
  ],
  totals: { subtotal: 205, taxes: 32.8, expected_total: 237.8 },
  ...overrides,
})

const minutesAfter = (minutes: number) => new Date('2026-11-08T12:00:00.000Z').getTime() + minutes * 60_000

describe('waiting time', () => {
  it('counts whole minutes and never goes negative', () => {
    expect(waitMinutes('2026-11-08T12:00:00.000Z', minutesAfter(2) + 59_000)).toBe(2)
    expect(waitMinutes('2026-11-08T12:00:00.000Z', minutesAfter(-3))).toBe(0)
    expect(waitMinutes('not a date', Date.now())).toBe(0)
  })

  it('formats the relative label', () => {
    expect(formatWait(0)).toBe('Hace menos de 1 min')
    expect(formatWait(2)).toBe('Hace 2 min')
    expect(formatWait(59)).toBe('Hace 59 min')
    expect(formatWait(60)).toBe('Hace 1 h')
    expect(formatWait(135)).toBe('Hace 2 h 15 min')
  })

  it('uses the error style from 15 minutes on', () => {
    expect(waitSeverity(4)).toBe('success')
    expect(waitSeverity(5)).toBe('warning')
    expect(waitSeverity(14)).toBe('warning')
    expect(waitSeverity(15)).toBe('error')
    expect(waitSeverity(90)).toBe('error')
  })
})

describe('card texts', () => {
  it('counts units, not lines', () => {
    expect(itemCount(account())).toBe(3)
    expect(formatItemCount(1)).toBe('1 artículo')
    expect(formatItemCount(3)).toBe('3 artículos')
  })

  it('labels the pre-account status', () => {
    expect(preAccountStatusLabel('PRE_ACCOUNT_PRINTED')).toBe('Pre-cuenta impresa')
    expect(preAccountStatusLabel('ACCOUNT_REQUESTED')).toBe('Cuenta solicitada')
  })
})

describe('local search and filters', () => {
  const noNames = account({
    dinning_session_id: 'a91c4e27-5d3b-4f60-8e2a-6b7c1d0e9f12',
    order_folio: '#ORD-9939',
    table_name: null,
    waiter_name: undefined,
  })
  const bar = account({
    dinning_session_id: 'b2',
    order_folio: '#ORD-9940',
    table_name: 'Barra 02',
    waiter_name: 'Luis T.',
  })
  const all = [account(), noNames, bar]

  it('ignores case, accents, "#" and extra spaces', () => {
    expect(normalizeSearch('  #ORD-9938 ')).toBe('ord-9938')
    expect(normalizeSearch('MESA   04')).toBe('mesa 04')
    expect(normalizeSearch('Número')).toBe('numero')
  })

  it('matches by folio, table name and abbreviated session id', () => {
    expect(matchesSearch(account(), '#ord-9938')).toBe(true)
    expect(matchesSearch(account(), '9938')).toBe(true)
    expect(matchesSearch(account(), 'mesa 04')).toBe(true)
    expect(matchesSearch(noNames, 'a91c4e27')).toBe(true)
    expect(matchesSearch(account(), 'barra')).toBe(false)
    expect(matchesSearch(account(), '   ')).toBe(true)
  })

  it('filters by search term and waiter together', () => {
    expect(filterAccounts(all, 'barra 02', '')).toEqual([bar])
    expect(filterAccounts(all, '', 'Luis T.')).toEqual([bar])
    expect(filterAccounts(all, 'barra', 'Carlos R.')).toEqual([])
    expect(filterAccounts(all, '', '')).toHaveLength(3)
  })

  it('lists each waiter once, falling back to the abbreviated id', () => {
    expect(waiterOptions([...all, account({ dinning_session_id: 'x' })])).toEqual(['a91c4e27', 'Carlos R.', 'Luis T.'])
  })
})

describe('removed accounts', () => {
  const mesa12 = account({ dinning_session_id: 'm12', table_name: 'Mesa 12' })
  const barra = account({ dinning_session_id: 'b02', table_name: 'Barra 02' })
  const mesa04 = account()

  it('finds the accounts that disappeared between two polls', () => {
    expect(findRemovedAccounts([mesa12, mesa04], [mesa04])).toEqual([mesa12])
    expect(findRemovedAccounts([mesa04], [mesa04, mesa12])).toEqual([])
  })

  it('builds one message for one account', () => {
    expect(removedAccountsMessage([mesa12])).toBe('La cuenta de la Mesa 12 fue removida de la bandeja')
  })

  it('builds one message for several accounts', () => {
    expect(removedAccountsMessage([mesa12, barra])).toBe('Las cuentas de Mesa 12 y Barra 02 fueron removidas de la bandeja')
    expect(removedAccountsMessage([mesa12, barra, mesa04])).toBe(
      'Las cuentas de Mesa 12, Barra 02 y Mesa 04 fueron removidas de la bandeja',
    )
  })

  it('falls back to the abbreviated id when the table is unknown', () => {
    const unnamed = account({ dinning_session_id: 'a91c4e27-5d3b-4f60-8e2a-6b7c1d0e9f12', table_name: null })
    expect(removedAccountsMessage([unnamed])).toBe('La cuenta de la a91c4e27 fue removida de la bandeja')
  })
})
