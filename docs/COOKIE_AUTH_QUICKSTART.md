# HttpOnly Cookie Authentication - Quick Start

## What Changed

**Before**: localStorage tokens (vulnerable to extensions)
**After**: HttpOnly cookies (extension-proof)

---

## Key Files Modified

### Backend
- ✅ `apps/api/src/kam/session.ts` - NEW: Cookie management
- ✅ `apps/api/src/kam/auth.ts` - NEW: Auth endpoints
- ✅ `apps/api/src/kam/auth-routes.ts` - NEW: Route mounting
- ✅ `apps/api/src/index.ts` - Added cookie-parser
- ✅ `apps/api/package.json` - Added cookie-parser dependency

### Frontend  
- ✅ `apps/web/src/boot/fetch-shim.ts` - Production uses cookies only
- ✅ `apps/web/src/auth/AuthGate.tsx` - Validates with /api/kam/auth/me
- ✅ `apps/web/src/context/AuthContext.tsx` - No localStorage in production

---

## API Endpoints

### New Auth Endpoints
```
POST /api/kam/auth/login   - Sets HttpOnly cookie
POST /api/kam/auth/logout  - Clears cookie
GET  /api/kam/auth/me      - Returns user (cookie-based)
```

---

## How It Works

### Login Flow
```
1. User submits credentials
2. POST /api/kam/auth/login
3. Server validates → sets keeper_session cookie (HttpOnly)
4. Response: { ok: true, user, token }
5. Frontend stores user in state (NOT localStorage in prod)
```

### Page Load
```
1. AuthGate runs before app renders
2. GET /api/kam/auth/me (credentials: 'include')
3. Server reads keeper_session cookie → validates
4. Response: { user: {...} }
5. AuthGate: status = 'authed' → renders app
```

### API Requests
```
1. Any fetch to /api/*
2. Fetch shim adds credentials: 'include'
3. Browser sends keeper_session cookie automatically
4. Server validates cookie → sets req.user
5. Response: protected data
```

---

## Production vs Development

### Production (import.meta.env.PROD = true)
- ✅ No localStorage read/write
- ✅ HttpOnly cookies ONLY
- ✅ AuthGate validates with server
- ✅ Extension-proof

### Development (import.meta.env.PROD = false)
- ✅ localStorage fallback for testing
- ✅ Bearer tokens work
- ✅ Easier local development
- ✅ Same as before

---

## Quick Tests

### Test 1: Extension Cannot Fake Auth
```javascript
// In production (www.ke3p.com):
localStorage.setItem('keeper_token', 'fake_token');
// Refresh page
// Expected: Still shows guest/login (AuthGate validates with server)
```

### Test 2: Cookie Present After Login
```
1. Login at www.ke3p.com
2. DevTools → Application → Cookies → www.ke3p.com
3. Find: keeper_session cookie
4. Verify: HttpOnly=true, Secure=true, SameSite=Lax
```

### Test 3: Requests Include Cookie
```
1. Navigate to Board Studio
2. DevTools → Network → /api/board-data/*
3. Request Headers → Cookie: keeper_session=...
4. Response: 200 OK
```

---

## Environment Variables

### Required
```bash
# Backend
JWT_SECRET=<your-secret-key>

# Frontend
VITE_API_URL=https://api.ke3p.com
```

### Debug (Optional)
```bash
# Frontend - Shows fetch shim logs
VITE_FETCH_SHIM_DEBUG=1
```

---

## Diagnostics

```javascript
// Check shim mode
window.__keeper.fetchShimMode
// → 'production' or 'development'

// Check auth status
window.__keeper.authStatus
// → 'authed' or 'guest'

// Check cookies (must be in DevTools, not console)
// Application → Cookies → keeper_session
```

---

## Troubleshooting

### "Still seeing 401 errors"
1. Check cookie is present: DevTools → Application → Cookies
2. Verify HTTPS (Secure flag requires it)
3. Check `VITE_API_URL` points to `https://api.ke3p.com`

### "Extension still faking auth"
1. Verify `import.meta.env.PROD === true` in build
2. Check AuthGate validates with server (console logs)
3. Confirm localStorage not read in production

### "CLI/tools broken"
- They should still work with `Authorization: Bearer <token>`
- Server accepts both cookie and header
- Cookie is preferred, header is fallback

---

## Migration Notes

### For Users
- Will need to re-login once after deployment
- Old localStorage tokens ignored in production
- Cookies work seamlessly after login

### For Developers
- Dev mode unchanged (localStorage still works)
- Production requires real server validation
- No more fake tokens in dev console

---

## Security Benefits

✅ **Extension-Proof**: HttpOnly cookies unreadable by JS/extensions
✅ **XSS Protection**: Scripts cannot access cookie
✅ **CSRF Protection**: SameSite=Lax + Origin checks
✅ **No Token Exposure**: Cookie value hidden in DevTools
✅ **Server-Verified**: Every page load validates with server

---

## Commit Message

```
feat: implement HttpOnly cookie sessions (extension-proof auth)

Backend:
- Add cookie-parser middleware
- Create session management utilities (setSessionCookie, clearSessionCookie, authWeb)
- Add auth endpoints (login, logout, me) with cookie support
- Add CSRF guard middleware
- Mount /api/kam/auth routes

Frontend:
- Update fetch shim to use cookies only in production
- Update AuthGate to validate with /api/kam/auth/me
- Guard localStorage usage to dev mode only
- Maintain credentials: 'include' for all API requests

Security:
- HttpOnly, Secure, SameSite=Lax cookies
- Browser extensions cannot fake authentication
- Server validates every page load via AuthGate
- CSRF protection on mutating requests

Backward Compatible:
- CLI/tools still work with Bearer tokens
- Dev mode supports localStorage for testing
- Graceful migration (users re-login once)
```

---

## Full Documentation

See: `docs/COOKIE_SESSIONS_IMPLEMENTATION.md`

