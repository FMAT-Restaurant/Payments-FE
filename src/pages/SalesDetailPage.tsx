import { useLocation, useNavigate, useParams } from 'react-router'
import { ROUTES } from '../app/routes'
import { Button, Modal } from '../components/ui'
import { folioLabel } from '../features/sales-history/paymentLabel'

/**
 * Placeholder of the sale detail (PMC-25 fills it in). It already lives over the history and returns to it
 * with the same filters and page, which PMC-24 AC3 needs for "Ver detalle".
 */
export function SalesDetailPage() {
  const { folio = '' } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
  const close = () => navigate({ pathname: ROUTES.salesHistory, search })

  return (
    <Modal
      open
      title={`Detalle de Venta ${folioLabel(folio)}`}
      onClose={close}
      size="lg"
      footer={
        <Button variant="neutral" onClick={close}>
          Cerrar ventana
        </Button>
      }
    >
      <p className="text-body text-muted">El detalle de esta venta se implementa en la historia PMC-25.</p>
    </Modal>
  )
}
