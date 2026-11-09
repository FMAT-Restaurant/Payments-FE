import { Button } from '../../components/ui'
import { pageWindow } from './historyFilters'

interface PaginationProps {
  /** 1-based page shown. */
  page: number
  totalPages: number
  onChange: (page: number) => void
}

/** PMC-24 AC4: "Anterior", page numbers and "Siguiente". */
export function Pagination({ page, totalPages, onChange }: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center gap-2">
      <Button variant="neutral" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </Button>
      {pageWindow(page, totalPages).map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted">
            …
          </span>
        ) : (
          <Button
            key={item}
            size="sm"
            variant={item === page ? 'primary' : 'neutral'}
            aria-label={`Página ${item}`}
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button variant="neutral" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente
      </Button>
    </nav>
  )
}
