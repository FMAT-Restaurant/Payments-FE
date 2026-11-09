import { z } from 'zod'
import { PAYMENT_METHODS, type ChargeRequestDTO, type PaymentMethodType } from '../../api/contracts/charge'
import { formatCurrency, roundMoney } from '../../lib/money'
import {
  CARD_EXCEEDS_TOTAL_MESSAGE,
  evaluateCharge,
  isCardMethod,
  resolveTip,
  TIP_OPTIONS,
  UNNECESSARY_CASH_MESSAGE,
  type TipOption,
} from './chargeRules'

export interface PaymentLineFormValues {
  payment_method: PaymentMethodType
  amount?: number
  authorization_reference: string
}

export interface ChargeFormValues {
  tip_option: TipOption
  custom_tip?: number
  payments: PaymentLineFormValues[]
}

export const emptyPaymentLine = (payment_method: PaymentMethodType = 'CASH'): PaymentLineFormValues => ({
  payment_method,
  amount: undefined,
  authorization_reference: '',
})

export const defaultChargeFormValues = (): ChargeFormValues => ({
  tip_option: 'NONE',
  custom_tip: undefined,
  payments: [emptyPaymentLine()],
})

/** Converts the text of a numeric input into a number; an empty field stays `undefined`. */
export const parseAmountInput = (value: unknown): number | undefined =>
  value === '' || value === null || value === undefined ? undefined : Number(value)

const hasAtMostTwoDecimals = (value: number): boolean => Math.abs(roundMoney(value) - value) < 1e-9

const amountSchema = z
  .number({ error: 'Ingresa el monto' })
  .gt(0, 'Ingresa un monto mayor a 0')
  .refine(hasAtMostTwoDecimals, 'Usa máximo 2 decimales')

/**
 * Whole-form validation (PMC-20 AC2-AC4). The cross rules between payments, tip and total
 * live in `superRefine` so "Confirmar cobro" can never send an invalid charge.
 */
export function createChargeFormSchema(consumptionTotal: number) {
  return z
    .object({
      tip_option: z.enum(TIP_OPTIONS),
      custom_tip: z.number().optional(),
      payments: z
        .array(
          z.object({
            payment_method: z.enum(PAYMENT_METHODS),
            amount: amountSchema,
            authorization_reference: z.string(),
          }),
        )
        .min(1, 'Agrega al menos un método de pago'),
    })
    .superRefine((values, ctx) => {
      if (values.tip_option === 'CUSTOM') {
        const tip = values.custom_tip
        if (tip === undefined || !Number.isFinite(tip)) {
          ctx.addIssue({ code: 'custom', path: ['custom_tip'], message: 'Ingresa el monto de la propina' })
        } else if (tip < 0) {
          ctx.addIssue({ code: 'custom', path: ['custom_tip'], message: 'La propina no puede ser negativa' })
        } else if (!hasAtMostTwoDecimals(tip)) {
          ctx.addIssue({ code: 'custom', path: ['custom_tip'], message: 'Usa máximo 2 decimales' })
        }
      }

      values.payments.forEach((line, index) => {
        if (isCardMethod(line.payment_method) && line.authorization_reference.trim() === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['payments', index, 'authorization_reference'],
            message: 'La referencia de autorización es obligatoria',
          })
        }
      })

      const tip = resolveTip(consumptionTotal, values.tip_option, values.custom_tip)
      const evaluation = evaluateCharge(consumptionTotal + tip, values.payments)

      values.payments.forEach((line, index) => {
        const card = isCardMethod(line.payment_method)
        if (evaluation.cardExceeds && card) {
          ctx.addIssue({ code: 'custom', path: ['payments', index, 'amount'], message: CARD_EXCEEDS_TOTAL_MESSAGE })
        }
        if (evaluation.unnecessaryCash && !card) {
          ctx.addIssue({ code: 'custom', path: ['payments', index, 'amount'], message: UNNECESSARY_CASH_MESSAGE })
        }
      })

      if (evaluation.shortfall > 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['payments'],
          message: `Faltante por cubrir: ${formatCurrency(evaluation.shortfall)}`,
        })
      }
    })
}

/** Payload of `POST /charge`: only `dinning_session_id`, `tip` and `payments` (PMC-20 scenario 1). */
export function toChargeRequest(
  dinningSessionId: string,
  values: ChargeFormValues,
  consumptionTotal: number,
): ChargeRequestDTO {
  return {
    dinning_session_id: dinningSessionId,
    tip: resolveTip(consumptionTotal, values.tip_option, values.custom_tip),
    payments: values.payments.map((line) => ({
      payment_method: line.payment_method,
      amount: roundMoney(line.amount ?? 0),
      authorization_reference: isCardMethod(line.payment_method) ? line.authorization_reference.trim() : null,
    })),
  }
}
