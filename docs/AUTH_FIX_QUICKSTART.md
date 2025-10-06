# Authentication Fix - Quick Start

## What Was Fixed
Board Studio was showing "Error Loading Board" because API requests were missing the `Authorization: Bearer <JWT>` header. This is now fixed with a comprehensive authentication hardening solution.

## Key Changes

### 1. Global Fetch Shim (Main Fix)
**File**: `apps/web/src/boot/fetch-shim.ts`
- Intercepts ALL fetch calls before they reach the network
- Automatically injects `Authorization: Bearer <token>` for API requests
- Handles all fetch types: strings, URLs, Request objects
- Verbose logging available via `VITE_FETCH_SHIM_DEBUG=1`

### 2. Session Validation
**File**: `apps/web/src/auth/ensureSession.ts`
- Validates token with server on app boot
- Prevents "phantom login" (UI shows logged in, API rejects)
- Auto-clears invalid tokens

### 3. 401 Handler
**File**: `apps/web/src/auth/handleAuthError.ts`
- Centralized logout on auth failures
- Clears all auth data and redirects to `/login`
- Used in BoardContext and BoardStudioPage

### 4. Diagnostics
**File**: `apps/web/src/lib/diagnostics.ts`
- Debug tools exposed on `window.__keeper`
- Check auth state, API connectivity, board info

## Quick Test (After Deploy)

```javascript
// 1. Check if shim is installed
window.__keeper.fetchShimInstalled  // should be true

// 2. Check auth state
window.__keeper.checkAuth()
// Returns: { hasToken: true, tokenLocation: 'localStorage', ... }

// 3. Enable debug mode (requires rebuild)
// Set VITE_FETCH_SHIM_DEBUG=1 in env

// 4. Watch console when selecting a board
// Should see: [fetch-shim] ✓ injected Bearer token
```

## Expected Behavior

### Before Login (Incognito)
- ✅ No `keeper_token` in localStorage
- ✅ Login page shows
- ✅ No API requests made

### After Login
- ✅ `keeper_token` stored in localStorage
- ✅ All API requests include `Authorization` header
- ✅ Board Studio loads boards without 401 errors

### On 401 Error
- ✅ Console: `[handleAuthError] 401 detected → clearing auth...`
- ✅ All tokens cleared
- ✅ Redirect to `/login`

## Environment Variables

### Production (Required)
```bash
VITE_API_URL=https://api.ke3p.com
```

### Debug (Optional - Remove After Testing)
```bash
VITE_FETCH_SHIM_DEBUG=1  # Enables verbose fetch logging
```

### Dev Only (Optional)
```bash
VITE_ENABLE_STUDIO_FALLBACK=1  # Allows fallback board data in dev
```

## Commit Messages Ready

```bash
git commit -m "web: inject JWT in global fetch shim so Board Studio calls are authenticated"
git commit -m "web: add session validation on boot to prevent phantom login"
git commit -m "web: add centralized 401 handler and hard-logout on auth failures"
git commit -m "web: disable Board Studio fallback data in production"
git commit -m "web: add authentication diagnostics for debugging"
```

## Files Changed

**New**:
- `apps/web/src/boot/fetch-shim.ts`
- `apps/web/src/auth/ensureSession.ts`
- `apps/web/src/auth/handleAuthError.ts`
- `apps/web/src/lib/diagnostics.ts`
- READMEs for boot/ and auth/ modules

**Modified**:
- `apps/web/src/main.tsx` - Import shim first, add session validation
- `apps/web/src/context/BoardContext.tsx` - Add 401 handling
- `apps/web/src/pages/studio/board-studio-page.tsx` - Add 401 handling, gate fallbacks

## Verification Checklist

- [ ] Incognito: No token before login
- [ ] Login: Token appears in localStorage
- [ ] Board Studio: Requests include Authorization header
- [ ] Board Studio: Boards load successfully (200 status)
- [ ] Network tab: See `Authorization: Bearer ...` in headers
- [ ] Console: Shim logs appear (if debug enabled)
- [ ] Diagnostics: `window.__keeper.*` commands work
- [ ] 401 test: Corrupt token → auto logout

## Need Help?

See full documentation: `docs/AUTHENTICATION_HARDENING.md`

Quick diagnostics:
```javascript
window.__keeper.checkAuth()
await window.__keeper.checkApiConnection()
window.__keeper.getBoardInfo()
```

