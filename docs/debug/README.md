# Keeper Platform Debug Documentation

> **Purpose**: Central hub for all debug tooling documentation, consolidation plans, and troubleshooting guides

---

## 📚 Documentation Index

### Core Documents

1. **[inventory.md](./inventory.md)** - Comprehensive inventory of all 29 debug tools
   - Frontend: 15 tools (UI, console loggers, fetch interceptor, window helpers)
   - Backend: 14 tools (API endpoints, middleware loggers, request trackers)
   - Includes: location, type, trigger, env flags, redundancy analysis

2. **[data-flow-map.md](./data-flow-map.md)** - Visual map of data flow + debug tap points
   - Complete flow: DnD → save (PATCH) → read (GET) → render
   - 15+ debug hook tap points identified
   - Recommendations for consolidation

---

## 🎯 Quick Stats

- **Total Debug Tools**: 29 (15 frontend, 14 backend)
- **Always-On Tools**: 11 (flooding console even when not debugging)
- **Env-Gated Tools**: 3 (require specific env flags)
- **Route-Based Tools**: 4 (UI pages + API endpoints)
- **Console Logs Per Frame Update**: 30-40 (high noise)
- **Redundancy Areas**: Auth checking (6 tools), Network health (4 tools), Board data errors (3 tools)

---

## 🚨 Key Findings

### High Redundancy
- **Auth State Checking**: 6 separate tools doing similar things
- **Board Studio Logging**: 22 console.logs across 3 components for same flow
- **Network/Health Checks**: 4 overlapping tools
- **Debug Endpoints**: 11 `/api/debug/*` routes with some overlap

### Production Exposure
- App.tsx health check runs in production (should be dev-only)
- Many console.logs not gated by `import.meta.env.DEV`
- Middleware auth logs only gated for specific routes

### Fragmented Triggers
- Some always-on (console floods)
- Some env-gated (VITE_FETCH_SHIM_DEBUG, NODE_ENV)
- Some route-based (/debug page, /api/debug/*)
- Some manual (DebugButton, AppLayout DEBUG button)
- **No unified toggle**

---

## 🛠️ Consolidation Plan (Part 2)

### Phase 1: Immediate Cleanup
- [ ] Gate all console.logs with `import.meta.env.DEV`
- [ ] Remove App.tsx health check or gate with DEV flag
- [ ] Consolidate auth checking into single service
- [ ] Remove redundant Board Studio console.logs

### Phase 2: Studio Debug Widget
- [ ] Create `StudioDebugWidget` component (toggleable panel)
- [ ] Add keyboard shortcut: `Ctrl+Shift+D` or URL param `?debug=1`
- [ ] Tabs: Network, Auth, Board, Frame, Logs, Health
- [ ] Consume `/api/debug/all` for backend data
- [ ] Replace scattered console.logs with event bus

### Phase 3: Unified Debug System
- [ ] Add `VITE_DEBUG=1` master flag
- [ ] Create `DebugEventBus` for centralized logging
- [ ] Enhance fetch-shim to capture network metadata
- [ ] Backend: aggregate endpoint for request traces (`/api/debug/req/:reqId/full`)
- [ ] Single debug UI: combines DebugPage, DebugButton, AppLayout DEBUG

### Phase 4: Production Safety
- [ ] Audit all console.logs for production exposure
- [ ] Add CI check: fail if console.log not gated
- [ ] Remove or gate all "always-on" debug code
- [ ] Add runtime debug mode toggle (admin only)

---

## 📋 Tool Categories

### Frontend UI Tools
| Tool | Route/Trigger | Status |
|------|---------------|--------|
| DebugPage | `/debug` | ✅ Comprehensive, keep |
| DebugButton | Always-on floating button | ⚠️ Consolidate |
| AppLayout DEBUG | Always-on button | ⚠️ Consolidate |
| AuthDebug | Manual render | ⚠️ Consolidate |

### Frontend Helpers
| Tool | Type | Status |
|------|------|--------|
| window.__keeper | Window object | ✅ Keep, enhance |
| fetch-shim | Global fetch interceptor | ✅ Keep, make optional |
| lib/debug.tsx | Error tracking | ✅ Keep |

### Frontend Console Loggers
| Tool | Location | Status |
|------|----------|--------|
| Board Studio | board-studio-page.tsx | ❌ Remove, replace with widget |
| PatternRenderer | PatternRenderer.tsx | ❌ Remove, replace with widget |
| PropDropZone | PropDropZone.tsx | ❌ Remove, replace with widget |
| Auth (4 files) | AuthContext, AuthGate, ensureSession, AuthForm | ⚠️ Consolidate, gate with DEV |
| App health | App.tsx | ❌ Remove or gate with DEV |

### Backend API Endpoints
| Endpoint | Purpose | Status |
|----------|---------|--------|
| `GET /api/debug` | Index + DB counts | ✅ Keep |
| `GET /api/debug/all` | Aggregate snapshot | ✅ Keep, enhance |
| `GET /api/debug/req/:reqId` | Server logs by reqId | ✅ Keep |
| `GET /api/debug/board-studio-snapshot` | Board Studio diagnostics | ✅ Keep |
| `POST /api/debug/fix-*` | Auto-fix DB issues | ⚠️ Move to admin routes |
| Other `/api/debug/*` | Various tests | ⚠️ Review, consolidate |

### Backend Middleware Loggers
| Middleware | Location | Status |
|------------|----------|--------|
| Request logging | index.ts | ✅ Keep, already gated |
| Auth logging | auth-combined.ts | ⚠️ Expand gate or remove |
| Board data logging | boards.ts | ⚠️ Gate with env flag |
| Other middleware | dynamicCorsMiddleware, etc. | ✅ Keep errors only |

---

## 🔍 Debug Tool Usage Guide

### For Frontend Developers

**Quick Debug**:
1. Open browser console
2. Type: `window.__keeper.checkAuth()` - check auth state
3. Type: `window.__keeper.checkApiConnection()` - test API connectivity
4. Type: `window.__keeper.getBoardInfo()` - check board storage

**Full Diagnostics**:
1. Navigate to `/debug` page
2. Click "Run Complete Diagnostics"
3. Report auto-copies to clipboard
4. Share with backend team if needed

**Board Studio Issues**:
1. Click "🔧 DEBUG" floating button (bottom-right)
2. Shows last BoardData error with reqId
3. Click "Fetch server logs by reqId" for backend trace

**Network Issues**:
1. Add `VITE_FETCH_SHIM_DEBUG=1` to `.env.local`
2. Restart dev server
3. Watch console for `[keeper:fetch-shim]` logs
4. Shows token injection, header stripping, etc.

### For Backend Developers

**Quick Server Check**:
```bash
curl https://api.ke3p.com/api/health
# Should return: {"status":"ok","service":"api","ts":"..."}
```

**Full System Snapshot**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.ke3p.com/api/debug/all
# Returns: env, railway, keepers, logs, routes, theme check
```

**Request Trace by reqId**:
```bash
curl https://api.ke3p.com/api/debug/req/YOUR_REQ_ID
# Returns: all server logs for that request
```

**Board Studio Snapshot**:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "https://api.ke3p.com/api/debug/board-studio-snapshot?userId=YOUR_USER_ID"
# Returns: keepers, theme check, recent auth/perm logs
```

**Database Auto-Fix**:
```bash
curl -X POST https://api.ke3p.com/api/debug/fix-database
# Creates missing agents, activates platform keys
```

---

## 🌍 Environment Flags Reference

### Frontend (Vite)

| Flag | Default | Purpose | Gating |
|------|---------|---------|--------|
| `VITE_FETCH_SHIM_DEBUG` | `0` | Enables fetch-shim verbose logging | Optional |
| `VITE_ALLOW_HEADER_AUTH` | `0` | Bypasses Authorization header stripping in prod | **DO NOT USE IN PROD** |
| `VITE_ENABLE_STUDIO_FALLBACK` | `0` | Enables fallback board data in dev | Dev only |
| `VITE_DEBUG` | - | **(Proposed)** Master debug flag | TBD |
| `import.meta.env.MODE` | `'development'` | Current mode | Read-only |
| `import.meta.env.DEV` | `true` | Is dev mode | Read-only |
| `import.meta.env.PROD` | `false` | Is production build | Read-only |

### Backend (Node)

| Flag | Default | Purpose | Gating |
|------|---------|---------|--------|
| `NODE_ENV` | `'development'` | Node environment | Standard |
| `ENABLE_REQUEST_LOGGING` | `'false'` | Enables request logging middleware | Optional |
| `DEBUG_THEME_ID` | - | Theme ID for smoke testing | Optional |
| `RAILWAY_*` | - | Railway deployment vars | Read-only |

---

## 📊 Debug Data Flow Summary

```
User Action (DnD/Edit)
  └─> PropDropZone (5 logs) 🔍
      └─> PatternRenderer (10 logs) 🔍
          └─> BoardStudioPage (7 logs) 🔍
              └─> fetch()
                  └─> fetch-shim (2-3 logs if DEBUG) 🔍
                      └─> Backend Middleware
                          ├─> Request Logging (1 log if enabled) 🔍
                          ├─> CORS (errors only) 🔍
                          ├─> Auth (1 log if dev & board-data) 🔍
                          └─> boards.ts (4-6 logs) 🔍
                              └─> Response
                                  └─> BoardStudioPage callback (4 logs) 🔍
                                      └─> Re-render
                                          └─> PatternRenderer (2 logs) 🔍

TOTAL: ~30-40 console logs per frame update cycle
```

**Problem**: Console flood makes actual debugging harder.

**Solution**: Replace with Studio Debug Widget (toggleable, structured, filterable).

---

## 🔗 Related Documentation

- [COOKIE_AUTH_IMPLEMENTATION_SUMMARY.md](../../COOKIE_AUTH_IMPLEMENTATION_SUMMARY.md) - Auth flow with debug tips
- [PHANTOM_LOGIN_FIX_COMPLETE.md](../../PHANTOM_LOGIN_FIX_COMPLETE.md) - Login debugging guide
- [apps/web/src/boot/README.md](../../apps/web/src/boot/README.md) - fetch-shim documentation
- [apps/api/src/api/README.md](../../apps/api/src/api/README.md) - Backend API routes including /api/debug

---

## 🎯 Next Actions

### Immediate (Sprint 1)
1. ✅ Part 1: Complete inventory and data flow map
2. ⏳ Part 2: Design and implement Studio Debug Widget
3. ⏳ Clean up console.log noise (gate with DEV)
4. ⏳ Remove App.tsx health check or gate it

### Short-term (Sprint 2)
1. Consolidate auth checking tools
2. Add `VITE_DEBUG=1` master flag
3. Create `DebugEventBus` for structured logging
4. Enhance `/api/debug/all` with request traces

### Long-term (Sprint 3+)
1. Production-safe debug mode (admin toggle)
2. CI checks for ungated console.logs
3. Debug analytics (most common errors, slow requests)
4. Performance monitoring integration

---

## 📝 Maintenance

- **Update frequency**: After major feature additions or debug tool changes
- **Owner**: Platform Team
- **Last updated**: 2025-10-14
- **Review cycle**: Quarterly

---

**Questions or suggestions?** Open an issue or PR with label `debug-tooling`.

