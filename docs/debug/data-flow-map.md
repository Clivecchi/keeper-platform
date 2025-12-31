# Keeper Platform Debug Data Flow Map

> **Generated**: 2025-10-14  
> **Purpose**: Visual map showing how data flows from DnD → save (PATCH) → read (GET) → render, and where debug hooks currently tap in

---

## High-Level Data Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         KEEPER PLATFORM DATA FLOW                         │
└──────────────────────────────────────────────────────────────────────────┘

USER INTERACTION
     │
     ├─> [1] DRAG & DROP Props/Frames
     │        │
     │        └─> PropDropZone (F9) 🔍
     │             │ console.log: "🎯 PropDropZone: Drop event received"
     │             │ console.log: "📦 PropDropZone: Raw drop data"
     │             │ console.log: "📍 PropDropZone: Drop position"
     │             └─> onPropDrop callback
     │
     ├─> [2] EDIT Frame Props
     │        │
     │        └─> PatternRenderer (F8) 🔍
     │             │ console.log: "🎨 PatternRenderer: Rendering frame"
     │             │ console.log: "🔧 PatternRenderer: Passing initialProps"
     │             └─> PropManager
     │                  └─> onPropsUpdate callback
     │
     ├─> [3] UPDATE Frame State
     │        │
     │        └─> PatternRenderer.onPropsUpdate (F8) 🔍
     │             │ console.log: "🔄 PatternRenderer: onPropsUpdate called"
     │             │ console.log: "📡 PatternRenderer: Calling onFrameUpdate"
     │             └─> onFrameUpdate({ frameInstanceId, props, pattern, position })
     │
     └─> [4] FRAME UPDATE CALLBACK
              │
              └─> BoardStudioPage.onFrameUpdate (F7) 🔍
                   │ console.log: "🔄 Board Studio: onFrameUpdate called"
                   │ console.log: "📡 Board Studio: Making PATCH request"
                   └─> PATCH /api/board-data/:boardId
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         NETWORK LAYER (SAVE)                              │
└──────────────────────────────────────────────────────────────────────────┘

FRONTEND FETCH
     │
     ├─> fetch-shim intercept (F2) 🔍
     │    │ if (DEBUG) console.log: "[keeper:fetch-shim] checking URL"
     │    │ if (DEBUG) console.log: "[keeper:fetch-shim] API match"
     │    │ if (PROD) strips Authorization header
     │    │ if (DEV) injects Bearer token from localStorage
     │    └─> credentials: 'include' (cookies)
     │
     └─> HTTP Request
          │ Method: PATCH
          │ URL: /api/board-data/:boardId
          │ Headers: Cookie (session), Authorization (dev only)
          │ Body: { frames: [...], updatedFields: {...} }
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (SAVE)                                │
└──────────────────────────────────────────────────────────────────────────┘

MIDDLEWARE PIPELINE
     │
     ├─> [A] Request Logging (index.ts) 🔍
     │    │ if (ENABLE_REQUEST_LOGGING || dev)
     │    │   console.log: "📨 [timestamp] - METHOD PATH [reqId=...]"
     │    │   console.log: "📨 Origin: ... [reqId=...]"
     │    └─> Attaches req.reqId (UUID)
     │
     ├─> [B] CORS Middleware (dynamicCorsMiddleware.ts) 🔍
     │    │ Validates origin
     │    │ if (blocked) console.log: "CORS blocked origin: ..."
     │    │ if (error) console.error: "Dynamic CORS error: ..."
     │    └─> Sets CORS headers
     │
     ├─> [C] Auth Middleware (auth-combined.ts) 🔍
     │    │ if (NODE_ENV !== 'production' && path.startsWith('/api/board-data'))
     │    │   console.log: "[board-data:auth] { path, method, used: 'KAM-first', headers }"
     │    ├─> Tries KAM auth (X-KAM-Service-Key)
     │    ├─> Falls back to JWT (Authorization: Bearer)
     │    └─> Attaches req.user or req.kam
     │
     ├─> [D] Domain Resolution (domainResolutionMiddleware.ts) 🔍
     │    │ if (error) console.error: "Domain resolution error: ..."
     │    └─> Attaches req.domain
     │
     └─> [E] Permission Check (domainPermissionMiddleware.ts) 🔍
          │ if (error) console.error: "Permission check error: ..."
          └─> Verifies user can write to board
               │
               ▼

ROUTE HANDLER (boards.ts PATCH /api/board-data/:boardId)
     │
     ├─> Validate boardId (F7) 🔍
     │    │ console.log: "[board-data:get] { reqId, boardId, userId }"
     │
     ├─> Prisma Update (B14) 🔍
     │    │ console.info: "[board-data/:id] before-prisma { reqId, id, userId }"
     │    │ await prisma.board.update({ where: { id }, data: { frames, ... } })
     │    │ console.info: "[board-data/:id] after-prisma { reqId, frames }"
     │    │ if (error) console.error: "[board-data/:id] prisma-error { reqId, error }"
     │
     └─> Response
          │ Status: 200 OK
          │ Body: { success: true, board: { id, frames, ... } }
          │ if (REQUEST_LOGGING)
          │   console.log: "📤 [timestamp] - PATCH /api/board-data/:id - Status: 200 [reqId=...]"
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         NETWORK LAYER (RESPONSE)                          │
└──────────────────────────────────────────────────────────────────────────┘

HTTP RESPONSE
     │ Status: 200
     │ Body: { success: true, board: {...} }
     │
     ├─> fetch-shim intercept (F2) 🔍
     │    │ (Response passes through, no logging on response)
     │    └─> Returns to calling code
     │
     └─> BoardStudioPage callback (F7) 🔍
          │ console.log: "📡 Board Studio: API response received:", response
          │ console.log: "💾 Board Studio: Updating local mockFrames state..."
          │ setMockFrames(updated)
          │ console.log: "📋 Board Studio: Updated mockFrames:", updated
          │ console.log: "✅ Board Studio: Frame updated successfully"
          │ if (error) console.error: "❌ Board Studio: Failed to update frame:", error
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND RE-RENDER                                │
└──────────────────────────────────────────────────────────────────────────┘

STATE UPDATE
     │
     └─> mockFrames state changed
          │
          └─> BoardStudioPage re-renders
               │
               └─> PatternRenderer receives new frame data (F8) 🔍
                    │ console.log: "🎨 PatternRenderer: Rendering frame { frameId, pattern }"
                    └─> Renders updated frame with new props
```

---

## Read Flow (GET /api/board-data)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND LOAD                                     │
└──────────────────────────────────────────────────────────────────────────┘

COMPONENT MOUNT (BoardStudioPage)
     │
     ├─> useEffect(() => { fetchBoardData() }, [boardId]) (F7) 🔍
     │    │ console.log: "BoardStudioPage: Component initializing"
     │    │ console.log: "BoardStudioPage: useAuth hook called, user:", user
     │    │ console.log: "BoardStudioPage: useBoard hook called, activeBoard:", activeBoard
     │    └─> GET /api/board-data/:boardId
     │
     └─> fetch-shim intercept (F2) 🔍
          │ if (DEBUG) console.log: "[keeper:fetch-shim] checking URL"
          │ if (DEBUG) console.log: "[keeper:fetch-shim] API match → inject token? true"
          │ if (DEBUG && DEV) console.log: "[keeper:fetch-shim] DEV: injected Authorization"
          │ if (PROD) strips Authorization header
          └─> credentials: 'include'
               │
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (READ)                                │
└──────────────────────────────────────────────────────────────────────────┘

MIDDLEWARE PIPELINE (same as save flow)
     │
     ├─> Request Logging 🔍
     ├─> CORS 🔍
     ├─> Auth (auth-combined.ts) 🔍
     │    │ console.log: "[board-data:auth] { path, method, used: 'JWT-first', headers }"
     ├─> Domain Resolution 🔍
     └─> Permission Check 🔍
          │
          ▼

ROUTE HANDLER (boards.ts GET /api/board-data/:boardId)
     │
     ├─> Prisma Query (B14) 🔍
     │    │ console.log: "[board-data:get] { reqId, boardId, userId, method: 'GET' }"
     │    │ console.info: "[board-data/:id] before-prisma { reqId, id, userId }"
     │    │ const board = await prisma.board.findUnique({ where: { id }, include: { frames: true } })
     │    │ console.info: "[board-data/:id] after-prisma { reqId, keys: Object.keys(board) }"
     │    │ if (domain mismatch) console.warn: "[board-data/:id] domain-mismatch { reqId, boardDomainId, ctxDomainId }"
     │    │ if (error) console.error: "[board-data:get:error] { reqId, error }"
     │
     └─> Response
          │ Status: 200 OK
          │ Body: { success: true, board: { id, name, frames: [...], theme: {...} } }
          │ console.info: "[board-data/:id] response-shape { reqId, keys }"
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND RECEIVE & RENDER                         │
└──────────────────────────────────────────────────────────────────────────┘

FETCH RESPONSE
     │
     └─> BoardStudioPage.fetchBoardData callback (F7) 🔍
          │ console.log: "🔍 Debug: Raw board data from API:", { id, name, frames, theme }
          │ const processedFrames = frames.map(...)
          │ console.log: "🔍 Debug: Processed frames for mockFrames:", { count, sample }
          │ setMockFrames(processedFrames)
          │ console.log: "🔍 Debug: Frame data from API:", { frameCount, sampleFrame }
          │ if (error) setLastBoardDataError({ reqId, url, status, boardId }) (F5) 🔍
          │             └─> window.__KEEPER_DEBUG__.lastBoardDataError
          │
          └─> Component re-renders with board data
               │
               └─> For each frame in mockFrames
                    │
                    └─> PatternRenderer (F8) 🔍
                         │ console.log: "🎨 PatternRenderer: Rendering frame { frameId, pattern, props }"
                         │ if (preview mode) console.log: "🔍 PatternRenderer: PREVIEW MODE detected"
                         │ console.log: "🎯 PatternRenderer: Using CanvasPattern for canvas pattern"
                         └─> Renders frame UI
```

---

## Debug Hook Tap Points (Ordered by Flow)

### 1. **User Interaction → DnD**
- **F9: PropDropZone console logs** (always-on)
  - Tap point: DnD event handlers
  - Data: drop data, position, prop type/config
  - Trigger: `onDrop` event

### 2. **Frame State Update**
- **F8: PatternRenderer console logs** (always-on)
  - Tap point: `onPropsUpdate`, render lifecycle
  - Data: frame ID, pattern, props, preview mode
  - Trigger: Props change, render

### 3. **Frame Update Callback**
- **F7: BoardStudioPage console logs** (always-on)
  - Tap point: `onFrameUpdate` callback
  - Data: frameInstanceId, props, pattern, position
  - Trigger: User action (prop update, add frame, reorder)

### 4. **Frontend Fetch (Outgoing)**
- **F2: fetch-shim logs** (gated by `VITE_FETCH_SHIM_DEBUG`)
  - Tap point: Global `window.fetch` override (before request sent)
  - Data: URL, method, has Authorization header, token injection
  - Trigger: Any `fetch()` call to API URLs

### 5. **Backend Request Entry**
- **B: Request Logging** (gated by `ENABLE_REQUEST_LOGGING` or dev)
  - Tap point: Express middleware (first)
  - Data: reqId, method, path, origin, timestamp
  - Trigger: All API requests

### 6. **Backend Auth**
- **B13: auth-combined.ts logs** (gated by `NODE_ENV !== 'production'` and `/api/board-data`)
  - Tap point: Auth middleware (after request logging)
  - Data: auth strategy used (KAM/JWT), headers seen
  - Trigger: `/api/board-data` requests only

### 7. **Backend Route Handler**
- **B14: boards.ts logs** (always-on for errors, some gated)
  - Tap point: Route handler (before/after Prisma)
  - Data: reqId, boardId, userId, Prisma query results, errors
  - Trigger: Board data GET/PATCH/DELETE

### 8. **Backend Response Exit**
- **B: Request Logging** (gated by `ENABLE_REQUEST_LOGGING` or dev)
  - Tap point: Express middleware (last)
  - Data: reqId, status code, response time
  - Trigger: All API responses

### 9. **Frontend Fetch (Incoming)**
- **F7: BoardStudioPage logs** (always-on)
  - Tap point: `fetch()` callback (after response received)
  - Data: raw board data, processed frames, errors
  - Trigger: Board data fetch success/failure

- **F5: setLastBoardDataError** (on error)
  - Tap point: `catch` block in fetch callback
  - Data: reqId, url, status, boardId, timestamp
  - Stores in: `window.__KEEPER_DEBUG__.lastBoardDataError`
  - Trigger: Fetch error (4xx, 5xx, network error)

### 10. **Frontend Re-render**
- **F8: PatternRenderer logs** (always-on)
  - Tap point: Component render lifecycle
  - Data: frame ID, pattern, props, preview mode
  - Trigger: Props change, initial render

---

## Additional Debug Tap Points (Out of Main Flow)

### Always Available
- **F1: window.__keeper diagnostics** (always-on)
  - Tap point: Console (manual call)
  - Methods: `checkAuth()`, `checkApiConnection()`, `getBoardInfo()`
  - Data: token location/length, API health, board storage
  - Trigger: User types in console

- **F4: DebugButton** (always-on, manual click)
  - Tap point: UI button → modal
  - Data: Last BoardData error, server logs by reqId
  - Trigger: Click "🔧 DEBUG" button

- **F15: AppLayout DEBUG** (always-on, manual click)
  - Tap point: UI button → modal
  - Data: Complete system snapshot (env, railway, keepers, logs)
  - Trigger: Click "🔍 DEBUG" button in AppLayout

### Route-Based
- **F3: DebugPage** (route: `/debug`)
  - Tap point: Full page component
  - Data: 19 comprehensive tests (API, DB, UUID, agents, CORS, etc.)
  - Trigger: Navigate to `/debug`

- **B1-B11: /api/debug endpoints** (route: `/api/debug/*`)
  - Tap point: HTTP endpoints
  - Data: Railway status, DB health, logs, snapshots, fixes
  - Trigger: HTTP GET/POST to specific debug routes

### Auth Flow
- **F12: AuthGate logs** (always-on)
  - Tap point: Session validation
  - Data: validation status, user authentication state
  - Trigger: AuthGate component mount

- **F13: AuthContext logs** (always-on)
  - Tap point: Auth context init, login, logout
  - Data: production mode, token storage, user state
  - Trigger: Auth state changes

- **F14: ensureSession logs** (always-on)
  - Tap point: Session validation helper
  - Data: token presence, validation result
  - Trigger: ensureSession() called

- **F6: AuthDebug** (manual, not rendered by default)
  - Tap point: UI component
  - Data: loading, authenticated, token, user
  - Trigger: Component rendered in UI

### Health Checks
- **F10: App.tsx health check** (always-on, on mount)
  - Tap point: useEffect on App mount
  - Data: `/api/health` status
  - Trigger: App component mount (once per page load)

- **B12: /api/health endpoint** (always-on)
  - Tap point: HTTP endpoint
  - Data: status, service, timestamp
  - Trigger: HTTP GET to `/api/health`

---

## Debug Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DEBUG HOOK FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

                               USER ACTION
                                    │
                     ┌──────────────┼──────────────┐
                     │              │              │
                  DnD Event    Edit Props    Frame Update
                     │              │              │
                     └──────────────┴──────────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  PropDropZone (F9)   │ 🔍 console.log
                         │  PatternRenderer(F8) │ 🔍 console.log
                         │  BoardStudioPage(F7) │ 🔍 console.log
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  fetch() API call    │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │  fetch-shim (F2)     │ 🔍 [keeper:fetch-shim]
                         │  • strips/injects    │    (if VITE_FETCH_SHIM_DEBUG)
                         │    Authorization      │
                         │  • adds credentials   │
                         └──────────┬───────────┘
                                    │
                                 HTTP │ PATCH/GET
                                    │
                         ┌──────────▼───────────┐
                         │  Backend Middleware  │
                         │  ┌─────────────────┐ │
                         │  │ Request Log (B) │ │ 🔍 📨 reqId, method, path
                         │  └────────┬────────┘ │    (if ENABLE_REQUEST_LOGGING)
                         │  ┌────────▼────────┐ │
                         │  │ CORS Check      │ │ 🔍 errors
                         │  └────────┬────────┘ │
                         │  ┌────────▼────────┐ │
                         │  │ Auth (B13)      │ │ 🔍 [board-data:auth]
                         │  │ KAM or JWT      │ │    (if dev & /api/board-data)
                         │  └────────┬────────┘ │
                         │  ┌────────▼────────┐ │
                         │  │ Domain Check    │ │
                         │  └────────┬────────┘ │
                         │  ┌────────▼────────┐ │
                         │  │ Permissions     │ │
                         │  └────────┬────────┘ │
                         └───────────┼──────────┘
                                     │
                         ┌───────────▼──────────┐
                         │  Route Handler (B14) │ 🔍 [board-data:get]
                         │  boards.ts           │    [board-data/:id]
                         │  ┌─────────────────┐ │    before/after prisma
                         │  │ Prisma Query    │ │    errors, warnings
                         │  └────────┬────────┘ │
                         │  ┌────────▼────────┐ │
                         │  │ Response        │ │ 🔍 📤 status, reqId
                         │  └────────┬────────┘ │    (if REQUEST_LOGGING)
                         └───────────┼──────────┘
                                     │
                                  HTTP │ 200 OK
                                     │
                         ┌───────────▼──────────┐
                         │  Frontend Callback   │
                         │  ┌─────────────────┐ │
                         │  │BoardStudioPage  │ │ 🔍 📡 response, 💾 state
                         │  │  (F7)           │ │    ✅ success or ❌ error
                         │  └────────┬────────┘ │
                         │  │ if error:        │
                         │  │ setLastBoardData │ 🔍 window.__KEEPER_DEBUG__
                         │  │ Error (F5)       │    .lastBoardDataError
                         │  └──────────────────┘
                                     │
                         ┌───────────▼──────────┐
                         │  Re-render           │
                         │  ┌─────────────────┐ │
                         │  │PatternRenderer  │ │ 🔍 🎨 frame, props, pattern
                         │  │  (F8)           │ │
                         │  └─────────────────┘ │
                         └──────────────────────┘

        PARALLEL DEBUG TOOLS (always available):
        
        ┌─────────────────────────────────────────────┐
        │  window.__keeper (F1)                       │
        │  • checkAuth(), checkApiConnection()        │
        │  • getBoardInfo()                           │
        │  • fetchShimInstalled, authStatus           │
        └─────────────────────────────────────────────┘
        
        ┌─────────────────────────────────────────────┐
        │  DebugButton (F4)                           │
        │  • Last BoardData error modal               │
        │  • Fetch server logs via /api/debug/req/:id │
        └─────────────────────────────────────────────┘
        
        ┌─────────────────────────────────────────────┐
        │  AppLayout DEBUG (F15)                      │
        │  • Complete system snapshot                 │
        │  • GET /api/debug/all                       │
        └─────────────────────────────────────────────┘
        
        ┌─────────────────────────────────────────────┐
        │  DebugPage (F3) - route: /debug             │
        │  • 19 comprehensive tests                   │
        │  • Auto-copy report to clipboard            │
        └─────────────────────────────────────────────┘
        
        ┌─────────────────────────────────────────────┐
        │  /api/debug/* (B1-B11)                      │
        │  • Railway status, DB health                │
        │  • Logs by reqId, snapshots, fixes          │
        └─────────────────────────────────────────────┘
```

---

## Key Observations

### 1. **Console Log Flood**
The main data flow (DnD → save → render) has **at least 15 console.log tap points** that fire on every frame update:
- PropDropZone: 5 logs per drop
- PatternRenderer: 10 logs per render/update
- BoardStudioPage: 7 logs per API call
- fetch-shim: 2-3 logs per request (if DEBUG=true)
- Backend auth: 1 log per request (if dev)
- Backend boards: 4-6 logs per request

**Total**: ~30-40 console logs per single frame update cycle (DnD → PATCH → GET → render)

### 2. **Debug Hook Concentration**
- **Highest concentration**: Board Studio UI (F7, F8, F9) - 22 console.logs
- **Second highest**: Backend board-data route (B14) - 6 console.logs
- **Network layer**: fetch-shim (F2) - only 2-3 logs but critically positioned

### 3. **Missing Tap Points**
- **No debug hooks** in:
  - Frame factory (`makeFrameInstance`)
  - DraggableTabs (tab reordering)
  - Autosave hooks (useAutosave)
  - Context providers (BoardContext, FrameContext) - only auth contexts have logs
  - Theme loading/application
  - Conflict detection/resolution

### 4. **Redundant Tap Points**
- **Auth checking**: 6 separate tools (F1, F6, F12, F13, F14, F3)
- **Network health**: 4 tools (F10, F1, F3, B12)
- **Board data errors**: 3 tools (F5, F4, F9)

### 5. **Data Flow Gaps**
- **No visibility** into:
  - Client-side state management (BoardContext, FrameContext)
  - Frame instance lifecycle (creation, update, deletion in state)
  - Autosave trigger timing
  - Conflict detection logic
  - Theme application flow

---

## Recommendations for Consolidation

### 1. **Single Studio Debug Widget**
Replace scattered console.logs (F7, F8, F9) with single togglable widget:
```typescript
// Proposed: apps/web/src/components/studio/StudioDebugWidget.tsx
interface DebugEvent {
  timestamp: number;
  type: 'user-action' | 'state-change' | 'network' | 'render';
  component: string;
  data: any;
}

class DebugEventBus {
  static emit(event: DebugEvent) {
    if (!window.__KEEPER_DEBUG_ENABLED__) return;
    // Store in circular buffer (last 100 events)
    // Show in widget UI
  }
}
```

**Usage**:
```typescript
// In PropDropZone.tsx
DebugEventBus.emit({
  type: 'user-action',
  component: 'PropDropZone',
  data: { propType, position }
});
```

### 2. **Network Debug Layer**
Enhance fetch-shim to capture request/response metadata:
```typescript
// In fetch-shim.ts
if (DEBUG) {
  window.__KEEPER_DEBUG__.networkLog.push({
    reqId,
    method,
    url,
    status,
    duration,
    requestHeaders,
    responseHeaders,
    timestamp
  });
}
```

### 3. **Backend Debug Aggregation**
- Keep `/api/debug/all` endpoint
- Add `/api/debug/req/:reqId/full` for complete request trace (middleware → route → response)
- Use durable `RequestLog` table instead of in-memory LogStore

### 4. **Single Debug Toggle**
```typescript
// Global debug toggle (keyboard shortcut or URL param)
// Ctrl+Shift+D or ?debug=1

if (window.location.search.includes('debug=1') || localStorage.getItem('debug-enabled')) {
  window.__KEEPER_DEBUG_ENABLED__ = true;
}
```

---

**End of Data Flow Map** | Generated: 2025-10-14

