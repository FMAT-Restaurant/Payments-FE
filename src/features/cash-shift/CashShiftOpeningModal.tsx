import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { openCashShift } from '../../api/cashShifts'
import { ERROR_CODES, isApiError } from '../../api/errors'
import { queryKeys } from '../../api/queryKeys'
import { ROUTES } from '../../app/routes'
import { useAuth } from '../../auth/AuthContext'
import { Badge, Button, Input, Modal } from '../../components/ui'
import { roundMoney } from '../../lib/money'
import { parseAmountInput } from '../charge/chargeForm'
import { resolveCashShiftOpening } from './cashShiftGate'

export const INITIAL_AMOUNT_MESSAGE = 'Ingresa un monto mayor o igual a 0'

const openingSchema = z.object({
  initial_amount: z
    .number({ error: INITIAL_AMOUNT_MESSAGE })
    .min(0, INITIAL_AMOUNT_MESSAGE)
    .refine((value) => roundMoney(value) === value, 'Usa máximo 2 decimales'),
})

interface OpeningFormValues {
  initial_amount?: number
}

/**
 * Blocking "Apertura de Turno de Caja" modal (PMC-22 AC2-AC4, mock docs/Apertura de caja.png).
 * It has no close button: the cashier either opens the shift or goes back to the menu.
 */
export function CashShiftOpeningModal() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const form = useForm<OpeningFormValues>({
    resolver: zodResolver(openingSchema) as unknown as Resolver<OpeningFormValues>,
    mode: 'all',
    defaultValues: { initial_amount: undefined },
  })

  const refreshShift = () => queryClient.invalidateQueries({ queryKey: queryKeys.myCashShift })

  const open = useMutation({
    mutationFn: openCashShift,
    onSuccess: async () => {
      resolveCashShiftOpening()
      await refreshShift()
    },
    onError: async (error) => {
      // AC4: the shift was already open in another session. The interceptor shows the Backend message;
      // here the modal closes and the active shift is recovered.
      if (isApiError(error) && error.code === ERROR_CODES.CASH_SHIFT_ALREADY_OPEN) {
        resolveCashShiftOpening()
        await refreshShift()
      }
    },
  })

  const onSubmit = form.handleSubmit((values) => open.mutate({ initial_amount: roundMoney(values.initial_amount ?? 0) }))

  const cancel = () => {
    resolveCashShiftOpening()
    void navigate(ROUTES.menu)
  }

  return (
    <Modal open title="Apertura de Turno de Caja" hideTitle size="sm">
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col items-start gap-3">
          <Badge variant="selected">Inicio de Jornada</Badge>
          <p aria-hidden="true" className="text-h2 text-ink">
            Apertura de Turno de Caja
          </p>
          <p className="text-body text-muted">
            Declara el efectivo físico inicial en el cajón para habilitar los cobros de tu sesión operativa.
          </p>
        </div>

        <Input label="Cajero responsable" value={user?.name ?? ''} disabled readOnly />

        <Input
          label="Fondo inicial en efectivo"
          required
          size="lg"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="$ 0.00"
          helperText="Este monto se sumará a los cobros en efectivo durante el arqueo de cierre."
          errorMessage={form.formState.errors.initial_amount?.message}
          {...form.register('initial_amount', { setValueAs: parseAmountInput })}
        />

        <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">
          <Button variant="neutral" size="lg" onClick={cancel}>
            Cancelar
          </Button>
          <Button type="submit" size="lg" isLoading={open.isPending} disabled={!form.formState.isValid}>
            Abrir turno
          </Button>
        </div>
      </form>
    </Modal>
  )
}
