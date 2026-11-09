import { useState } from 'react'
import { ROUTES } from '../app/routes'
import { BackLink, PageGridList } from '../components/layout/ModuleLayout'
import { Button, Card, EmptyState, Input, Select } from '../components/ui'
import { AccountCard, AccountCardSkeleton } from '../features/cash-tray/AccountCard'
import { filterAccounts, waiterOptions } from '../features/cash-tray/accountsView'
import { SearchIcon } from '../features/cash-tray/SearchIcon'
import { usePendingAccounts, useRemovedAccountsNotice } from '../features/cash-tray/usePendingAccounts'
import { CashShiftStatusBadge } from '../features/cash-shift/CashShiftStatusBadge'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { useNow } from '../lib/useNow'

const SEARCH_DEBOUNCE_MS = 300
const ALL_WAITERS = ''
const CARD_SPAN = 'col-span-4'
const SKELETON_COUNT = 3

/** PMC-19 · Bandeja de Caja: accounts ready to be charged, synchronized by polling. */
export function CashTrayPage() {
  const { data, isPending, isError, isFetching, refetch } = usePendingAccounts()
  useRemovedAccountsNotice(data)
  const now = useNow()

  const [search, setSearch] = useState('')
  const [selectedWaiter, setSelectedWaiter] = useState(ALL_WAITERS)
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS)

  const accounts = data ?? []
  const waiters = waiterOptions(accounts)
  // If the selected waiter has no accounts left after a poll, the filter falls back to "all".
  const waiter = waiters.includes(selectedWaiter) ? selectedWaiter : ALL_WAITERS
  const visible = filterAccounts(accounts, debouncedSearch, waiter)
  const hasFilters = debouncedSearch.trim() !== '' || waiter !== ALL_WAITERS

  const clearFilters = () => {
    setSearch('')
    setSelectedWaiter(ALL_WAITERS)
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="cash-tray-title">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 id="cash-tray-title" className="text-h1 text-ink">
            Bandeja de Caja
          </h1>
          <p className="mt-1 text-small text-muted">Cuentas sincronizadas listas para cobro en tiempo real</p>
        </div>
        <CashShiftStatusBadge />
      </header>

      <Card className="grid grid-cols-1 gap-4 tablet:grid-cols-[1fr_16rem]">
        <Input
          type="search"
          label="Buscar cuenta"
          placeholder="Buscar por Folio o Número de Mesa..."
          leadingIcon={<SearchIcon />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
        />
        <Select
          label="Por Mesero"
          value={waiter}
          onChange={(event) => setSelectedWaiter(event.target.value)}
          options={[{ value: ALL_WAITERS, label: 'Todos los meseros' }, ...waiters.map((name) => ({ value: name, label: name }))]}
        />
      </Card>

      {isPending && (
        <>
          <output className="sr-only">Cargando cuentas pendientes...</output>
          <PageGridList aria-busy="true">
            {Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <li key={index} className={`${CARD_SPAN} desktop:col-span-4`}>
                <AccountCardSkeleton />
              </li>
            ))}
          </PageGridList>
        </>
      )}

      {isError && !data && (
        <Card>
          <EmptyState
            title="No se pudo cargar la bandeja"
            description="Revisa tu conexión e inténtalo de nuevo."
            action={
              <Button variant="secondary" isLoading={isFetching} onClick={() => void refetch()}>
                Reintentar
              </Button>
            }
          />
        </Card>
      )}

      {isError && data && (
        <p className="text-small text-muted">No se pudo actualizar la bandeja; se mostrará la última información disponible.</p>
      )}

      {data && accounts.length === 0 && (
        <Card>
          <EmptyState title="Aún no hay cuentas pendientes por cobrar" description="Las nuevas cuentas aparecerán aquí automáticamente." />
        </Card>
      )}

      {accounts.length > 0 && visible.length === 0 && (
        <Card>
          <EmptyState
            title="Ninguna cuenta coincide con tu búsqueda"
            description="Prueba con otro folio, mesa o mesero."
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        </Card>
      )}

      {visible.length > 0 && (
        <PageGridList>
          {visible.map((account) => (
            <li key={account.dinning_session_id} className={`${CARD_SPAN} tablet:col-span-4 desktop:col-span-4`}>
              <AccountCard account={account} now={now} />
            </li>
          ))}
        </PageGridList>
      )}
    </section>
  )
}
