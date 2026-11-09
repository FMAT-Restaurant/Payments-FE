import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { msw } from 'msw/vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_DEV_API_PROXY_TARGET

  return {
    // MSW only serves its worker script in `pnpm dev`; handlers are wired in src/mocks/browser.ts.
    plugins: [react(), tailwindcss(), command === 'serve' && msw({ mode: 'worker-only' })],
    server: proxyTarget
      ? { proxy: { '/api': { target: proxyTarget, changeOrigin: true } } }
      : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      // PMC-19: a short interval lets the tests observe several polling cycles.
      env: { VITE_PENDINGS_POLL_MS: '60' },
      restoreMocks: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
        reportsDirectory: 'coverage',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      },
    },
  }
})
