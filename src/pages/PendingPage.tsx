import type { ReactNode } from 'react'
import { ROUTES } from '../app/routes'
import { BackLink } from '../components/layout/ModuleLayout'
import { Card, EmptyState } from '../components/ui'

/** Placeholder for the screens of the next stories, so navigation works end to end. */
export function PendingPage({ title, story, aside }: Readonly<{ title: string; story: string; aside?: ReactNode }>) {
  return (
    <section className="flex flex-col gap-6">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h1 text-ink">{title}</h1>
        {aside}
      </header>
      <Card>
        <EmptyState title="Pantalla en construcción" description={`Se implementa en la historia ${story}.`} />
      </Card>
    </section>
  )
}

export function NotFoundPage() {
  return (
    <section className="flex flex-col gap-6">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>
      <Card>
        <EmptyState title="Página no encontrada" description="La ruta solicitada no existe en Cuenta y Pagos." />
      </Card>
    </section>
  )
}
