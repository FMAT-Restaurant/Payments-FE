import { describe, expect, it } from 'vitest'
import { createChargeFormSchema, defaultChargeFormValues, parseAmountInput, toChargeRequest } from './chargeForm'
import {
  blockingReason,
  CARD_EXCEEDS_TOTAL_MESSAGE,
  evaluateCharge,
  resolveTip,
  tipFromPercentage,
  UNNECESSARY_CASH_MESSAGE,
} from './chargeRules'

describe('tips (AC2)', () => {
  it('computes the suggested tip over the consumption total, as in the mock', () => {
    expect(tipFromPercentage(237.8, 10)).toBe(23.78)
    expect(tipFromPercentage(237.8, 15)).toBe(35.67)
    expect(tipFromPercentage(237.8, 20)).toBe(47.56)
  })

  it('resolves no tip, percentages and custom amounts', () => {
    expect(resolveTip(200, 'NONE', 50)).toBe(0)
    expect(resolveTip(200, '10', undefined)).toBe(20)
    expect(resolveTip(200, 'CUSTOM', 30)).toBe(30)
    expect(resolveTip(200, 'CUSTOM', 0)).toBe(0)
    expect(resolveTip(200, 'CUSTOM', -5)).toBe(0)
    expect(resolveTip(200, 'CUSTOM', undefined)).toBe(0)
  })
})

describe('evaluateCharge (AC4)', () => {
  it('Scenario 1: exact mixed payment', () => {
    const result = evaluateCharge(230, [
      { payment_method: 'CASH', amount: 100 },
      { payment_method: 'CREDIT_CARD', amount: 130 },
    ])
    expect(result).toMatchObject({ totalPaid: 230, shortfall: 0, change: 0, canConfirm: true })
    expect(blockingReason(result)).toBeNull()
  })

  it('Scenario 2: change only from the cash that exceeds the amount due', () => {
    const result = evaluateCharge(230, [
      { payment_method: 'CREDIT_CARD', amount: 100 },
      { payment_method: 'CASH', amount: 150 },
    ])
    expect(result).toMatchObject({ totalPaid: 250, change: 20, canConfirm: true })
  })

  it('Scenario 3: cards alone cannot exceed the amount due', () => {
    const result = evaluateCharge(230, [{ payment_method: 'DEBIT_CARD', amount: 250 }])
    expect(result).toMatchObject({ cardExceeds: true, change: 0, canConfirm: false })
    expect(blockingReason(result)).toBe(CARD_EXCEEDS_TOTAL_MESSAGE)
  })

  it('Scenario 4: cash is unnecessary when cards cover the exact total', () => {
    const result = evaluateCharge(230, [
      { payment_method: 'CREDIT_CARD', amount: 230 },
      { payment_method: 'CASH', amount: 20 },
    ])
    expect(result).toMatchObject({ unnecessaryCash: true, change: 0, canConfirm: false })
    expect(blockingReason(result)).toBe(UNNECESSARY_CASH_MESSAGE)
  })

  it('reports the missing amount and ignores empty lines', () => {
    const result = evaluateCharge(273.47, [
      { payment_method: 'CASH', amount: 200 },
      { payment_method: 'CREDIT_CARD', amount: undefined },
    ])
    expect(result).toMatchObject({ shortfall: 73.47, canConfirm: false })
    expect(blockingReason(result)).toBe('Faltante por cubrir: $73.47')
  })

  it('reproduces the mock: $200 cash + $100 card for $273.47 gives $26.53 of change', () => {
    const result = evaluateCharge(237.8 + 35.67, [
      { payment_method: 'CASH', amount: 200 },
      { payment_method: 'CREDIT_CARD', amount: 100 },
    ])
    expect(result).toMatchObject({ amountDue: 273.47, totalPaid: 300, change: 26.53 })
  })

  it('avoids floating point errors', () => {
    const result = evaluateCharge(0.3, [
      { payment_method: 'CASH', amount: 0.1 },
      { payment_method: 'CASH', amount: 0.2 },
    ])
    expect(result).toMatchObject({ totalPaid: 0.3, shortfall: 0, change: 0, canConfirm: true })
  })
})

describe('createChargeFormSchema (superRefine)', () => {
  const schema = createChargeFormSchema(200)
  const messages = (values: unknown) => {
    const result = schema.safeParse(values)
    return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
  }

  it('accepts a valid mixed charge', () => {
    expect(
      messages({
        tip_option: 'CUSTOM',
        custom_tip: 30,
        payments: [
          { payment_method: 'CASH', amount: 100, authorization_reference: '' },
          { payment_method: 'CREDIT_CARD', amount: 130, authorization_reference: 'AUTH-123' },
        ],
      }),
    ).toEqual([])
  })

  it('requires the authorization reference for cards', () => {
    expect(
      messages({
        tip_option: 'NONE',
        payments: [{ payment_method: 'DEBIT_CARD', amount: 200, authorization_reference: '  ' }],
      }),
    ).toEqual(['payments.0.authorization_reference: La referencia de autorización es obligatoria'])
  })

  it('rejects negative or missing custom tips', () => {
    const base = { payments: [{ payment_method: 'CASH', amount: 300, authorization_reference: '' }] }
    expect(messages({ ...base, tip_option: 'CUSTOM', custom_tip: -10 })).toContain(
      'custom_tip: La propina no puede ser negativa',
    )
    expect(messages({ ...base, tip_option: 'CUSTOM' })).toContain('custom_tip: Ingresa el monto de la propina')
    expect(messages({ ...base, tip_option: 'CUSTOM', custom_tip: 1.555 })).toContain('custom_tip: Usa máximo 2 decimales')
  })

  it('adds the business rules to the affected fields', () => {
    expect(
      messages({ tip_option: 'NONE', payments: [{ payment_method: 'CREDIT_CARD', amount: 250, authorization_reference: 'A' }] }),
    ).toEqual([`payments.0.amount: ${CARD_EXCEEDS_TOTAL_MESSAGE}`])
    expect(
      messages({
        tip_option: 'NONE',
        payments: [
          { payment_method: 'CREDIT_CARD', amount: 200, authorization_reference: 'A' },
          { payment_method: 'CASH', amount: 5, authorization_reference: '' },
        ],
      }),
    ).toEqual([`payments.1.amount: ${UNNECESSARY_CASH_MESSAGE}`])
    expect(
      messages({ tip_option: '10', payments: [{ payment_method: 'CASH', amount: 200, authorization_reference: '' }] }),
    ).toEqual(['payments: Faltante por cubrir: $20.00'])
  })

  it('validates each amount', () => {
    expect(
      messages({ tip_option: 'NONE', payments: [{ payment_method: 'CASH', amount: undefined, authorization_reference: '' }] }),
    ).toContain('payments.0.amount: Ingresa el monto')
    expect(
      messages({ tip_option: 'NONE', payments: [{ payment_method: 'CASH', amount: 0, authorization_reference: '' }] }),
    ).toContain('payments.0.amount: Ingresa un monto mayor a 0')
  })
})

describe('form helpers', () => {
  it('parses numeric inputs keeping empty fields undefined', () => {
    expect(parseAmountInput('')).toBeUndefined()
    expect(parseAmountInput(null)).toBeUndefined()
    expect(parseAmountInput('12.50')).toBe(12.5)
  })

  it('starts with no tip and one cash line', () => {
    expect(defaultChargeFormValues()).toEqual({
      tip_option: 'NONE',
      custom_tip: undefined,
      payments: [{ payment_method: 'CASH', amount: undefined, authorization_reference: '' }],
    })
  })

  it('builds the reduced payload: no references for cash, trimmed references for cards', () => {
    expect(
      toChargeRequest(
        'SESSION_123',
        {
          tip_option: '15',
          payments: [
            { payment_method: 'CASH', amount: 200, authorization_reference: 'ignored' },
            { payment_method: 'CREDIT_CARD', amount: 100, authorization_reference: ' AUTH-987654 ' },
          ],
        },
        237.8,
      ),
    ).toEqual({
      dinning_session_id: 'SESSION_123',
      tip: 35.67,
      payments: [
        { payment_method: 'CASH', amount: 200, authorization_reference: null },
        { payment_method: 'CREDIT_CARD', amount: 100, authorization_reference: 'AUTH-987654' },
      ],
    })
  })
})
