import { Link } from 'react-router'
import { ROUTES } from '../app/routes'
import { useAuth } from '../auth/AuthContext'
import { PageGrid } from '../components/layout/ModuleLayout'
import { cardClassName } from '../components/ui'
import { cn } from '../lib/cn'

const MODULES = [
  { to: ROUTES.cashTray, title: 'Bandeja de Caja', icon: '💳' },
  { to: ROUTES.cashShiftClose, title: 'Arqueo y Turno', icon: '🔒' },
  { to: ROUTES.salesHistory, title: 'Historial de Ventas', icon: '🧾' },
] as const

/** PMC-31 AC1: only rendered for users with the `forceCloseCashShift` permission. */
const SUPERVISION_MODULE = { to: ROUTES.supervision, title: 'Supervisión de Cajas', icon: '🛡️' } as const

/** Home of the "Cuenta y Pagos" module (mock: docs/Menu.png). */
export function MenuPage() {
  const { user, can } = useAuth()
  const modules = can('forceCloseCashShift') ? [...MODULES, SUPERVISION_MODULE] : MODULES
  const roleLabel = user?.roles[0] ?? 'Usuario'

  return (
    <section className="flex flex-col gap-8 tablet:gap-12 tablet:pt-12">
      <header className="text-center">
        <h1 className="text-h1 text-ink tablet:text-[40px] tablet:leading-[48px]">FMAT-RESTAURANT</h1>
        <p className="mt-2 text-body text-muted">
          Módulo de Cuenta y Pagos
          {user && (
            <>
              <span aria-hidden="true"> • </span>
              {roleLabel}: {user.name}
            </>
          )}
        </p>
      </header>

      <nav aria-label="Secciones de Cuenta y Pagos">
        <PageGrid className="desktop:px-8">
          {modules.map((module) => (
            <Link
              key={module.to}
              to={module.to}
              className={cn(
                cardClassName('lg', true),
                'col-span-4 flex flex-col items-center gap-6 text-center',
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-24 items-center justify-center rounded-full bg-primary-soft text-[44px]"
              >
                {module.icon}
              </span>
              <span className="text-h3 font-bold text-ink">{module.title}</span>
            </Link>
          ))}
        </PageGrid>
      </nav>
    </section>
  )
}
