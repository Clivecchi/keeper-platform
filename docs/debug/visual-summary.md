# Debug Tools Visual Summary

> **Quick visual overview** of all debug tools and their relationships

---

## 🎯 The Problem

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE: CHAOS                         │
└─────────────────────────────────────────────────────────────────┘

USER NEEDS TO DEBUG AN ISSUE
     │
     ├─> Open Console → FLOODED WITH 30-40 LOGS PER FRAME UPDATE
     │    │ BoardStudioPage: Component initializing
     │    │ BoardStudioPage: useAuth hook called
     │    │ 🎨 PatternRenderer: Rendering frame
     │    │ 🔧 PatternRenderer: Passing initialProps
     │    │ 🔄 PatternRenderer: onPropsUpdate called
     │    │ 📡 PatternRenderer: Calling onFrameUpdate
     │    │ 🔄 Board Studio: onFrameUpdate called
     │    │ 📡 Board Studio: Making PATCH request
     │    │ [keeper:fetch-shim] checking URL...
     │    │ [board-data:auth] { path, method, used: 'JWT-first' }
     │    │ [board-data:get] { reqId, boardId, userId }
     │    │ [board-data/:id] before-prisma
     │    │ [board-data/:id] after-prisma
     │    │ 📡 Board Studio: API response received
     │    │ 💾 Board Studio: Updating local state
     │    │ 📋 Board Studio: Updated mockFrames
     │    │ ✅ Board Studio: Frame updated successfully
     │    │ 🎨 PatternRenderer: Rendering frame...
     │    └─> ACTUAL ERROR MESSAGE (buried under noise)
     │
     ├─> Try window.__keeper → 5 DIFFERENT METHODS, INCONSISTENT DATA
     │    │ window.__keeper.checkAuth()
     │    │ window.__keeper.checkApiConnection()
     │    │ window.__keeper.getBoardInfo()
     │    │ window.__keeper.fetchShimInstalled
     │    └─> But no frame/board state data
     │
     ├─> Click DebugButton → ONLY SHOWS LAST BOARDDATA ERROR
     │    └─> Can't see auth issues or network problems
     │
     ├─> Navigate to /debug → COMPREHENSIVE BUT SLOW
     │    └─> Runs 19 tests, takes 10-15 seconds
     │
     └─> Click AppLayout DEBUG → DIFFERENT DATA THAN /debug
          └─> Confusion: which one to use?

RESULT: 🤯 Developer spends 30 minutes finding 1-minute bug
```

---

## ✨ The Solution

```
┌─────────────────────────────────────────────────────────────────┐
│                   FUTURE STATE: CLARITY                         │
└─────────────────────────────────────────────────────────────────┘

USER NEEDS TO DEBUG AN ISSUE
     │
     └─> Press Ctrl+Shift+D or ?debug=1
          │
          ▼
     ┌─────────────────────────────────────────────────────────┐
     │            🔧 Studio Debug Widget                        │
     │  ┌────────┬─────────┬───────┬───────┬────────┬────────┐ │
     │  │Network │  Auth   │ Board │ Frame │  Logs  │ Health │ │
     │  └────────┴─────────┴───────┴───────┴────────┴────────┘ │
     │                                                          │
     │  [Network Tab]                                          │
     │  • Last 20 requests (filterable)                        │
     │  • Request/response details                             │
     │  • Timing breakdown                                     │
     │  • Error highlights                                     │
     │                                                          │
     │  [Auth Tab]                                             │
     │  • Token status (present/missing/expired)               │
     │  • User info                                            │
     │  • Session state                                        │
     │  • Quick test: Check Auth, Check API                    │
     │                                                          │
     │  [Board Tab]                                            │
     │  • Current board: name, id, domain                      │
     │  • Frame count, theme info                              │
     │  • Recent board operations                              │
     │  • Storage: localStorage keys                           │
     │                                                          │
     │  [Frame Tab]                                            │
     │  • Active frames list                                   │
     │  • Click frame → see props, pattern, position           │
     │  • Frame update history                                 │
     │  • Validation errors                                    │
     │                                                          │
     │  [Logs Tab] ⭐ THE GAME CHANGER                         │
     │  • ⏸️ Pause/Resume logging                              │
     │  • 🔍 Filter: error/warn/info/debug                     │
     │  • 📍 Source filter: Board/Frame/Network/Auth          │
     │  • 📅 Time filter                                       │
     │  • 💾 Export logs                                       │
     │  • ✨ Smart grouping (collapse repeated logs)          │
     │                                                          │
     │  [Health Tab]                                           │
     │  • API status                                           │
     │  • Database connection                                  │
     │  • Railway/Vercel info                                  │
     │  • Recent errors                                        │
     │                                                          │
     └─────────────────────────────────────────────────────────┘

RESULT: 😊 Developer finds bug in 2 minutes, moves on
```

---

## 📊 Tool Distribution (Current State)

```
┌────────────────────────────────────────────────────────────────┐
│                       FRONTEND (15 tools)                      │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  UI WIDGETS (4)                                               │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────┐│
│  │  DebugPage  │ │ DebugButton │ │  AppLayout  │ │  Auth   ││
│  │   /debug    │ │  (floating) │ │    DEBUG    │ │  Debug  ││
│  │  19 tests   │ │ Last error  │ │  Snapshot   │ │ Widget  ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────┘│
│        ⚠️              ⚠️              ⚠️              ⚠️       │
│    Overlap         Overlap         Overlap      Not used     │
│                                                                │
│  HELPERS (3)                                                  │
│  ┌───────────────┐ ┌───────────────┐ ┌─────────────────┐   │
│  │ window.__     │ │  fetch-shim   │ │  lib/debug.tsx  │   │
│  │   keeper      │ │  (global)     │ │  (error track)  │   │
│  │ 3 methods     │ │  intercept    │ │  last error     │   │
│  └───────────────┘ └───────────────┘ └─────────────────┘   │
│        ✅               ✅                   ✅              │
│     Keep            Keep (opt)          Keep               │
│                                                                │
│  CONSOLE LOGGERS (8) ❌ HIGH NOISE                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │ BoardStudioPage.tsx → 15 logs                      │     │
│  │ PatternRenderer.tsx → 10 logs                      │     │
│  │ PropDropZone.tsx    →  5 logs                      │     │
│  │ App.tsx health      →  3 logs (PROD EXPOSED!)      │     │
│  │ AuthForm.tsx        →  2 logs                      │     │
│  │ AuthGate.tsx        →  3 logs                      │     │
│  │ AuthContext.tsx     →  4 logs                      │     │
│  │ ensureSession.ts    →  3 logs                      │     │
│  └────────────────────────────────────────────────────┘     │
│  TOTAL: 45+ always-on console.logs per user action          │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                       BACKEND (14 tools)                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  API ENDPOINTS (11) - /api/debug/*                            │
│  ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐    │
│  │   GET /      │ │  GET /all    │ │ GET /req/:reqId   │    │
│  │  (index)     │ │ (snapshot)   │ │  (server logs)    │    │
│  └──────────────┘ └──────────────┘ └───────────────────┘    │
│        ✅              ✅                   ✅                 │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ + 8 more: railway-status, database, uuid-test,      │    │
│  │   model-provider-test, fix-database, fix-kip-       │    │
│  │   provider, board-studio-snapshot, health            │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
│  MIDDLEWARE LOGGERS (3)                                       │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐  │
│  │ Request Log    │ │  Auth Logger   │ │  Board Logger  │  │
│  │ (if enabled)   │ │  (dev only*)   │ │  (always-on)   │  │
│  └────────────────┘ └────────────────┘ └────────────────┘  │
│        ✅              ⚠️ Partial gate       ⚠️ No gate     │
│                                                                │
│  UTILITIES (2)                                                │
│  ┌────────────────┐ ┌────────────────────────────────────┐  │
│  │   LogStore     │ │      requestLog.ts                 │  │
│  │ (in-memory)    │ │    (durable RequestLog DB)         │  │
│  │  max 50 logs   │ │    logReq(), ensureRequestId()     │  │
│  └────────────────┘ └────────────────────────────────────┘  │
│        ✅                          ✅                         │
│                                                                │
└────────────────────────────────────────────────────────────────┘

Legend:
  ✅ Keep (good as-is)
  ⚠️ Consolidate/Fix
  ❌ Remove/Replace
```

---

## 🔥 Redundancy Heatmap

```
┌────────────────────────────────────────────────────────────────┐
│                    OVERLAPPING CONCERNS                        │
└────────────────────────────────────────────────────────────────┘

AUTH/SESSION STATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ███████ 6 tools doing the same thing ███████
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ window.__keeper │ │   AuthDebug     │ │   DebugPage     │
│  .checkAuth()   │ │   component     │ │   auth tests    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  AuthContext    │ │   AuthGate      │ │  ensureSession  │
│     logs        │ │     logs        │ │      logs       │
└─────────────────┘ └─────────────────┘ └─────────────────┘

All checking: token presence, user state, session validity
❌ CONSOLIDATE into AuthDebugService


BOARD DATA OPERATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ██████ 5 tools logging same flow ██████
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:                           Backend:
┌─────────────────────────────┐   ┌──────────────────────┐
│ BoardStudioPage (F7)        │   │ auth-combined (B13)  │
│  • 7 logs per API call      │   │  • 1 log per request │
│  • onFrameUpdate            │───▶│    (if dev)          │
│  • PATCH/GET calls          │   └──────────────────────┘
│  • Response handling        │   ┌──────────────────────┐
└─────────────────────────────┘   │ boards.ts (B14)      │
┌─────────────────────────────┐   │  • 4-6 logs per req  │
│ PatternRenderer (F8)        │   │  • before/after DB   │
│  • 10 logs per render       │───▶│  • errors, warnings  │
│  • Props updates            │   └──────────────────────┘
└─────────────────────────────┘
┌─────────────────────────────┐
│ PropDropZone (F9)           │
│  • 5 logs per DnD event     │
└─────────────────────────────┘

Total: 22 frontend + 5-7 backend = 27-29 logs per update!
❌ REPLACE with DebugEventBus (emit once, view in widget)


NETWORK/API HEALTH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ████ 4 tools checking connectivity ████
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┐ ┌─────────────────┐
│  App.tsx        │ │ window.__keeper │
│  health check   │ │ .checkApi       │
│  (on mount)     │ │ Connection()    │
└─────────────────┘ └─────────────────┘
┌─────────────────┐ ┌─────────────────┐
│  DebugPage      │ │  /api/health    │
│  CORS tests     │ │  endpoint       │
│  (19 tests)     │ │  (backend)      │
└─────────────────┘ └─────────────────┘

❌ CONSOLIDATE into single health check service
   Keep /api/health, remove App.tsx check


ERROR TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    ███ 3 tools tracking same errors ███
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────┐        ┌──────────────────────────┐
│ lib/debug.tsx    │───────▶│ window.__KEEPER_DEBUG__  │
│ setLastBoard     │        │ .lastBoardDataError      │
│ DataError()      │        └──────────────────────────┘
└──────────────────┘                   │
                                       │
                      ┌────────────────▼────────────────┐
                      │  DebugButton (F4)               │
                      │  • Shows last error             │
                      │  • Fetches server logs (B9)     │
                      └─────────────────────────────────┘

✅ KEEP this pattern (works well), integrate into widget
```

---

## 📈 Console Log Explosion

```
SINGLE FRAME UPDATE CYCLE (DnD → Save → Render)

Time: 0ms
  │
  ├─ DnD Event
  │   └─ PropDropZone (F9): 5 logs
  │       "🎯 PropDropZone: Drop event received"
  │       "📦 PropDropZone: Raw drop data"
  │       "✅ PropDropZone: Parsed prop data"
  │       "📍 PropDropZone: Drop position"
  │       "🚀 PropDropZone: Calling onPropDrop..."
  │
Time: 50ms
  │
  ├─ Props Update
  │   └─ PatternRenderer (F8): 10 logs
  │       "🎨 PatternRenderer: Rendering frame"
  │       "🔍 PatternRenderer: PREVIEW MODE detected"
  │       "🔧 PatternRenderer: Passing initialProps"
  │       "🔄 PatternRenderer: onPropsUpdate called"
  │       "📡 PatternRenderer: Calling onFrameUpdate..."
  │       ...
  │
Time: 100ms
  │
  ├─ Frame Update Callback
  │   └─ BoardStudioPage (F7): 7 logs
  │       "🔄 Board Studio: onFrameUpdate called"
  │       "📡 Board Studio: Making PATCH request to API..."
  │
Time: 150ms
  │
  ├─ Fetch Intercepted
  │   └─ fetch-shim (F2): 2-3 logs (if DEBUG=1)
  │       "[keeper:fetch-shim] checking URL"
  │       "[keeper:fetch-shim] API match → inject token? true"
  │       "[keeper:fetch-shim] DEV: injected Authorization"
  │
Time: 200ms (server processing)
  │
  ├─ Backend Middleware
  │   └─ auth-combined (B13): 1 log (if dev)
  │       "[board-data:auth] { path, method, used: 'JWT-first' }"
  │
Time: 250ms
  │
  ├─ Route Handler
  │   └─ boards.ts (B14): 4-6 logs
  │       "[board-data:get] { reqId, boardId, userId }"
  │       "[board-data/:id] before-prisma"
  │       "[board-data/:id] after-prisma"
  │       "[board-data/:id] response-shape"
  │
Time: 350ms (response received)
  │
  ├─ Frontend Callback
  │   └─ BoardStudioPage (F7): 4 logs
  │       "📡 Board Studio: API response received"
  │       "💾 Board Studio: Updating local mockFrames state..."
  │       "📋 Board Studio: Updated mockFrames"
  │       "✅ Board Studio: Frame updated successfully"
  │
Time: 400ms
  │
  └─ Re-render
      └─ PatternRenderer (F8): 2 logs
          "🎨 PatternRenderer: Rendering frame"
          "🎯 PatternRenderer: Using CanvasPattern"

─────────────────────────────────────────────────────────────
TOTAL: 33-38 console.logs for ONE FRAME UPDATE
TIME: 400ms
─────────────────────────────────────────────────────────────

Now imagine the user drags 5 props in a row...
  → 165-190 console logs in 2 seconds
  → Console is UNUSABLE for debugging 🤯
```

---

## 🎯 Consolidation Strategy

```
┌────────────────────────────────────────────────────────────────┐
│                    TRANSFORMATION PLAN                         │
└────────────────────────────────────────────────────────────────┘

CURRENT:                          FUTURE:
┌──────────────────────┐          ┌──────────────────────────┐
│ DebugPage            │          │                          │
│ DebugButton          │          │   Studio Debug Widget    │
│ AppLayout DEBUG      │   ────▶  │   (Single Interface)     │
│ AuthDebug            │          │                          │
└──────────────────────┘          │  • Toggle: Ctrl+Shift+D  │
                                  │  • or ?debug=1           │
┌──────────────────────┐          │                          │
│ 45+ console.logs     │          │  • Tabs: Network, Auth,  │
│ (always-on noise)    │   ────▶  │    Board, Frame, Logs    │
└──────────────────────┘          │                          │
                                  │  • Pause/Filter/Export   │
┌──────────────────────┐          │                          │
│ window.__keeper      │          │  • Smart grouping        │
│ (5 methods)          │   ────▶  │                          │
└──────────────────────┘          │  • Network metadata      │
                                  │                          │
┌──────────────────────┐          │  • Auth checks           │
│ /api/debug/*         │          │                          │
│ (11 endpoints)       │   ────▶  │  • Board/Frame state     │
└──────────────────────┘          │                          │
                                  │  • Server logs by reqId  │
                                  │                          │
                                  │  • Health checks         │
                                  │                          │
                                  └──────────────────────────┘

BENEFITS:
  ✅ Single toggle (on/off)
  ✅ Zero console noise when off
  ✅ All debug data in one place
  ✅ Filterable, searchable logs
  ✅ Export for bug reports
  ✅ No production exposure
  ✅ Consistent UX
```

---

## 📊 Impact Summary

### Before Consolidation
- **29 separate debug tools**
- **45+ console.logs always-on** (30-40 per frame update)
- **6 tools checking auth** (redundant)
- **4 tools checking network health** (redundant)
- **4 separate debug UIs** (inconsistent UX)
- **Production exposure** (App.tsx health check, ungated logs)
- **No unified toggle** (hard to enable/disable)
- **Debug time per bug**: 20-30 minutes (console noise, tool hunting)

### After Consolidation
- **1 unified debug widget** (Studio Debug Widget)
- **0 console.logs always-on** (toggleable via widget)
- **1 auth checking service** (consolidated)
- **1 network health service** (consolidated)
- **1 debug UI** (consistent, comprehensive)
- **Production safe** (all debug code gated)
- **Single toggle** (Ctrl+Shift+D or ?debug=1)
- **Debug time per bug**: 2-5 minutes (fast filtering, clear data)

### ROI
- **Time saved**: 15-25 minutes per debug session
- **Developer happiness**: 🤯 → 😊
- **Console clarity**: Unusable → Clear
- **Maintenance burden**: High → Low
- **Production risk**: Medium → None

---

**Next**: [Part 2 - Studio Debug Widget Implementation](./consolidation-plan.md) (coming soon)

