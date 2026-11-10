import { z } from 'zod'
import { DECLARED_CASH_MESSAGE } from '../cash-close/closeForm'
import { roundMoney } from '../../lib/money'

export const AUDITED_CASH_MESSAGE = 'Ingresa el efectivo físico auditado (mayor o igual a 0)'
export const FORCE_CLOSE_REASON_MESSAGE = 'Escribe el motivo del cierre forzado'

export interface ForceCloseFormValues {
  declared_cash?: number
  force_close_reason: string
}

/** PMC-31 AC4: audited cash and a mandatory reason; the reason cannot be blank spaces. */
export const forceCloseFormSchema = z.object({
  declared_cash: z
    .number({ error: AUDITED_CASH_MESSAGE })
    .min(0, DECLARED_CASH_MESSAGE)
    .refine((value) => roundMoney(value) === value, 'Usa máximo 2 decimales'),
  force_close_reason: z.string().trim().min(1, FORCE_CLOSE_REASON_MESSAGE),
})
