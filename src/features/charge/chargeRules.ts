import type { PaymentMethodType } from '../../api/contracts/charge'
import { formatCurrency, roundMoney } from '../../lib/money'

export const TIP_PERCENTAGES = [10, 15, 20] as const
export const TIP_OPTIONS = ['NONE', '10', '15', '20', 'CUSTOM'] as const
export type TipOption = (typeof TIP_OPTIONS)[number]

export const CARD_EXCEEDS_TOTAL_MESSAGE = 'Los pagos electrónicos no pueden exceder el total de la cuenta'
export const UNNECESSARY_CASH_MESSAGE = 'La tarjeta ya cubre el total de la cuenta; el efectivo es innecesario'

export const isCardMethod = (method: PaymentMethodType): boolean => method !== 'CASH'

/**
 * Suggested tip over the consumption total (subtotal + taxes), as the "Procesar Pago" mock does:
 * 15% of $237.80 = $35.67.
 */
export const tipFromPercentage = (consumptionTotal: number, percentage: number): number =>
  roundMoney((consumptionTotal * percentage) / 100)

export function resolveTip(consumptionTotal: number, option: TipOption, customTip: number | undefined): number {
  if (option === 'NONE') return 0
  if (option === 'CUSTOM') {
    return customTip !== undefined && Number.isFinite(customTip) && customTip > 0 ? roundMoney(customTip) : 0
  }
  return tipFromPercentage(consumptionTotal, Number(option))
}

export interface PaymentLineInput {
  payment_method: PaymentMethodType
  amount?: number
}

export interface ChargeEvaluation {
  /** Consumption total + tip ("Monto a Cobrar"). */
  amountDue: number
  cardTotal: number
  cashTotal: number
  totalPaid: number
  /** Amount still missing; 0 when the payments cover the amount due. */
  shortfall: number
  /** Change to hand over; only cash can produce it. */
  change: number
  /** Card payments alone exceed the amount due. */
  cardExceeds: boolean
  /** Cards already cover the exact amount due and a cash line was added. */
  unnecessaryCash: boolean
  canConfirm: boolean
}

const validAmount = (amount: number | undefined): number =>
  amount !== undefined && Number.isFinite(amount) && amount > 0 ? amount : 0

/** Business rules of PMC-20 AC4, with strict 2-decimal rounding. */
export function evaluateCharge(amountDue: number, payments: readonly PaymentLineInput[]): ChargeEvaluation {
  const due = roundMoney(amountDue)
  const cardTotal = roundMoney(
    payments.filter((line) => isCardMethod(line.payment_method)).reduce((sum, line) => sum + validAmount(line.amount), 0),
  )
  const cashTotal = roundMoney(
    payments.filter((line) => !isCardMethod(line.payment_method)).reduce((sum, line) => sum + validAmount(line.amount), 0),
  )
  const totalPaid = roundMoney(cardTotal + cashTotal)

  const cardExceeds = cardTotal > due
  const hasCashLine = payments.some((line) => !isCardMethod(line.payment_method))
  const unnecessaryCash = !cardExceeds && due > 0 && cardTotal === due && hasCashLine
  const shortfall = cardExceeds ? 0 : roundMoney(Math.max(due - totalPaid, 0))
  const change = !cardExceeds && !unnecessaryCash && totalPaid > due ? roundMoney(totalPaid - due) : 0

  return {
    amountDue: due,
    cardTotal,
    cashTotal,
    totalPaid,
    shortfall,
    change,
    cardExceeds,
    unnecessaryCash,
    canConfirm: !cardExceeds && !unnecessaryCash && shortfall === 0,
  }
}

/** Why "Confirmar cobro" is blocked, or `null` when the charge can be confirmed. */
export function blockingReason(evaluation: ChargeEvaluation): string | null {
  if (evaluation.cardExceeds) return CARD_EXCEEDS_TOTAL_MESSAGE
  if (evaluation.unnecessaryCash) return UNNECESSARY_CASH_MESSAGE
  if (evaluation.shortfall > 0) return `Faltante por cubrir: ${formatCurrency(evaluation.shortfall)}`
  return null
}
