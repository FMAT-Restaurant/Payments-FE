import { cn } from '../../lib/cn'
import { formatCurrency } from '../../lib/money'
import type { ChargeEvaluation } from './chargeRules'

type Tone = 'default' | 'success' | 'error'

const labelTone: Record<Tone, string> = {
  default: 'text-primary',
  success: 'text-success',
  error: 'text-error',
}

const valueTone: Record<Tone, string> = {
  default: 'text-ink',
  success: 'text-success',
  error: 'text-error',
}

function Figure({ label, value, tone = 'default' }: Readonly<{ label: string; value: string; tone?: Tone }>) {
  return (
    <div className="flex flex-col gap-1">
      <dt className={cn('text-caption', labelTone[tone])}>{label}</dt>
      <dd className={cn('text-h2 tabular-nums', valueTone[tone])}>{value}</dd>
    </div>
  )
}

/** Highlighted box with "Monto a Cobrar", what was entered and the change or the missing amount (PMC-20 AC3/AC4). */
export function ChargeTotals({ evaluation }: Readonly<{ evaluation: ChargeEvaluation }>) {
  let outcome = <Figure label="Cambio a entregar (Efectivo)" value={formatCurrency(evaluation.change)} tone="success" />
  if (evaluation.shortfall > 0) {
    outcome = <Figure label="Faltante por cubrir" value={formatCurrency(evaluation.shortfall)} tone="error" />
  } else if (evaluation.cardExceeds || evaluation.unnecessaryCash) {
    outcome = <Figure label="Cambio a entregar (Efectivo)" value="—" />
  }

  return (
    <section aria-label="Resumen del cobro" className="rounded-control border border-accent/40 bg-primary-soft p-4 tablet:p-5">
      <dl className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
        <Figure label="Monto a Cobrar (Total + Propina)" value={formatCurrency(evaluation.amountDue)} />
        <Figure label="Total Ingresado" value={formatCurrency(evaluation.totalPaid)} />
        {outcome}
      </dl>
    </section>
  )
}
