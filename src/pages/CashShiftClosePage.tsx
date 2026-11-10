import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { closeCashShift, getCashShiftSummary } from '../api/cashShifts'
import type { CashShiftSummaryDTO } from '../api/contracts/cashShift'
import { isApiError } from '../api/errors'
import { queryKeys } from '../api/queryKeys'
import { ROUTES } from '../app/routes'
import { useAuth } from '../auth/AuthContext'
import { BackLink } from '../components/layout/ModuleLayout'
import { Badge, Button, Card, EmptyState, Input, Spinner } from '../components/ui'
import { cardClassName } from '../components/ui/cardClassName'
import { closeFormSchema, type CloseFormValues } from '../features/cash-close/closeForm'
import { cashDifference } from '../features/cash-close/closeView'
import { CashComparisonTable } from '../features/cash-close/CashComparisonTable'
import { DifferenceModal } from '../features/cash-close/DifferenceModal'
import { ShiftKpis } from '../features/cash-close/ShiftKpis'
import { parseAmountInput } from '../features/charge/chargeForm'
import { blockNonAmountKeys } from '../lib/amountInput'
import { cn } from '../lib/cn'
import { formatTime } from '../lib/dates'
import { roundMoney } from '../lib/money'

function ReconciliationForm({ summary }: Readonly<{ summary: CashShiftSummaryDTO }>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pendingDeclared, setPendingDeclared] = useState<number | null>(null)

  const form = useForm<CloseFormValues>({
    resolver: zodResolver(closeFormSchema) as unknown as Resolver<CloseFormValues>,
    mode: 'all',
    defaultValues: { declared_cash: undefined },
  })

  // Live difference (AC4): computed on the fly with cents rounding.
  const declared = useWatch({ control: form.control, name: 'declared_cash' })
  const hasDeclared = typeof declared === 'number' && Number.isFinite(declared)
  const difference = hasDeclared ? cashDifference(declared, summary.expected_cash) : null
  
  const close = useMutation({
    mutationFn: closeCashShift,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: queryKeys.cashShiftSummary })
      await queryClient.invalidateQueries({ queryKey: queryKeys.myCashShift })
      await navigate(ROUTES.menu)
    },
  })

  const submit = form.handleSubmit((values) => {
    const declaredCash = roundMoney(values.declared_cash ?? 0)
    if (cashDifference(declaredCash, summary.expected_cash) === 0) {
      close.mutate({ declared_cash: declaredCash })
    } else {
      setPendingDeclared(declaredCash)
    }
  })

  const confirmWithDifference = (reason: string) => {
    if (pendingDeclared === null) return
    close.mutate({ declared_cash: pendingDeclared, reason })
  }

  return (
    <>
      <Card className="flex flex-col gap-6" padding="lg">
        <h2 className="text-h3 text-ink">Declaración de Valores</h2>

        <form noValidate onSubmit={submit} aria-label="Declaración de valores" className="flex flex-col gap-6">
          <div className="rounded-control border border-warning/30 bg-primary-soft p-4 tablet:p-6">
            <Input
              label="Efectivo físico contado en cajón"
              required
              size="lg"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="$ 0.00"
              helperText="Ingresa la suma total de billetes y monedas presentes en la caja."
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
            physicalLabel="Monto físico declarado"
          />

          <div className="flex justify-end">
            <Button type="submit" size="lg" isLoading={close.isPending && pendingDeclared === null} disabled={!form.formState.isValid}>
              Confirmar y cerrar turno
            </Button>
          </div>
        </form>
      </Card>

      {pendingDeclared !== null && difference !== null && (
        <DifferenceModal
          difference={cashDifference(pendingDeclared, summary.expected_cash)}
          expectedCash={summary.expected_cash}
          declaredCash={pendingDeclared}
          isSubmitting={close.isPending}
          onConfirm={confirmWithDifference}
          onReview={() => setPendingDeclared(null)}
        />
      )}
    </>
  )
}

/** PMC-23 · Arqueo en tiempo real y cierre de turno de caja. */
export function CashShiftClosePage() {
  const { user } = useAuth()
  // Every visit starts from the current numbers: the summary changes with each charge.
  const summary = useQuery({ queryKey: queryKeys.cashShiftSummary, queryFn: getCashShiftSummary, gcTime: 0 })
  const noOpenShift = isApiError(summary.error) && summary.error.status === 404
  const data = summary.data

  return (
    <section className="flex flex-col gap-6" aria-labelledby="cash-close-title">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="cash-close-title" className="text-h1 text-ink">
            Arqueo y Cierre de Turno
          </h1>
          <p className="mt-1 text-small text-muted">Consolidación en tiempo real del turno activo para cuadre de valores</p>
        </div>
        {data && (
          <div className="flex items-center gap-3">
            <Badge variant="success" withDot>
              Turno Abierto: {formatTime(data.opened_at)} hrs
            </Badge>
            <span className="text-small font-semibold text-text">{data.cashier_name || user?.name}</span>
          </div>
        )}
      </header>

      {summary.isPending && (
        <Card>
          <div className="flex justify-center py-12">
            <Spinner label="Cargando arqueo..." />
          </div>
        </Card>
      )}

      {noOpenShift && (
        <Card>
          <EmptyState
            title="No tienes un turno de caja abierto"
            description="Abre tu turno desde la Bandeja de Caja para ver el arqueo y poder cerrarlo."
            action={
              <Link to={ROUTES.cashTray} className={cn(cardClassName('md', true), 'inline-flex px-4 py-2 text-small font-semibold text-primary')}>
                Ir a la Bandeja de Caja
              </Link>
            }
          />
        </Card>
      )}

      {summary.isError && !noOpenShift && (
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
          <ReconciliationForm summary={data} />
        </>
      )}
    </section>
  )
}
