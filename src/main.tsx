import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
async function enableApiMocks() {
  // Inline check (not env.apiMocksEnabled) so production builds drop the mock chunk entirely.
  if (!import.meta.env.DEV || import.meta.env.VITE_API_MOCKS !== 'true') return
  const { startMockWorker } = await import('./mocks/browser')
  await startMockWorker()
}

await enableApiMocks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
