import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import type { PaymentMethodType } from '../../api/contracts/charge'
import { Button, Card, Input, Select, type SelectOption } from '../../components/ui'
import { blockNonAmountKeys } from '../../lib/amountInput'
import { cn } from '../../lib/cn'
import { emptyPaymentLine, parseAmountInput, type ChargeFormValues } from './chargeForm'
import {
  CARD_EXCEEDS_TOTAL_MESSAGE,
  isCardMethod,
  UNNECESSARY_CASH_MESSAGE,
  type ChargeEvaluation,
} from './chargeRules'
import { PAYMENT_METHOD_LABELS } from './paymentMethods'

const METHOD_OPTIONS: SelectOption[] = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))

/** Business errors are shown live, even before the field is touched (PMC-20 AC4). */
const businessError = (method: PaymentMethodType, evaluation: ChargeEvaluation): string | undefined => {
  if (evaluation.cardExceeds && isCardMethod(method)) return CARD_EXCEEDS_TOTAL_MESSAGE
  if (evaluation.unnecessaryCash && !isCardMethod(method)) return UNNECESSARY_CASH_MESSAGE
  return undefined
}

/** "Desglose de métodos de pago": one or several lines of cash and cards (PMC-20 AC3). */
export function PaymentLinesField({ evaluation }: Readonly<{ evaluation: ChargeEvaluation }>) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<ChargeFormValues>()
  const { fields, append, remove } = useFieldArray({ control, name: 'payments' })
  const lines = useWatch({ control, name: 'payments' }) ?? []

  const addLine = () => {
    const hasCash = lines.some((line) => line.payment_method === 'CASH')
    append(emptyPaymentLine(hasCash ? 'CREDIT_CARD' : 'CASH'))
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 text-ink">Desglose de métodos de pago</h2>
        <Button variant="secondary" size="sm" onClick={addLine}>
          + Agregar método de pago
        </Button>
      </div>

      <ol className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const method = lines[index]?.payment_method ?? field.payment_method
          const card = isCardMethod(method)
          const removable = fields.length > 1
          const lineErrors = errors.payments?.[index]
          // Desktop row of 12 columns: method 3 + amount + reference 4 (cards) + "Quitar" 1 (several lines).
          let amountSpan = card ? 'desktop:col-span-4' : 'desktop:col-span-9'
          if (!card && removable) amountSpan = 'desktop:col-span-8'
          const referenceSpan = removable ? 'desktop:col-span-4' : 'desktop:col-span-5'

          return (
            <li
              key={field.id}
              aria-label={`Método ${index + 1}`}
              className="grid grid-cols-4 items-start gap-3 rounded-control border border-border bg-canvas p-4 tablet:grid-cols-8 desktop:grid-cols-12"
            >
              <Select
                className="col-span-4 tablet:col-span-3 desktop:col-span-3"
                label={`Método ${index + 1}`}
                required
                options={METHOD_OPTIONS}
                {...register(`payments.${index}.payment_method`)}
              />
              <Input
                className={cn('col-span-4 tablet:col-span-5', amountSpan)}
                label={card ? 'Monto cobrado en terminal' : 'Monto recibido en efectivo'}
                required
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="$ 0.00"
                onKeyDown={blockNonAmountKeys}
                errorMessage={businessError(method, evaluation) ?? lineErrors?.amount?.message}
                {...register(`payments.${index}.amount`, { setValueAs: parseAmountInput })}
              />
              {card && (
                <Input
                  className={cn('col-span-4 tablet:col-span-8', referenceSpan)}
                  label="Referencia de autorización (Voucher)"
                  required
                  autoComplete="off"
                  placeholder="AUTH-000000"
                  errorMessage={lineErrors?.authorization_reference?.message}
                  {...register(`payments.${index}.authorization_reference`)}
                />
              )}
              {removable && (
                <div className="col-span-4 flex justify-end tablet:col-span-8 desktop:col-span-1 desktop:pt-7">
                  <Button variant="tertiary" size="sm" aria-label={`Quitar método ${index + 1}`} onClick={() => remove(index)}>
                    Quitar
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
