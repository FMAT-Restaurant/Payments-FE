import { useQuery } from '@tanstack/react-query'
import { getOpenCashShifts } from '../api/cashShifts'
import { isApiError } from '../api/errors'
import { queryKeys } from '../api/queryKeys'
import { ROUTES } from '../app/routes'
import { BackLink, PageGridList } from '../components/layout/ModuleLayout'
import { Button, Card, EmptyState, Spinner } from '../components/ui'
import { OpenShiftCard } from '../features/supervision/OpenShiftCard'
import { SupervisionBadge } from '../features/supervision/SupervisionBadge'

/** PMC-31 · Panel de supervisión: turnos de caja abiertos (Administrador / Gerente). */
export function SupervisionPage() {
  // Every visit shows the current list: shifts are closed by their cashiers and by other supervisors.
  const shifts = useQuery({ queryKey: queryKeys.openCashShifts, queryFn: getOpenCashShifts, gcTime: 0 })
  const forbidden = isApiError(shifts.error) && shifts.error.status === 403

  return (
    <section className="flex flex-col gap-6" aria-labelledby="supervision-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>
        <SupervisionBadge />
      </div>

      <header>
        <h1 id="supervision-title" className="text-h1 text-ink">
          Supervisión de Cajas
        </h1>
        <p className="mt-1 text-small text-muted">
          Listado de todos los turnos operativos que se encuentran actualmente abiertos en el restaurante.
        </p>
      </header>

      {shifts.isPending && (
        <Card>
          <div className="flex justify-center py-12">
            <Spinner label="Cargando turnos abiertos..." />
          </div>
        </Card>
      )}

      {forbidden && (
        <Card>
          <EmptyState
            title="No tienes permisos para supervisar cajas"
            description="Tu rol ya no tiene acceso a esta pantalla. Regresa al menú o inicia sesión de nuevo."
          />
        </Card>
      )}

      {shifts.isError && !forbidden && (
        <Card>
          <EmptyState
            title="No se pudieron cargar los turnos abiertos"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" isLoading={shifts.isFetching} onClick={() => void shifts.refetch()}>
                Reintentar
              </Button>
            }
          />
        </Card>
      )}

      {shifts.isSuccess && shifts.data.length === 0 && (
        <Card>
          <EmptyState
            title="No hay turnos de caja abiertos"
            description="Cuando un cajero abra su turno aparecerá aquí."
          />
        </Card>
      )}

      {shifts.isSuccess && shifts.data.length > 0 && (
        <PageGridList aria-label="Turnos de caja abiertos">
          {shifts.data.map((shift) => (
            <li key={shift.cash_shift_id} className="col-span-4 desktop:col-span-4">
              <OpenShiftCard shift={shift} />
            </li>
          ))}
        </PageGridList>
      )}
    </section>
  )
}
