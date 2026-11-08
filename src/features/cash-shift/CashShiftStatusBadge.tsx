import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../../components/ui'
import { useMyCashShift } from './useMyCashShift'

/** Top-right indicator of the cash tray (PMC-19 AC1 / PMC-22 AC4): "Cajero Activo" or "Caja Cerrada". */
export function CashShiftStatusBadge() {
  const { user } = useAuth()
  const { state, data } = useMyCashShift()

  if (state === 'open') {
    const name = data?.cashier_name || user?.name
    return (
      <Badge variant="success" withDot>
        Cajero Activo{name ? `: ${name}` : ''}
      </Badge>
    )
  }
  if (state === 'closed') {
    return (
      <Badge variant="warning" withDot>
        Caja Cerrada
      </Badge>
    )
  }
  if (state === 'unknown') {
    return <Badge variant="neutral">Estado de caja no disponible</Badge>
  }
  return <Badge variant="neutral">Verificando caja...</Badge>
}
