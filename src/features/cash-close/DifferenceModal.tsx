import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, type Resolver } from 'react-hook-form'
import { Badge, Button, Input, Modal } from '../../components/ui'
import { formatCurrency } from '../../lib/money'
import { describeDifference } from './closeView'
import { reasonFormSchema, type ReasonFormValues } from './closeForm'

export interface DifferenceModalProps {
  difference: number
  expectedCash: number
  declaredCash: number
  isSubmitting: boolean
  onConfirm: (reason: string) => void
  onReview: () => void
}

/** PMC-23 AC5 (mock docs/Descuadre.png): confirmation with the difference and a mandatory audit reason. */
export function DifferenceModal({
  difference,
  expectedCash,
  declaredCash,
  isSubmitting,
  onConfirm,
  onReview,
}: Readonly<DifferenceModalProps>) {
  const form = useForm<ReasonFormValues>({
    resolver: zodResolver(reasonFormSchema) as unknown as Resolver<ReasonFormValues>,
    mode: 'all',
    defaultValues: { reason: '' },
  })
  const view = describeDifference(difference)
  const isShortage = view.kind === 'shortage'
  const amount = formatCurrency(Math.abs(difference))
  const summary = `${isShortage ? 'Faltante' : 'Sobrante'} en caja: ${isShortage ? '-' : '+'}${amount}`

  const submit = form.handleSubmit((values) => onConfirm(values.reason.trim()))

  return (
    <Modal open title="Confirmar cierre con diferencia" onClose={isSubmitting ? undefined : onReview} size="sm">
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <Badge variant={view.variant} withDot className="self-start">
          Descuadre Detectado
        </Badge>
        <p className="text-body text-muted">
          El efectivo físico declarado no coincide con el monto calculado por el sistema. El turno quedará registrado
          en auditoría con estado <strong>DESCUADRADO</strong>.
        </p>

        <output
          className={`rounded-control border px-4 py-3 text-small ${
            isShortage ? 'border-error/30 bg-error-soft text-error' : 'border-warning/30 bg-warning-soft text-warning'
          }`}
        >
          <strong>{summary}</strong> (Esperado: {formatCurrency(expectedCash)} | Declarado:{' '}
          {formatCurrency(declaredCash)})
        </output>

        <Input
          label="Motivo de cierre / Observación de auditoría"
          required
          autoComplete="off"
          helperText="Requerido para cierres con diferencia."
          errorMessage={form.formState.errors.reason?.message}
          {...form.register('reason')}
        />

        <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">
          <Button variant="neutral" size="lg" onClick={onReview} disabled={isSubmitting}>
            Revisar conteo
          </Button>
          <Button type="submit" variant="destructive" size="lg" isLoading={isSubmitting} disabled={!form.formState.isValid}>
            Confirmar cierre de turno
          </Button>
        </div>
      </form>
    </Modal>
  )
}
