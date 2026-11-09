import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router'
import { getTransactionDetail } from '../api/transactions'
import { queryKeys } from '../api/queryKeys'
import { ROUTES } from '../app/routes'
import { Badge, Button, EmptyState, Modal, Spinner } from '../components/ui'
import { folioLabel } from '../features/sales-history/paymentLabel'
import { SaleSnapshot } from '../features/sales-history/SaleSnapshot'
import { useReprintTicket } from '../features/sales-history/useReprintTicket'
import { ThermalTicketPreview } from '../features/ticket/ThermalTicketPreview'
import { formatLongDateTime } from '../lib/dates'

/**
 * PMC-25 · Immutable sale detail over the history. Read only: cancelling a sale is out of scope.
 * Closing returns to the history with the same filters and page (they live in the URL).
 */
export function SalesDetailPage() {
  const { folio = '' } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const close = () => navigate({ pathname: ROUTES.salesHistory, search })

  const detail = useQuery({
    queryKey: queryKeys.transactionDetail(folio),
    queryFn: ({ signal }) => getTransactionDetail(folio, signal),
    retry: false,
  })
  const reprint = useReprintTicket(folio)
  const data = detail.data
  const title = `Detalle de Venta ${folioLabel(folio)}`

  const { contentRef, ticket: receipt } = reprint

  return (
    <Modal
      open
      title={title}
      hideTitle
      onClose={close}
      size="lg"
      footer={
        <Button variant="neutral" onClick={close}>
          Cerrar ventana
        </Button>
      }
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2">
          <h2 aria-hidden="true" className="text-h2 text-ink">
            {title}
          </h2>
          <Badge variant="success" withDot>
            Completado
          </Badge>
          {data?.paid_at && <p className="text-small text-muted">Cobrado el {formatLongDateTime(data.paid_at)}</p>}
        </div>
        <Button variant="secondary" isLoading={reprint.isLoading} disabled={!data} onClick={() => void reprint.reprint()}>
          🖨️ Reimprimir ticket
        </Button>
      </header>

      <div className="mt-6">
        {detail.isPending && (
          <div className="flex justify-center py-12">
            <Spinner label="Cargando detalle de la venta..." />
          </div>
        )}
        {detail.isError && (
          <EmptyState
            title="No se pudo cargar el detalle"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" isLoading={detail.isFetching} onClick={() => void detail.refetch()}>
                Reintentar
              </Button>
            }
          />
        )}
        {data && <SaleSnapshot detail={data} />}
      </div>

      {/* Printed node: off screen (not display:none) so its height can be measured for the 80 mm page. */}
      {receipt && (
        <div aria-hidden="true" className="pointer-events-none fixed top-0 -left-[9999px]">
          <ThermalTicketPreview ref={contentRef} ticket={receipt} />
        </div>
      )}
    </Modal>
  )
}
