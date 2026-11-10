import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { forceCloseCashShift, getCashShiftSummaryById } from '../api/cashShifts'
import type { CashShiftSummaryDTO } from '../api/contracts/cashShift'
import { isApiError } from '../api/errors'
import { queryKeys } from '../api/queryKeys'
import { ROUTES } from '../app/routes'
import { BackLink } from '../components/layout/ModuleLayout'
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../components/ui'
import { cardClassName } from '../components/ui/cardClassName'
import { CashComparisonTable } from '../features/cash-close/CashComparisonTable'
import { cashDifference } from '../features/cash-close/closeView'
import { ShiftKpis } from '../features/cash-close/ShiftKpis'
import { parseAmountInput } from '../features/charge/chargeForm'
import { forceCloseFormSchema, type ForceCloseFormValues } from '../features/supervision/forceCloseForm'
import { SupervisionBadge } from '../features/supervision/SupervisionBadge'
import { blockNonAmountKeys } from '../lib/amountInput'
import { cn } from '../lib/cn'
import { formatLongDateTime } from '../lib/dates'
import { shortId } from '../lib/displayNames'
import { roundMoney } from '../lib/money'

const HTTP_FORBIDDEN = 403
const HTTP_NOT_FOUND = 404
const HTTP_CONFLICT = 409

function AuditForm({ summary, cashShiftId }: Readonly<{ summary: CashShiftSummaryDTO; cashShiftId: string }>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const cashierName = summary.cashier_name || 'el cajero'

  const form = useForm<ForceCloseFormValues>({
    resolver: zodResolver(forceCloseFormSchema) as unknown as Resolver<ForceCloseFormValues>,
    mode: 'all',
    defaultValues: { declared_cash: undefined, force_close_reason: '' },
  })

  // Live difference (AC4): computed on the fly with cents rounding.
  const declared = useWatch({ control: form.control, name: 'declared_cash' })
  const hasDeclared = typeof declared === 'number' && Number.isFinite(declared)
  const difference = hasDeclared ? cashDifference(declared, summary.expected_cash) : null

  const forceClose = useMutation({
    mutationFn: (values: { declared_cash: number; force_close_reason: string }) => forceCloseCashShift(cashShiftId, values),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.cashShiftSummaryById(cashShiftId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.openCashShifts })
      await navigate(ROUTES.supervision)
    },
    onError: async (error) => {
      // The interceptor already toasted the Backend message; here we only move the user somewhere useful.
      if (!isApiError(error)) return
      if (error.status === HTTP_CONFLICT) {
        // Another supervisor (or the cashier) closed it first: the grid shows the real state.
        await queryClient.invalidateQueries({ queryKey: queryKeys.openCashShifts })
        await navigate(ROUTES.supervision, { replace: true })
      } else if (error.status === HTTP_FORBIDDEN) {
        await navigate(ROUTES.menu, { replace: true })
      }
    },
  })

  const submit = form.handleSubmit((values) => {
    forceClose.mutate({
      declared_cash: roundMoney(values.declared_cash ?? 0),
      force_close_reason: values.force_close_reason.trim(),
    })
  })

  return (
    <Card className="flex flex-col gap-6" padding="lg">
      <h2 className="text-h3 text-ink">Auditoría y Declaración de Valores</h2>

      <form noValidate onSubmit={submit} aria-label="Auditoría y declaración de valores" className="flex flex-col gap-6">
        <div className="rounded-control border border-error/30 bg-error-soft p-4 tablet:p-6">
          <Input
            label="Efectivo físico auditado en cajón"
            required
            size="lg"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="$ 0.00"
            helperText={`Ingresa la suma total encontrada al auditar la estación de ${cashierName}.`}
            errorMessage={form.formState.errors.declared_cash?.message}
            onKeyDown={blockNonAmountKeys}
            className="tablet:max-w-sm"
            {...form.register('declared_cash', { setValueAs: parseAmountInput })}
          />
        </div>

        <CashComparisonTable
          expectedCash={summary.expected_cash}
          physicalCash={hasDeclared ? declared : undefined}
          difference={difference}
          physicalLabel="Monto físico auditado"
          emptyHint="Ingresa el efectivo auditado"
        />

        <Input
          label="Motivo de cierre forzado / Observación de auditoría"
          required
          autoComplete="off"
          helperText={
            difference === null || difference === 0
              ? 'Requerido para auditoría.'
              : 'Requerido para auditoría. Este turno quedará registrado como DESCUADRADO.'
          }
          errorMessage={form.formState.errors.force_close_reason?.message}
          {...form.register('force_close_reason')}
        />

        <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">
          <Button variant="neutral" size="lg" disabled={forceClose.isPending} onClick={() => void navigate(ROUTES.supervision)}>
            Cancelar auditoría
          </Button>
          <Button type="submit" variant="destructive" size="lg" isLoading={forceClose.isPending} disabled={!form.formState.isValid}>
            Ejecutar cierre forzado
          </Button>
        </div>
      </form>
    </Card>
  )
}

/** PMC-31 · Arqueo de un turno ajeno y cierre forzado (Administrador / Gerente). */
export function ForceCloseShiftPage() {
  const { cashShiftId = '' } = useParams()
  // Every visit starts from the current numbers: the summary changes with each charge.
  const summary = useQuery({
    queryKey: queryKeys.cashShiftSummaryById(cashShiftId),
    queryFn: () => getCashShiftSummaryById(cashShiftId),
    enabled: cashShiftId !== '',
    gcTime: 0,
  })
  const status = isApiError(summary.error) ? summary.error.status : null
  const notOpen = status === HTTP_NOT_FOUND
  const forbidden = status === HTTP_FORBIDDEN
  const data = summary.data

  const backToGrid = (
    <Link to={ROUTES.supervision} className={cn(cardClassName('md', true), 'inline-flex px-4 py-2 text-small font-semibold text-primary')}>
      Volver a Supervisión
    </Link>
  )

  return (
    <section className="flex flex-col gap-6" aria-labelledby="force-close-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to={ROUTES.supervision}>Regresar a Supervisión</BackLink>
        <SupervisionBadge />
      </div>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="force-close-title" className="text-h1 text-ink">
            {data ? `Arqueo de Turno: ${data.cashier_name || 'Sin nombre'}` : 'Arqueo de Turno'}
          </h1>
          <p className="mt-1 text-small text-muted">
            Supervisión y cierre administrativo{cashShiftId ? ` (ID: #${shortId(cashShiftId)})` : ''}
          </p>
        </div>
        {data && (
          <Badge variant="success" withDot>
            Turno Abierto: {formatLongDateTime(data.opened_at)} hrs
          </Badge>
        )}
      </header>

      {summary.isPending && summary.fetchStatus !== 'idle' && (
        <Card>
          <div className="flex justify-center py-12">
            <Spinner label="Cargando arqueo..." />
          </div>
        </Card>
      )}

      {notOpen && (
        <Card>
          <EmptyState
            title="Este turno ya no está abierto"
            description="Otro usuario pudo haberlo cerrado. Revisa el listado actualizado de turnos."
            action={backToGrid}
          />
        </Card>
      )}

      {forbidden && (
        <Card>
          <EmptyState
            title="No tienes permisos para auditar este turno"
            description="Tu rol ya no tiene acceso a esta pantalla."
            action={backToGrid}
          />
        </Card>
      )}

      {summary.isError && !notOpen && !forbidden && (
        <Card>
          <EmptyState
            title="No se pudo cargar el arqueo"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" isLoading={summary.isFetching} onClick={() => void summary.refetch()}>
                Reintentar
              </Button>
            }
          />
        </Card>
      )}

      {data && (
        <>
          <ShiftKpis summary={data} />
          <AuditForm summary={data} cashShiftId={cashShiftId} />
        </>
      )}
    </section>
  )
}
