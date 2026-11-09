import { z } from 'zod'
import { roundMoney } from '../../lib/money'

export const DECLARED_CASH_MESSAGE = 'Ingresa el efectivo contado (mayor o igual a 0)'
export const REASON_MESSAGE = 'Escribe el motivo del cierre'

export interface CloseFormValues {
  declared_cash?: number
}

export const closeFormSchema = z.object({
  declared_cash: z
    .number({ error: DECLARED_CASH_MESSAGE })
    .min(0, DECLARED_CASH_MESSAGE)
    .refine((value) => roundMoney(value) === value, 'Usa máximo 2 decimales'),
})

export interface ReasonFormValues {
  reason: string
}

export const reasonFormSchema = z.object({
  reason: z.string().trim().min(1, REASON_MESSAGE),
})
