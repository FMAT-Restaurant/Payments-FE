import { ROUTES } from '../app/routes'
import { BackLink } from '../components/layout/ModuleLayout'
import { Card, EmptyState } from '../components/ui'

/** Placeholder for the screens of the next stories, so navigation works end to end. */
export function PendingPage({ title, story }: Readonly<{ title: string; story: string }>) {
  return (
    <section className="flex flex-col gap-6">
      <BackLink to={ROUTES.menu}>Regresar al Menú</BackLink>
      <h1 className="text-h1 text-ink">{title}</h1>
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
