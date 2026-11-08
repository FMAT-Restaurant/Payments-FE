import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { AuthProvider } from '../auth/AuthProvider'
import { ToastViewport } from '../features/notifications/ToastViewport'
import { createQueryClient } from './queryClient'

interface AppProvidersProps {
  children: ReactNode
  queryClient?: QueryClient
  getToken?: () => string | null
}

export function AppProviders({ children, queryClient, getToken }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())

  return (
    <QueryClientProvider client={client}>
      <AuthProvider getToken={getToken}>
        {children}
        <ToastViewport />
      </AuthProvider>
    </QueryClientProvider>
  )
}
