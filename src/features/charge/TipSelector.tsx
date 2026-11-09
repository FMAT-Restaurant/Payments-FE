import { useFormContext, useWatch } from 'react-hook-form'
import { Card, Input } from '../../components/ui'
import { blockNonAmountKeys } from '../../lib/amountInput'
import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/money'
import { parseAmountInput, type ChargeFormValues } from './chargeForm'
import { TIP_PERCENTAGES, tipFromPercentage, type TipOption } from './chargeRules'

const optionClasses = (selected: boolean) =>
  cn(
    'flex min-h-14 flex-col items-center justify-center rounded-control border px-3 py-2 text-small transition-colors',
    selected
      ? 'border-2 border-primary bg-primary-soft font-semibold text-primary'
      : 'border-border bg-surface text-ink hover:bg-canvas',
  )

/** "Propina sugerida" (PMC-20 AC2): 10, 15, 20 % or a custom amount; no selection means no tip. */
export function TipSelector({ consumptionTotal }: Readonly<{ consumptionTotal: number }>) {
  const {
    register,
    setValue,
    formState: { errors },
  } = useFormContext<ChargeFormValues>()
  const selected = useWatch<ChargeFormValues, 'tip_option'>({ name: 'tip_option' })

  const choose = (option: TipOption) => {
    // Clicking the selected option again removes the tip (0%).
    setValue('tip_option', selected === option ? 'NONE' : option, { shouldValidate: true })
  }

  return (
    <Card>
      <fieldset>
        <legend className="mb-4 text-h3 text-ink">Propina sugerida</legend>
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
          {TIP_PERCENTAGES.map((percentage) => {
            const option = String(percentage) as TipOption
            return (
              <button
                key={percentage}
                type="button"
                aria-pressed={selected === option}
                onClick={() => choose(option)}
                className={optionClasses(selected === option)}
              >
                <span>{percentage}%</span>
                <span className={cn('text-caption', selected === option ? 'text-primary' : 'text-muted')}>
                  {formatCurrency(tipFromPercentage(consumptionTotal, percentage))}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            aria-pressed={selected === 'CUSTOM'}
            onClick={() => choose('CUSTOM')}
            className={optionClasses(selected === 'CUSTOM')}
          >
            Otro monto
          </button>
        </div>

        {selected === 'CUSTOM' && (
          <Input
            className="mt-4 tablet:max-w-xs"
            label="Monto de propina"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="$ 0.00"
            helperText="Escribe 0 si el cliente no deja propina."
            errorMessage={errors.custom_tip?.message}
            onKeyDown={blockNonAmountKeys}
            {...register('custom_tip', { setValueAs: parseAmountInput })}
          />
        )}
      </fieldset>
    </Card>
  )
}
