import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { FormProvider, useForm, useWatch, type Resolver } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { postCharge } from '../api/charge'
import type { ChargeResponseDTO } from '../api/contracts/charge'
import type { PendingAccountCardDTO } from '../api/contracts/pendingAccounts'
import { isApiError } from '../api/errors'
import { getPendingAccount } from '../api/pendingAccounts'
import { queryKeys } from '../api/queryKeys'
import { getTicket } from '../api/tickets'
import { ROUTES } from '../app/routes'
import { BackLink, PageGrid } from '../components/layout/ModuleLayout'
import { Button, Card, EmptyState } from '../components/ui'
import {
  createChargeFormSchema,
  defaultChargeFormValues,
  toChargeRequest,
  type ChargeFormValues,
} from '../features/charge/chargeForm'
import { blockingReason, evaluateCharge, resolveTip } from '../features/charge/chargeRules'
import { ChargeTotals } from '../features/charge/ChargeTotals'
import { OrderSummaryPanel } from '../features/charge/OrderSummaryPanel'
import { PostChargeModal } from '../features/charge/PostChargeModal'
import { PaymentLinesField } from '../features/charge/PaymentLinesField'
import { TipSelector } from '../features/charge/TipSelector'

function ChargeSkeleton() {
  return (
    <PageGrid aria-busy="true" aria-label="Cargando la cuenta">
      <div className="col-span-4 h-96 animate-pulse rounded-card bg-border tablet:col-span-8 desktop:col-span-4" />
      <div className="col-span-4 flex flex-col gap-6 tablet:col-span-8">
        <div className="h-32 animate-pulse rounded-card bg-border" />
        <div className="h-64 animate-pulse rounded-card bg-border" />
      </div>
    </PageGrid>
  )
}

function ChargeForm({ account }: Readonly<{ account: PendingAccountCardDTO }>) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const consumptionTotal = account.totals.expected_total
  const schema = useMemo(() => createChargeFormSchema(consumptionTotal), [consumptionTotal])

  const form = useForm<ChargeFormValues>({
    // The schema output is the same shape with every amount already validated as required.
    resolver: zodResolver(schema) as unknown as Resolver<ChargeFormValues>,
    mode: 'onChange',
    defaultValues: defaultChargeFormValues(),
  })
  const [tipOption, customTip, payments] = useWatch({
    control: form.control,
    name: ['tip_option', 'custom_tip', 'payments'],
  })

  const tip = resolveTip(consumptionTotal, tipOption, customTip)
  const evaluation = evaluateCharge(consumptionTotal + tip, payments ?? [])
  const reason = blockingReason(evaluation)
  const tipLabel = tipOption !== 'NONE' && tipOption !== 'CUSTOM' ? `Propina (${tipOption}%)` : 'Propina'

  const [completedCharge, setCompletedCharge] = useState<ChargeResponseDTO | null>(null)
  const charge = useMutation({
    mutationFn: postCharge,
    onSuccess: (response: ChargeResponseDTO) => {
      // Only the tray list: this account no longer exists and refetching it would replace the screen with a 404.
      void queryClient.invalidateQueries({ queryKey: queryKeys.pendingAccounts, exact: true })
      setCompletedCharge(response)
    },
  })

  // PMC-21 AC1: right after the charge, the receipt is requested; the modal opens with its answer.
  const folio = completedCharge?.folio ?? ''
  const ticket = useQuery({
    queryKey: queryKeys.ticket(folio),
    queryFn: () => getTicket(folio),
    enabled: completedCharge !== null,
    retry: false,
  })
  const awaitingTicket = completedCharge !== null && ticket.isPending

  const backToTray = () => {
    setCompletedCharge(null)
    void navigate(ROUTES.cashTray)
  }

  const onSubmit = form.handleSubmit((values) =>
    charge.mutate(toChargeRequest(account.dinning_session_id, values, consumptionTotal)),
  )
  const canConfirm = form.formState.isValid && evaluation.canConfirm && !charge.isSuccess

  return (
    <PageGrid>
      <div className="col-span-4 tablet:col-span-8 desktop:sticky desktop:top-6 desktop:col-span-4 desktop:self-start">
        <OrderSummaryPanel account={account} tip={tip} tipLabel={tipLabel} amountDue={evaluation.amountDue} />
      </div>

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={onSubmit}
          aria-labelledby="charge-title"
          className="col-span-4 flex flex-col gap-6 tablet:col-span-8"
        >
          <header>
            <h1 id="charge-title" className="text-h1 text-ink">
              Procesar Pago
            </h1>
            <p className="mt-1 text-small text-muted">Selecciona la propina y registra uno o varios métodos de pago</p>
          </header>

          <TipSelector consumptionTotal={consumptionTotal} />

          <PaymentLinesField evaluation={evaluation} />

          <Card className="flex flex-col gap-6">
            <ChargeTotals evaluation={evaluation} />
            {reason && (
              <p role="status" className="text-small font-semibold text-error">
                {reason}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 tablet:flex-row tablet:justify-end">
              <Button variant="neutral" size="lg" onClick={() => navigate(ROUTES.cashTray)}>
                Cancelar
              </Button>
              <Button type="submit" size="lg" isLoading={charge.isPending || awaitingTicket} disabled={!canConfirm}>
                Confirmar cobro
              </Button>
            </div>
          </Card>
        </form>
      </FormProvider>

      {completedCharge && !awaitingTicket && (
        <PostChargeModal charge={completedCharge} ticket={ticket} onBackToTray={backToTray} />
      )}
    </PageGrid>
  )
}

/** "Procesar Pago" (PMC-20, mock docs/Procesar pago.png). Route: /payments/charge/:dinningSessionId */
export function ChargePage() {
  const { dinningSessionId = '' } = useParams()
  const account = useQuery({
    queryKey: queryKeys.pendingAccount(dinningSessionId),
    queryFn: () => getPendingAccount(dinningSessionId),
    enabled: dinningSessionId !== '',
  })

  let content
  if (account.isPending) {
    content = <ChargeSkeleton />
  } else if (account.isError) {
    const gone = isApiError(account.error) && account.error.status === 404
    content = (
      <Card>
        <EmptyState
          title={gone ? 'Esta cuenta ya no está pendiente de cobro' : 'No se pudo cargar la cuenta'}
          description={gone ? 'Pudo haberse cobrado o anulado desde otra caja.' : account.error.message}
          action={
            gone ? undefined : (
              <Button variant="secondary" onClick={() => void account.refetch()}>
                Reintentar
              </Button>
            )
          }
        />
      </Card>
    )
  } else {
    content = <ChargeForm account={account.data} />
  }

  return (
    <section className="flex flex-col gap-4">
      <BackLink to={ROUTES.cashTray}>Regresar a Bandeja</BackLink>
      {content}
    </section>
  )
}
