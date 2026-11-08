import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from '../auth/guards'
import { ModuleLayout } from '../components/layout/ModuleLayout'
import { MenuPage } from '../pages/MenuPage'
import { NotFoundPage, PendingPage } from '../pages/PendingPage'
import { ROUTES } from './routes'

export const routes: RouteObject[] = [
  {
    element: (
      <RequireAuth>
        <ModuleLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to={ROUTES.menu} replace /> },
      { path: ROUTES.menu, element: <MenuPage /> },
      { path: ROUTES.cashTray, element: <PendingPage title="Bandeja de Caja" story="PMC-19" /> },
      // Form screens load on demand so the menu does not download zod and react-hook-form.
      { path: ROUTES.charge, lazy: async () => ({ Component: (await import('../pages/ChargePage')).ChargePage }) },
      { path: ROUTES.cashShiftClose, element: <PendingPage title="Arqueo y Cierre de Turno" story="PMC-23" /> },
      { path: ROUTES.salesHistory, element: <PendingPage title="Historial de Ventas" story="PMC-24" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
