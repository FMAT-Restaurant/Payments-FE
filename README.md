# Payments-FE

Front-End del módulo **Cuenta y Pagos** de FMAT-RESTAURANT (React 19 + TypeScript + Vite).
Consume el microservicio Payments-BE a través del API Gateway en `/api/v1/payments`.

## Arranque rápido

```bash
corepack enable          # usa la versión de pnpm fijada en package.json
pnpm install
pnpm dev                 # http://localhost:5173 con mocks (MSW) y una sesión demo
```

| Script | Uso |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm test` | Pruebas (Vitest) con cobertura en `coverage/lcov.info` para SonarQube |
| `pnpm test:watch` | Pruebas en modo observación |
| `pnpm lint` | oxlint |
| `pnpm build` | Verificación de tipos y build de producción |

## Variables de entorno

Ver `.env.example`. `pnpm dev` lee `.env.development` (mocks activos); los ajustes personales van en
`.env.development.local`, que no se versiona.

- `VITE_API_MOCKS=true`: responde la API con Mock Service Worker y guarda un JWT demo sin firma con el rol `VITE_MOCK_ROLE` (`Administrador`, `Gerente` o `Cajero`).
- `VITE_DEV_API_PROXY_TARGET`: en lugar de mocks, redirige `/api` a un API Gateway o Payments-BE real.
- `VITE_AUTH_LOGIN_URL` / `VITE_AUTH_CHANGE_PASSWORD_URL`: pantallas del microservicio de Auth.
- `VITE_AUTH_TOKEN_STORAGE_KEY`: llave de `localStorage` donde el App Shell deja el JWT.

## Estructura

```
src/
  api/            Cliente HTTP (axios), contrato de errores { code, message } y mapa de endpoints
  app/            Router, rutas, React Query y providers
  auth/           Claims del JWT, roles/permisos (RBAC), AuthProvider, useAuth, <RequireAuth>, <Can>
  components/
    ui/           Átomos tipados: Button, Input, Card, Badge, Modal, EmptyState, Spinner
    layout/       ModuleLayout (sin sidebar/topbar del Shell), PageGrid 4/8/12 columnas, BackLink
  features/       Lógica compartida por pantalla (notificaciones, gate de apertura de caja, ...)
  lib/            Utilidades (redondeo financiero, formato de moneda, store externo)
  mocks/          Handlers de MSW para los endpoints que el Backend aún no publica
  pages/          Pantallas
  styles/         Tokens de la Guía Visual v2.0 (Tailwind v4 `@theme`)
```

## Convenciones

- **Tokens de diseño**: usa las utilidades generadas por `src/styles/index.css` (`bg-primary`, `text-ink`, `border-border`, `rounded-card`, `text-h1`, ...). La paleta por defecto de Tailwind está desactivada para no inventar colores. Breakpoints: `tablet:` (≥ 768 px) y `desktop:` (≥ 1200 px).
- **HTTP**: importa `httpClient` de `src/api/client.ts` y las rutas de `src/api/endpoints.ts`; nunca axios directo. El interceptor agrega `Authorization: Bearer <jwt>`, elimina `X-User-Id`/`X-Staff-Id` e identificadores de usuario del body y convierte toda falla en `ApiError` (`status`, `code`, `message`).
- **Errores**: el flujo se decide por `code` y en pantalla se muestra `message`. 401 → aviso de sesión expirada y login; 403 `PASSWORD_CHANGE_REQUIRED` → cambio de contraseña; 403 `CASH_SHIFT_NOT_OPEN` → `useCashShiftGate()` pide el modal de apertura (PMC-22); el resto se muestra como toast. Usa `{ skipErrorToast: true }` cuando la pantalla muestra su propio mensaje.
- **Roles**: `Administrador`, `Gerente`, `Cajero`. Pregunta por permisos, no por nombres de rol: `<Can permission="exportSales">` o `useAuth().can('exportSales')`.
- **Modelos**: interfaces en inglés y payloads en `snake_case`, como en las HU. Si el Backend expone otros nombres, la traducción va en un mapper de `src/api/`, no en los componentes.
- **Dinero**: `roundMoney` y `formatCurrency` de `src/lib/money.ts`.
- **Commits**: Conventional Commits con la clave de Jira, p. ej. `feat(PMC-18): ...`.

> Para probar la supervisión de cajas (PMC-31) con mocks, crea `.env.development.local` con `VITE_MOCK_ROLE=Gerente` (o `Administrador`).
