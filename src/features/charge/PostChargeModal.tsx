import type { UseQueryResult } from '@tanstack/react-query'
import type { ChargeResponseDTO } from '../../api/contracts/charge'
import type { TicketReceiptDTO } from '../../api/contracts/ticket'
import { Badge, Button, EmptyState, Modal } from '../../components/ui'
import { formatCurrency } from '../../lib/money'
import { describePaidAmounts } from '../ticket/ticketSummary'
import { ThermalTicketPreview } from '../ticket/ThermalTicketPreview'
import { useThermalPrint } from '../ticket/useThermalPrint'

interface PostChargeModalProps {
  charge: ChargeResponseDTO
  ticket: UseQueryResult<TicketReceiptDTO>
  onBackToTray: () => void
}

/**
 * Post-charge confirmation (PMC-21, mock docs/Post-cobro.png): change to hand over,
 * 80 mm receipt preview and printing. The charge is already registered, so if the receipt
 * cannot be loaded the change is still shown (from the charge response) and the receipt can be retried.
 */
export function PostChargeModal({ charge, ticket, onBackToTray }: Readonly<PostChargeModalProps>) {
  const receipt = ticket.data
  const { contentRef, print } = useThermalPrint(charge.folio, receipt)
  const change = receipt?.totals.change_given ?? charge.change_delivered
  const title = `Transacción #${charge.folio}`

  return (
    <Modal open title={title} hideTitle size="lg">
      <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-start gap-3">
            <Badge variant="success" withDot>
              Cobro completado
            </Badge>
            <p aria-hidden="true" className="text-h2 text-ink">
              {title}
            </p>
            {receipt && (
              <p className="text-small text-muted">
                La {receipt.header.table_name} ha sido liberada y notificada al comedor.
              </p>
            )}
          </div>

          <section
            aria-label="Cambio a entregar"
            className="rounded-card border border-accent/40 bg-primary-soft p-5"
          >
            <p className="text-small font-semibold text-primary">Cambio a entregar al cliente</p>
            <p className="mt-1 text-[40px] leading-[48px] font-bold text-ink tabular-nums">
              {formatCurrency(change)}
            </p>
            {receipt && <p className="mt-2 text-caption text-muted">{describePaidAmounts(receipt)}</p>}
          </section>

          <div className="mt-auto flex flex-col-reverse gap-3 tablet:flex-row">
            <Button variant="neutral" size="lg" onClick={onBackToTray}>
              Volver a bandeja
            </Button>
            <Button size="lg" onClick={print} disabled={!receipt}>
              Imprimir ticket
            </Button>
          </div>
        </div>

        <div className="flex items-start justify-center">
          {receipt ? (
            <ThermalTicketPreview ref={contentRef} ticket={receipt} />
          ) : (
            <EmptyState
              className="rounded-card border border-dashed border-border"
              title="No se pudo cargar el ticket"
              description="El cobro ya quedó registrado. Reintenta para imprimir el comprobante."
              action={
                <Button variant="secondary" isLoading={ticket.isFetching} onClick={() => void ticket.refetch()}>
                  Reintentar
                </Button>
              }
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
