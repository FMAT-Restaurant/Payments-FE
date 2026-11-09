import { useState, type SubmitEvent } from 'react'
import { Button, Card, Input } from '../../components/ui'
import { rangeOrderError } from './historyFilters'

interface SalesFiltersProps {
  start: string
  end: string
  onApply: (range: { start: string; end: string }) => void
}

/** PMC-24 AC2: only the date range and "Aplicar filtros" (payment method and status filters were removed). */
export function SalesFilters({ start, end, onApply }: Readonly<SalesFiltersProps>) {
  const [from, setFrom] = useState(start)
  const [to, setTo] = useState(end)
  const [error, setError] = useState<string | null>(null)

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const problem = rangeOrderError(from, to)
    setError(problem)
    if (!problem) onApply({ start: from, end: to })
  }

  return (
    <Card>
      <form noValidate onSubmit={submit}>
        <fieldset className="grid grid-cols-1 items-start gap-4 tablet:grid-cols-[1fr_1fr_auto]">
          <legend className="mb-3 text-small font-semibold text-ink">Rango de fechas</legend>
          <Input label="Desde" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          <Input
            label="Hasta"
            type="date"
            value={to}
            errorMessage={error ?? undefined}
            onChange={(event) => setTo(event.target.value)}
          />
          <Button type="submit" size="lg" className="tablet:mt-[1.625rem]">
            Aplicar filtros
          </Button>
        </fieldset>
      </form>
    </Card>
  )
}
