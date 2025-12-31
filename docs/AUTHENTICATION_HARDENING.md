# Authentication Hardening - Board Studio 401 Fix

## Overview
This document describes the comprehensive authentication hardening implemented to fix Board Studio 401 errors and prevent phantom login states.

## Problem Summary
- **Symptom**: Board Studio showing "Error Loading Board" with 401 responses
- **Root Cause**: API requests missing `Authorization: Bearer <JWT>` header
- **Secondary Issue**: UI appearing "logged in" without valid server session (phantom login)

## Solution Architecture

### 1. Global Fetch Shim (`src/boot/fetch-shim.ts`)
**Purpose**: Intercept ALL fetch calls and inject authentication headers

**Features**:
- ✅ Loads FIRST before any other code (imported at top of main.tsx)
- ✅ Handles all fetch input types: strings, URLs, Request objects
- ✅ Detects API requests via pattern matching and domain detection
- ✅ Injects `Authorization: Bearer <token>` if not already present
- ✅ Verbose logging via `VITE_FETCH_SHIM_DEBUG=1` environment variable
- ✅ Prevents double-installation with guard flag

**Detection Logic**:
```typescript
// Detects these as API requests:
- /api/...  (relative)
- https://api.ke3p.com/...  (absolute)
- Any URL matching VITE_API_URL
```

**Debug Output** (when `VITE_FETCH_SHIM_DEBUG=1`):
```
[fetch-shim] checking URL: https://api.ke3p.com/api/board-data/domain-board-1
[fetch-shim] API match → inject token? true has Authorization already? false
[fetch-shim] ✓ injected Bearer token
```

### 2. Session Validation (`src/auth/ensureSession.ts`)
**Purpose**: Validate stored tokens with server on app boot

**Behavior**:
- Called in `main.tsx` before React app renders
- Checks for `keeper_token` in localStorage/sessionStorage
- Validates with `GET /api/domains/my` (minimal endpoint)
- Clears invalid tokens automatically
- Returns boolean for app to decide next action

**Benefits**:
- Prevents phantom login (UI logged in, API rejects)
- Cleans stale tokens on startup
- Server-side verification before user interaction

### 3. Centralized 401 Handler (`src/auth/handleAuthError.ts`)
**Purpose**: Consistent logout behavior across the app

**Behavior**:
- Detects 401 status in responses or error objects
- Clears ALL auth data (keeper_token, keeper_user)
- Redirects to `/login`
- Logs action for debugging

**Integration Points**:
- `BoardContext.loadBoard()` - catches board load 401s
- `BoardStudioPage.handleBoardSelect()` - catches board selection 401s
- `BoardStudioPage.loadBoardsAndFrames()` - catches boards list 401s

### 4. Production Fallback Control
**Change**: Board Studio fallback data now gated by environment

```typescript
const ALLOW_FALLBACK = import.meta.env.DEV && 
                       import.meta.env.VITE_ENABLE_STUDIO_FALLBACK === '1';
```

**Result**:
- Production: Hard error if API fails (no masking)
- Development: Fallback only if explicitly enabled
- Clear distinction between API failures and mock data

### 5. Diagnostic Utilities (`src/lib/diagnostics.ts`)
**Purpose**: Developer tools for debugging auth issues

**Available Commands**:
```javascript
// Check auth state
window.__keeper.checkAuth()
// Returns: { hasToken, tokenLocation, tokenLength, tokenPreview }

// Test API connectivity
await window.__keeper.checkApiConnection()
// Returns: { apiUrl, healthEndpoint, healthStatus, healthOk }

// Check board data
window.__keeper.getBoardInfo()
// Returns: { lastError, storage: { boardLayouts, totalKeys } }

// Check shim status
window.__keeper.fetchShimInstalled  // boolean
window.__keeper.fetchShimDebug      // boolean
```

## File Changes Summary

### New Files Created
1. `apps/web/src/boot/fetch-shim.ts` - Global fetch interceptor
2. `apps/web/src/auth/ensureSession.ts` - Session validator
3. `apps/web/src/auth/handleAuthError.ts` - 401 error handler
4. `apps/web/src/lib/diagnostics.ts` - Debug utilities
5. `apps/web/src/boot/README.md` - Boot module documentation
6. `apps/web/src/auth/README.md` - Auth module documentation
7. `docs/modules/boot.md` - Documentation backup
8. `docs/modules/auth.md` - Documentation backup

### Modified Files
1. `apps/web/src/main.tsx`
   - Import fetch-shim FIRST
   - Import diagnostics
   - Call ensureSession() before render
   - Removed old inline fetch shim

2. `apps/web/src/context/BoardContext.tsx`
   - Import handleAuthError
   - Add 401 handling in loadBoard catch block

3. `apps/web/src/pages/studio/board-studio-page.tsx`
   - Import handleAuthError
   - Add 401 handling in handleBoardSelect
   - Add 401 handling in loadBoardsAndFrames
   - Gate fallback data behind dev flag

## Environment Variables

### Required for Production
```bash
VITE_API_URL=https://api.ke3p.com
```

### Optional Debug Flags
```bash
# Enable fetch shim verbose logging
VITE_FETCH_SHIM_DEBUG=1

# Enable fallback data in dev mode (optional)
VITE_ENABLE_STUDIO_FALLBACK=1
```

## Verification Steps

### Step 1: Incognito Test (Phantom Login Check)
1. Open incognito window: `https://www.ke3p.com`
2. **Before login**, open DevTools → Application → Local Storage
3. ✅ **Expected**: NO `keeper_token` key exists
4. ❌ **Fail**: Token exists → search codebase for autologin

### Step 2: Login Test
1. Complete normal login flow
2. Check Local Storage
3. ✅ **Expected**: `keeper_token` is set with valid JWT

### Step 3: Board Studio Load Test
1. Navigate to Board Studio
2. Select a board from left panel
3. Open DevTools → Network tab
4. Find request to `GET /api/board-data/{boardId}`
5. Check Request Headers
6. ✅ **Expected**: `Authorization: Bearer <token>` is present
7. ✅ **Expected**: Response status 200
8. ✅ **Expected**: Board loads without "Error Loading Board" banner

### Step 4: Shim Logging Test (Enable Debug Mode)
1. Set `VITE_FETCH_SHIM_DEBUG=1` in environment
2. Rebuild/restart app
3. Open DevTools → Console
4. Select a board
5. ✅ **Expected**: See shim logs:
   ```
   [fetch-shim] checking URL: https://api.ke3p.com/api/board-data/...
   [fetch-shim] API match → inject token? true has Authorization already? false
   [fetch-shim] ✓ injected Bearer token
   ```

### Step 5: 401 Handling Test
1. Manually corrupt token in localStorage:
   ```javascript
   localStorage.setItem('keeper_token', 'invalid_token_xyz')
   ```
2. Select a board in Board Studio
3. ✅ **Expected**: 
   - Console shows: `[handleAuthError] 401 detected → clearing auth and redirecting to login`
   - User redirected to `/login`
   - All tokens cleared from storage

### Step 6: Diagnostics Test
1. Open DevTools Console
2. Run diagnostic commands:
   ```javascript
   window.__keeper.checkAuth()
   await window.__keeper.checkApiConnection()
   window.__keeper.getBoardInfo()
   ```
3. ✅ **Expected**: All commands return structured data

## Troubleshooting

### Issue: Still getting 401 despite changes
**Check**:
1. Fetch shim is imported FIRST in main.tsx
2. Token exists in localStorage: `localStorage.getItem('keeper_token')`
3. Shim is installed: `window.__keeper.fetchShimInstalled === true`
4. Enable debug: `VITE_FETCH_SHIM_DEBUG=1` and check logs

### Issue: Shim logs not appearing
**Check**:
1. `VITE_FETCH_SHIM_DEBUG=1` is set
2. App was rebuilt after setting env var
3. Check `window.__keeper.fetchShimDebug === true`

### Issue: Token cleared on refresh
**Check**:
1. `ensureSession()` is validating with server
2. Server is actually returning 200 for `/api/domains/my`
3. Token hasn't expired (check JWT payload)

### Issue: Fallback data showing in production
**Check**:
1. `import.meta.env.DEV === false` in production
2. `VITE_ENABLE_STUDIO_FALLBACK` is NOT set in production
3. Clear build cache and rebuild

## Commit Messages

```
web: inject JWT in global fetch shim so Board Studio calls are authenticated

Creates robust fetch interceptor that:
- Handles all fetch input types (strings, URLs, Request objects)
- Injects Authorization headers for API requests
- Supports verbose debug logging
- Loads before any other application code

web: add session validation on boot to prevent phantom login

Validates stored tokens with server before rendering app.
Clears invalid tokens automatically to ensure clean auth state.

web: add centralized 401 handler and hard-logout on auth failures

Board Studio now immediately clears auth and redirects to login
on any 401 response instead of showing fallback data.

web: disable Board Studio fallback data in production

Fallback boards/frames now only available in dev mode with
explicit VITE_ENABLE_STUDIO_FALLBACK=1 flag.

web: add authentication diagnostics for debugging

Exposes window.__keeper utilities to check auth state, API
connectivity, and board data issues.
```

## Next Steps

1. Deploy to preview environment
2. Enable `VITE_FETCH_SHIM_DEBUG=1` temporarily
3. Test all verification steps above
4. Monitor logs for any unexpected behavior
5. Disable debug flag after validation
6. Deploy to production
7. Monitor error rates for 401s (should be zero after login)

## Maintenance Notes

- **Temporary Solution**: The fetch shim is temporary until all code migrates to `apiFetch`
- **Migration Path**: Gradually replace raw `fetch()` calls with `apiFetch` helper
- **Removal**: Once migration complete, remove fetch shim and related code
- **Documentation**: Keep this doc updated if auth flow changes

