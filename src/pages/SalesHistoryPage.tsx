import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Outlet, useSearchParams } from 'react-router'
import { getSalesHistory } from '../api/sales'
import { queryKeys } from '../api/queryKeys'
import { ROUTES } from '../app/routes'
import { Can } from '../auth/guards'
import { BackLink } from '../components/layout/ModuleLayout'
import { Button, Card, EmptyState } from '../components/ui'
import { PAGE_SIZE, readFilters, rangeSummary, toSearchParams } from '../features/sales-history/historyFilters'
import { Pagination } from '../features/sales-history/Pagination'
import { SalesFilters } from '../features/sales-history/SalesFilters'
import { SalesTable } from '../features/sales-history/SalesTable'
import { useSalesExport } from '../features/sales-history/useSalesExport'
import { rangeEndExclusiveIso, rangeStartIso } from '../lib/dates'

/** PMC-24 · Historial de ventas con filtros por fecha, paginación y exportación CSV (Administrador). */
export function SalesHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = readFilters(searchParams)
  const pageIndex = filters.page - 1

  // PMC-24 AC2: the end of the range is sent as the day after, so the whole last day is covered.
  const query = {
    start_date: filters.start ? rangeStartIso(filters.start) : undefined,
    end_date: filters.end ? rangeEndExclusiveIso(filters.end) : undefined,
    page_index: pageIndex,
    page_size: PAGE_SIZE,
  }
  const history = useQuery({
    queryKey: queryKeys.salesHistory(query),
    queryFn: ({ signal }) => getSalesHistory(query, signal),
    placeholderData: keepPreviousData,
  })
  const { run: exportCsv, isExporting } = useSalesExport(filters.start, filters.end)

  const goTo = (next: Partial<typeof filters>) => setSearchParams(toSearchParams({ ...filters, ...next }))
  const data = history.data
  const rows = data?.data ?? []

  return (
    <section className="flex flex-col gap-6" aria-labelledby="sales-history-title">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="sales-history-title" className="text-h1 text-ink">
            Historial de Ventas
          </h1>
          <p className="mt-1 text-small text-muted">Consulta de tickets inmutables y exportación contable</p>
        </div>
        <Can permission="exportSales">
          <Button variant="secondary" size="lg" isLoading={isExporting} onClick={exportCsv}>
            ↓ Exportar CSV
          </Button>
        </Can>
      </header>

      <SalesFilters
        key={`${filters.start}|${filters.end}`}
        start={filters.start}
        end={filters.end}
        onApply={({ start, end }) => goTo({ start, end, page: 1 })}
      />

      {history.isPending && (
        <Card aria-busy="true">
          <output className="sr-only">Cargando historial de ventas...</output>
          <div aria-hidden="true" className="flex flex-col gap-4 p-2">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="h-10 animate-pulse rounded-control bg-border" />
            ))}
          </div>
        </Card>
      )}

      {history.isError && !data && (
        <Card>
          <EmptyState
            title="No se pudo cargar el historial"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" isLoading={history.isFetching} onClick={() => void history.refetch()}>
                Reintentar
              </Button>
            }
          />
        </Card>
      )}

      {data && rows.length === 0 && (
        <Card>
          <EmptyState
            title="No hay transacciones en el rango seleccionado"
            description="Ajusta las fechas y vuelve a aplicar los filtros."
            action={
              filters.page > 1 ? (
                <Button variant="secondary" onClick={() => goTo({ page: 1 })}>
                  Ir a la primera página
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {data && rows.length > 0 && (
        <Card padding="none" className={history.isPlaceholderData ? 'opacity-60' : undefined} aria-busy={history.isFetching}>
          <SalesTable rows={rows} />
          <div className="flex flex-col gap-3 border-t border-border px-4 py-4 tablet:flex-row tablet:items-center tablet:justify-between tablet:px-6">
            <p className="text-small text-muted">{rangeSummary(pageIndex, PAGE_SIZE, rows.length, data.total_count)}</p>
            <Pagination page={filters.page} totalPages={data.total_pages} onChange={(page) => goTo({ page })} />
          </div>
        </Card>
      )}

      <Outlet />
    </section>
  )
}
