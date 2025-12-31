# Keeper Platform Debug Tools Inventory

> **Generated**: 2025-10-14  
> **Purpose**: Comprehensive inventory of all debug functionality across the Keeper Platform codebase (frontend + backend)

---

## Executive Summary

This inventory documents **29 distinct debug tools** across the Keeper Platform:
- **Frontend**: 15 tools (UI components, console loggers, window helpers, fetch interceptor)
- **Backend**: 14 tools (API endpoints, middleware loggers, request trackers)

**Key Findings**:
- **High redundancy** in console.log patterns (emojis, prefixes, Board Studio logging)
- **Fragmented triggers**: some always-on, some env-gated, some route-specific
- **No unified interface**: debug data scattered across console, window.__keeper, /api/debug endpoints, floating buttons
- **Production exposure**: Some debug code runs in production (e.g., health checks in App.tsx, middleware auth logging)

---

## Frontend Debug Tools (15 items)

| # | Name/Location | Type | Trigger | Env Flags | Surface | What it shows/does | Dependencies | Redundancy |
|---|---------------|------|---------|-----------|---------|-------------------|--------------|------------|
| **F1** | `apps/web/src/lib/diagnostics.ts`<br/>`window.__keeper.*` | Window Helper Object | Always-on (loads with app) | None | App-wide | Exposes 3 methods on window: `checkAuth()`, `checkApiConnection()`, `getBoardInfo()`. Also stores flags: `fetchShimInstalled`, `fetchShimDebug`, `authStatus`, `authGateLoaded`. Logs `[Keeper] Diagnostics loaded` on init. | None | Overlaps with DebugPage tests, AuthDebug component |
| **F2** | `apps/web/src/boot/fetch-shim.ts`<br/>`window.fetch` override | Global Fetch Interceptor | Always-on (imported first in main.tsx) | `VITE_FETCH_SHIM_DEBUG` (logging)<br/>`VITE_ALLOW_HEADER_AUTH` (bypass prod stripping) | Network/Auth | **Production**: strips Authorization headers, uses cookies only. **Dev**: injects Bearer token from localStorage. Logs `[keeper:fetch-shim]` when DEBUG=true. Sets `window.__keeper.fetchShimInstalled = true`. | localStorage tokens | Overlaps with diagnostics.ts auth checks |
| **F3** | `apps/web/src/pages/DebugPage.tsx`<br/>`<DebugPage>` component | Full-page UI diagnostics suite | Route: `/debug` (public, no auth) | Reads `import.meta.env.MODE/DEV/PROD` | App-wide | Comprehensive test suite: 19 tests including API connectivity, database, UUID validation, API keys, agents, chat, CORS, Railway, network requests. Auto-copies report to clipboard. Monitors fetch/console during tests. | `apiFetch`, `/api/debug/*` endpoints, `useAuth` | Overlaps with window.__keeper, /api/debug endpoints |
| **F4** | `apps/web/src/components/DebugButton.tsx`<br/>`<DebugButton>` | Floating/sidebar debug widget | Always-on (rendered in layouts) | `import.meta.env.PROD` (changes color: red=prod, blue=dev) | App-wide | Shows last BoardData error (`reqId`, `url`, `status`, `boardId`). Fetches server logs via `/api/debug/req/:reqId`. Can navigate to `/debug` page. | `window.__KEEPER_DEBUG__.lastBoardDataError`, `apiFetch`, `/api/debug/req/:id` | Overlaps with DebugPage, lib/debug.tsx |
| **F5** | `apps/web/src/lib/debug.tsx`<br/>`setLastBoardDataError()` | Error tracking helper | Called manually on BoardData fetch errors | None | Board-level | Stores last BoardData error in `window.__KEEPER_DEBUG__.lastBoardDataError`. Used by DebugButton to show recent error. | None | Used by DebugButton |
| **F6** | `apps/web/src/components/AuthDebug.tsx`<br/>`<AuthDebug>` | Auth status widget | Manual (not rendered by default) | None | App-wide (auth) | Displays auth state: loading, authenticated, token presence, user info. Shows error if not authenticated. | `useAuth` hook | Overlaps with diagnostics.ts `checkAuth()`, DebugPage auth tests |
| **F7** | `apps/web/src/pages/studio/board-studio-page.tsx`<br/>Console logs | Console logger | Always-on | None | Board Studio | **15+ console.log statements**: `BoardStudioPage:`, `🔍 Debug:`, `🔄 Board Studio:`, `📡 Board Studio:`, `💾 Board Studio:`, `📋 Board Studio:`, `✅ Board Studio:`, `❌ Board Studio:`. Logs component lifecycle, frame updates, API calls, DnD events. | `useAuth`, `useBoard`, `useFrame` | High redundancy with PatternRenderer, PropDropZone logs |
| **F8** | `apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`<br/>Console logs | Console logger | Always-on | None | Frame-level | **10+ console.log statements**: `🎨 PatternRenderer:`, `🔍 PatternRenderer:`, `🔧 PatternRenderer:`, `🔄 PatternRenderer:`, `📡 PatternRenderer:`, `✅ PatternRenderer:`, `❌ PatternRenderer:`, `⚠️ PatternRenderer:`, `🎯 PatternRenderer:`. Logs frame rendering, preview mode, props updates, onFrameUpdate callbacks. | `onFrameUpdate` callback | High redundancy with board-studio-page.tsx |
| **F9** | `apps/web/src/components/props/PropDropZone.tsx`<br/>Console logs | Console logger | Always-on | None | Frame-level (DnD) | **5 console.log statements**: `🎯 PropDropZone:`, `📦 PropDropZone:`, `✅ PropDropZone:`, `📍 PropDropZone:`, `🚀 PropDropZone:`, `⚠️ PropDropZone:`, `❌ PropDropZone:`. Logs drop events, parsed prop data, drop position. | DnD events | Overlaps with board-studio-page.tsx DnD logging |
| **F10** | `apps/web/src/App.tsx`<br/>Health check | Network probe | Always-on (useEffect on mount) | `import.meta.env.MODE` | App-wide | Fetches `https://api.ke3p.com/api/health` on mount. Logs `SystemStatus:` results (ok/failed/error). **Production exposure**: runs in prod. | Hard-coded API URL | Should be removed or gated |
| **F11** | `apps/web/src/components/AuthForm.tsx`<br/>Console logs | Console logger | On auth success | None | Auth | Logs `SystemStatus: /api/kam/me ok` or `SystemStatus: /api/kam/me failed`. | `/api/kam/me` endpoint | Overlaps with AuthDebug, window.__keeper |
| **F12** | `apps/web/src/auth/AuthGate.tsx`<br/>Console logs | Console logger | Always-on | None | Auth gate | **3 console.log statements**: `[AuthGate] Validating session...`, `[AuthGate] Session validated...`, `[AuthGate] No valid session...`. | `/api/kam/auth/me` | Overlaps with AuthContext, diagnostics |
| **F13** | `apps/web/src/context/AuthContext.tsx`<br/>Console logs | Console logger | Always-on | `import.meta.env.PROD` | Auth context | **4 console.log statements**: `[AuthContext] Production mode: skipping localStorage`, `[AuthContext] Dev mode: loaded auth...`, `[AuthContext] Dev mode: stored auth...`, `[AuthContext] Production mode: auth via cookie only`. | localStorage | Overlaps with AuthGate, diagnostics |
| **F14** | `apps/web/src/auth/ensureSession.ts`<br/>Console logs | Console logger | Always-on | None | Auth | **3 console.log statements**: `[ensureSession] No token found...`, `[ensureSession] Token validated...`, `[ensureSession] Clearing invalid token...`. | localStorage | Overlaps with AuthContext, AuthGate |
| **F15** | `apps/web/src/layouts/AppLayout.tsx`<br/>Debug data fetcher | Network probe (manual trigger) | Click "DEBUG" button | `import.meta.env.PROD` | App-wide | Fetches `/api/debug/all`. Shows modal with complete system info: env, railway, keepers, theme, logs, routes. Logs `🔍 Fetching debug data from:`. Button color changes (red=prod, blue=dev). | `/api/debug/all` endpoint | Overlaps with DebugPage, DebugButton |

---

## Backend Debug Tools (14 items)

| # | Name/Location | Type | Trigger | Env Flags | Surface | What it shows/does | Dependencies | Redundancy |
|---|---------------|------|---------|-----------|---------|-------------------|--------------|------------|
| **B1** | `apps/api/src/api/debug.ts`<br/>`POST /api/debug` | Debug endpoint | HTTP POST to `/api/debug` | `NODE_ENV` (included in response) | Server | Echo endpoint: returns received body, timestamp, environment, Railway vars. Logs `Debug endpoint hit`. | None | Basic test endpoint |
| **B2** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug` | Debug endpoint | HTTP GET to `/api/debug` | None | Server | Index endpoint: returns DB counts (domains, keepers, boards), server time, db connection test. | Prisma | Used by AppLayout |
| **B3** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug/railway-status` | Debug endpoint | HTTP GET to `/api/debug/railway-status` | All `RAILWAY_*` env vars | Server | Returns Railway deployment info, server uptime, memory, node version. Logs `Railway status endpoint hit`. | Railway env vars | Overlaps with /api/debug/railway-logs |
| **B4** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug/database` | Debug endpoint | HTTP GET to `/api/debug/database` | None | Server | Tests DB connection: user/agent counts, UUID generation, table existence, response time. | Prisma | Used by DebugPage |
| **B5** | `apps/api/src/api/debug.ts`<br/>`POST /api/debug/uuid-test` | Debug endpoint | HTTP POST to `/api/debug/uuid-test` | None | Server | Tests UUID validation: client UUID, user ID, invalid string, DB UUID casting, platform key UUID tests. | Prisma | Used by DebugPage |
| **B6** | `apps/api/src/api/debug.ts`<br/>`POST /api/debug/model-provider-test` | Debug endpoint | HTTP POST to `/api/debug/model-provider-test` | None | Server | Tests ModelProviderService: calls AI model with test message. Logs `[Debug] Testing ModelProviderService...`. | ModelProviderService | Used by DebugPage |
| **B7** | `apps/api/src/api/debug.ts`<br/>`POST /api/debug/fix-database` | Debug endpoint | HTTP POST to `/api/debug/fix-database` | None | Server | Auto-fix DB issues: creates missing agents (kip, ceox), activates platform keys. Returns actions/errors. | Prisma | Used by DebugPage |
| **B8** | `apps/api/src/api/debug.ts`<br/>`POST /api/debug/fix-kip-provider` | Debug endpoint | HTTP POST to `/api/debug/fix-kip-provider` | None | Server | Updates Kip agent to use OpenAI provider. Logs `[Debug] Fixing Kip agent...`, `[Debug] Found Kip agent:`, `[Debug] Updated Kip agent successfully`. | Prisma | Used by DebugPage |
| **B9** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug/req/:reqId` | Debug endpoint | HTTP GET with reqId | None | Server | Returns server logs filtered by reqId. Tries durable RequestLog table, falls back to in-memory LogStore. | Prisma RequestLog, LogStore | Used by DebugButton |
| **B10** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug/board-studio-snapshot` | Debug endpoint | HTTP GET (optional auth) | `DEBUG_THEME_ID` (optional) | Board Studio | Returns: server time, user, keepers sample, theme check, recent logs (auth/perm probes), route map, env vars. | Prisma, LogStore | Used for Board Studio troubleshooting |
| **B11** | `apps/api/src/api/debug.ts`<br/>`GET /api/debug/all` | Debug endpoint | HTTP GET (optional auth) | `NODE_ENV`, `RAILWAY_*`, `VERCEL_PROJECT_ID`, `DEBUG_THEME_ID` | Server | **Aggregate endpoint**: combines snapshot + logs + env + railway + keepers + theme + routes. Returns 300 recent logs. | Prisma, LogStore | Used by AppLayout DEBUG button |
| **B12** | `apps/api/src/health.ts`<br/>`GET /api/health` | Health endpoint | Always-on (no auth) | None | Server | Returns `{ status: 'ok', service: 'api', ts }`. Used by frontend health checks. | None | Standard health check |
| **B13** | `apps/api/src/middleware/auth-combined.ts`<br/>Console logs | Middleware logger | On `/api/board-data` requests | `NODE_ENV !== 'production'` | Board data auth | **Dev only**: Logs `[board-data:auth]` with path, method, used strategy (KAM-first or JWT-first), headers seen. | None | Overlaps with boards.ts logging |
| **B14** | `apps/api/src/api/boards.ts`<br/>Console logs | Console logger | On board-data requests | None (some gated by dev) | Board data | **Multiple console.log/info/warn/error statements**: `[board-data:get]`, `[board-data/:id]`, `[board-data:raw:error]`, `[studio-alias:get:error]`. Logs reqId, boardId, userId, domain mismatches, API responses. | Prisma, auth middleware | High redundancy with auth-combined logs |

---

## Additional Backend Logging (Not Full Debug Tools)

These are scattered console.log/logger statements in middleware and routes:

| Location | Pattern | Trigger | Purpose |
|----------|---------|---------|---------|
| `apps/api/src/index.ts` | `📨`, `📤`, `📍` | Request logging middleware (if `ENABLE_REQUEST_LOGGING=true` or dev) | Logs all requests: method, path, reqId, origin, status |
| `apps/api/src/kam/session.ts` | `[session]` | Preview cookie set | Logs when SameSite=None cookie set |
| `apps/api/src/kam/auth.ts` | `[kam/auth]` | Login/me errors | Logs auth errors |
| `apps/api/src/kam/middleware.ts` | `[kam:audit]` | Audit events | JSON audit log for KAM actions |
| `apps/api/src/api/agents.ts` | `[agent-home:ensure:*]` | Agent board operations | Logs agent board creation, attachment, pruning, seeding |
| `apps/api/src/middleware/dynamicCorsMiddleware.ts` | `CORS blocked origin:`, errors | CORS failures | Logs blocked origins, CORS errors |
| `apps/api/src/middleware/domainResolutionMiddleware.ts` | `Domain resolution error:` | Domain resolution failures | Logs domain resolution errors |
| `apps/api/src/middleware/memoryAccessMiddleware.ts` | `Memory access middleware error:` | Memory access failures | Logs memory access errors |
| `apps/api/src/middleware/logRequestMiddleware.ts` | `[timestamp] METHOD URL - IP` | All requests (if enabled) | Basic request logging |

---

## Environment Flags Summary

| Flag | Type | File | Purpose |
|------|------|------|---------|
| `VITE_FETCH_SHIM_DEBUG` | Frontend | `fetch-shim.ts` | Enables verbose `[keeper:fetch-shim]` logging |
| `VITE_ALLOW_HEADER_AUTH` | Frontend | `fetch-shim.ts` | Bypasses Authorization header stripping in prod builds (troubleshooting only) |
| `VITE_ENABLE_STUDIO_FALLBACK` | Frontend | `board-studio-page.tsx` | Enables fallback board data in dev mode |
| `import.meta.env.MODE` | Frontend | Multiple | Current mode: 'development' or 'production' |
| `import.meta.env.DEV` | Frontend | Multiple | Boolean: true if dev mode |
| `import.meta.env.PROD` | Frontend | Multiple | Boolean: true if production build |
| `NODE_ENV` | Backend | Multiple | Node environment: 'development' or 'production' |
| `ENABLE_REQUEST_LOGGING` | Backend | `index.ts` | Enables request logging middleware |
| `DEBUG_THEME_ID` | Backend | `debug.ts` | Theme ID for smoke testing theme endpoint |
| `RAILWAY_*` (many) | Backend | `debug.ts`, `index.ts` | Railway deployment vars (service, environment, domain, etc.) |

---

## Redundancy Analysis

### High Redundancy Areas

1. **Auth State Checking**
   - `window.__keeper.checkAuth()` (F1)
   - `<AuthDebug>` component (F6)
   - DebugPage auth tests (F3)
   - AuthContext logs (F13)
   - AuthGate logs (F12)
   - ensureSession logs (F14)
   - **Recommendation**: Consolidate into Studio Debug widget with auth panel

2. **Board Studio Logging**
   - board-studio-page.tsx console logs (F7)
   - PatternRenderer console logs (F8)
   - PropDropZone console logs (F9)
   - boards.ts server logs (B14)
   - **Recommendation**: Centralize under single Board Studio debug toggle

3. **Network/Health Checks**
   - App.tsx health check (F10)
   - window.__keeper.checkApiConnection() (F1)
   - DebugPage CORS tests (F3)
   - /api/health endpoint (B12)
   - **Recommendation**: Single health check service

4. **Debug Endpoints**
   - `/api/debug/*` (B1-B11)
   - AppLayout debug fetcher (F15)
   - DebugPage (F3)
   - DebugButton (F4)
   - **Recommendation**: Single unified debug API route consumed by consolidated UI

### Overlapping Concerns

| Concern | Tools Involved | Count |
|---------|----------------|-------|
| Auth/Session | F1, F6, F12, F13, F14, F3 | 6 |
| Board Data | F7, F8, F9, B13, B14 | 5 |
| Network/API | F2, F3, F10, F15, B12 | 5 |
| Fetch Interception | F2, F3 | 2 |
| Error Tracking | F4, F5, B9 | 3 |
| Database | F3, B4, B5, B7 | 4 |

---

## Must-Fix Issues

1. **Production Exposure**
   - App.tsx health check runs in prod (F10) → remove or gate with `import.meta.env.DEV`
   - Some console.logs not gated (F7-F9) → wrap in `if (import.meta.env.DEV)`
   - Middleware auth logs (B13) only gated for `/api/board-data` → expand or remove

2. **Always-On Noise**
   - Board Studio logs flood console even when not needed
   - Auth logs fire on every auth check
   - **Solution**: Add global debug toggle or ENV flag

3. **Fetch Shim Complexity**
   - fetch-shim (F2) is always-on and modifies global fetch
   - Hard to debug fetch issues when shim is active
   - **Solution**: Make optional or add kill switch

4. **Fragmented UI**
   - DebugPage (F3), DebugButton (F4), AppLayout debug (F15) all separate
   - No single "Studio Debug" surface
   - **Solution**: Consolidate into one toggleable panel in Board Studio

5. **Missing Global Toggle**
   - No single flag to disable all debug logging
   - Must set multiple env vars or comment out code
   - **Solution**: Add `VITE_DEBUG=1` master flag

---

## Triggers Summary

| Trigger Type | Count | Examples |
|--------------|-------|----------|
| Always-on | 11 | F1, F2, F7, F8, F9, F12, F13, F14, B12, B14 |
| Route-based | 4 | F3 (`/debug`), B1-B11 (`/api/debug/*`) |
| Manual/Click | 2 | F4 (DebugButton), F15 (AppLayout DEBUG) |
| Env flag gated | 3 | F2 (VITE_FETCH_SHIM_DEBUG), F10 (MODE), B13 (NODE_ENV) |
| Event-driven | 3 | F5 (on error), F9 (on drop), F11 (on auth) |

---

## Dependencies Graph

```
Frontend UI Tools
├─ DebugPage (F3)
│  ├─ apiFetch
│  ├─ /api/debug/* (B1-B11)
│  └─ useAuth
├─ DebugButton (F4)
│  ├─ lib/debug.tsx (F5)
│  ├─ /api/debug/req/:id (B9)
│  └─ apiFetch
├─ AppLayout DEBUG (F15)
│  └─ /api/debug/all (B11)
├─ AuthDebug (F6)
│  └─ useAuth
└─ window.__keeper (F1)
   └─ localStorage

Logging Tools
├─ board-studio-page.tsx (F7)
│  ├─ useAuth
│  ├─ useBoard
│  └─ useFrame
├─ PatternRenderer (F8)
│  └─ onFrameUpdate callback
└─ PropDropZone (F9)
   └─ DnD events

Network Tools
├─ fetch-shim (F2)
│  └─ localStorage (dev mode)
└─ App.tsx health (F10)
   └─ Hard-coded /api/health

Auth Logging
├─ AuthContext (F13)
│  └─ localStorage
├─ AuthGate (F12)
│  └─ /api/kam/auth/me
└─ ensureSession (F14)
   └─ localStorage

Backend Tools
├─ /api/debug/* (B1-B11)
│  ├─ Prisma
│  ├─ LogStore
│  └─ RequestLog table
└─ Middleware loggers (B13, B14)
   └─ Request context
```

---

## Next Steps (Part 2)

1. **Consolidation Plan**:
   - Create single `StudioDebugWidget` component
   - Add toggle (keyboard shortcut: `Ctrl+Shift+D` or URL param `?debug=1`)
   - Tabs: Network, Auth, Board, Frame, Logs, Health
   - Consume `/api/debug/all` for backend data

2. **Cleanup**:
   - Remove App.tsx health check
   - Gate all console.logs with `import.meta.env.DEV`
   - Remove duplicate auth checking code
   - Consolidate Board Studio logs

3. **Flags**:
   - Add `VITE_DEBUG=1` master flag (disables all debug when `0`)
   - Keep `VITE_FETCH_SHIM_DEBUG` for fetch-specific debugging
   - Deprecate others

4. **Data Flow Map** (next deliverable):
   - DnD → PropDropZone → PatternRenderer → onFrameUpdate → PATCH /api/board-data → GET /api/board-data → render
   - Mark where debug hooks tap in (fetch-shim, console logs, window.__keeper, /api/debug/req/:id)

---

## Appendix: Code Signatures for Future Searches

```typescript
// Frontend
"[Keeper] Diagnostics loaded"
"window.__keeper"
"[keeper:fetch-shim]"
"BoardStudioPage:"
"PatternRenderer:"
"PropDropZone:"
"🎨", "🔧", "📡", "✅", "🔄", "🎯", "📍", "🔍", "💾", "📋", "❌", "⚠️"
"import.meta.env.VITE_*"
"VITE_FETCH_SHIM_DEBUG"
"VITE_ALLOW_HEADER_AUTH"
"VITE_ENABLE_STUDIO_FALLBACK"

// Backend
"[Debug]"
"[board-data:*]"
"/api/debug/*"
"/api/health"
"console.log('[*]'"
"NODE_ENV"
"ENABLE_REQUEST_LOGGING"
"RAILWAY_*"
```

---

**End of Inventory** | Generated: 2025-10-14

