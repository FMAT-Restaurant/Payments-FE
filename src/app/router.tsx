import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from '../auth/guards'
import { ModuleLayout } from '../components/layout/ModuleLayout'
import { MenuPage } from '../pages/MenuPage'
import { NotFoundPage } from '../pages/PendingPage'
import { ROUTES, type RouteHandle } from './routes'

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
      {
        path: ROUTES.cashTray,
        handle: { requiresCashShift: true } satisfies RouteHandle,
        lazy: async () => ({ Component: (await import('../pages/CashTrayPage')).CashTrayPage }),
      },
      // Form screens load on demand so the menu does not download zod and react-hook-form.
      { path: ROUTES.charge, lazy: async () => ({ Component: (await import('../pages/ChargePage')).ChargePage }) },
      {
        path: ROUTES.cashShiftClose,
        lazy: async () => ({ Component: (await import('../pages/CashShiftClosePage')).CashShiftClosePage }),
      },
      {
        path: ROUTES.salesHistory,
        lazy: async () => ({ Component: (await import('../pages/SalesHistoryPage')).SalesHistoryPage }),
        // The detail opens as a modal over the history, so both stay mounted (PMC-25).
        children: [
          {
            path: ':folio',
            lazy: async () => ({ Component: (await import('../pages/SalesDetailPage')).SalesDetailPage }),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)
