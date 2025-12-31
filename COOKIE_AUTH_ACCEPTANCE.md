# Cookie-Only Auth Acceptance Checklist

## Overview
Web browsers must authenticate via HttpOnly `keeper_session` cookie in PRODUCTION. Header auth (`Authorization: Bearer ...`) is restricted to CLI/tools or DEV environments.

---

## ✅ Pre-Deployment Checklist

### Frontend Changes
- [x] `apps/web/src/boot/fetch-shim.ts` updated to strip Authorization headers in PROD
- [x] Added `VITE_ALLOW_HEADER_AUTH` flag for local troubleshooting
- [x] Automatic cleanup of `keeper_token` from localStorage/sessionStorage in PROD
- [x] Fetch shim imported first in `apps/web/src/main.tsx`

### Backend Changes
- [x] `apps/api/src/kam/session.ts` - `authWeb` middleware updated
- [x] Middleware checks `Origin` header to detect browser requests
- [x] Header auth allowed only when: no Origin header OR `X-Client: cli` header present
- [x] Cookie auth always accepted

---

## 🧪 Acceptance Tests (Post-Deploy)

### Test 1: Web Browser - Production
**Environment:** Production (www.ke3p.com)

1. Hard refresh www.ke3p.com
   - Open DevTools → Network tab
   - Check "Disable cache"
   - Refresh page

2. Inspect any API call (e.g., `GET /api/domains/my`):
   - ✅ **No `Authorization` header present**
   - ✅ **Request Cookies shows `keeper_session=...`**
   - ✅ **Response is 200 OK with valid data**

3. Confirm Board Studio loads boards and frames normally
   - ✅ **Boards load correctly**
   - ✅ **Frames render properly**
   - ✅ **No authentication errors in console**

### Test 2: CLI/Tools - Header Auth Works
**Environment:** Production API (api.ke3p.com)

```bash
# Valid token should work (no Origin header = CLI/tool)
curl -H "Authorization: Bearer <VALID_TOKEN>" \
     https://api.ke3p.com/api/kam/auth/me
```
- ✅ **Response: 200 OK with user data**

### Test 3: Browser with Spoofed Header - Should Fail
**Environment:** Production API (api.ke3p.com)

```bash
# Browser Origin + bad token = should fail (header ignored, no cookie)
curl -H "Origin: https://www.ke3p.com" \
     -H "Authorization: Bearer INVALID_TOKEN" \
     https://api.ke3p.com/api/kam/auth/me
```
- ✅ **Response: 401 Unauthorized** (header ignored for browser origin)

### Test 4: CLI Header with X-Client
**Environment:** Production API

```bash
# X-Client: cli forces header auth even with Origin
curl -H "Origin: https://www.ke3p.com" \
     -H "X-Client: cli" \
     -H "Authorization: Bearer <VALID_TOKEN>" \
     https://api.ke3p.com/api/kam/auth/me
```
- ✅ **Response: 200 OK** (X-Client: cli allows header auth)

---

## 🐛 Debug Switches

### Frontend Debug Flags

Add to `.env.local` or build-time env vars:

```bash
# Enable console logging for fetch shim
VITE_FETCH_SHIM_DEBUG=1

# Allow header auth in a production build (NOT for actual prod deployment)
VITE_ALLOW_HEADER_AUTH=1
```

### Backend Debug

```bash
# Force header auth from browser (for testing)
# Send in request headers:
X-Client: cli
```

---

## 📸 Required Evidence

### Screenshot 1: Network Tab
- Show API request (e.g., `/api/domains/my`)
- Request Headers section visible
- ✅ No Authorization header
- ✅ Cookie: keeper_session=... visible

### Screenshot 2: Response
- Same API request
- ✅ Status: 200 OK
- ✅ Valid JSON response

### Screenshot 3: Application Tab
- DevTools → Application → Cookies
- ✅ Show `keeper_session` cookie with:
  - Domain: `.ke3p.com`
  - HttpOnly: ✓
  - Secure: ✓
  - SameSite: `Lax` (or `None` for previews)

---

## 🚨 Rollback Plan

If issues arise:

### Frontend Rollback
1. Set `VITE_ALLOW_HEADER_AUTH=1` in production env vars
2. Redeploy frontend
3. This re-enables header auth temporarily

### Backend Rollback
Revert `apps/api/src/kam/session.ts` authWeb function to:
```typescript
export function authWeb(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken || '';
  // ... rest of function
}
```

---

## 🎯 Success Criteria

- [ ] All Test 1 checkboxes pass (Web browser uses cookies only)
- [ ] All Test 2 checkboxes pass (CLI/tools can use header auth)
- [ ] All Test 3 checkboxes pass (Browser can't spoof header auth)
- [ ] All Test 4 checkboxes pass (X-Client: cli override works)
- [ ] No authentication errors in production logs
- [ ] Board Studio fully functional
- [ ] Screenshots provided showing network tab evidence

---

## 📝 Notes

### Architecture
- **Frontend:** Global fetch shim intercepts all fetch calls before they leave the browser
- **Backend:** Express middleware inspects Origin header to detect browser vs. CLI requests
- **Security:** Defense in depth - both layers enforce cookie-only for browsers

### Edge Cases Covered
- Extensions/libraries trying to inject Authorization headers → stripped in PROD
- Old tokens in localStorage → auto-cleaned on PROD load
- Preview deployments → SameSite=None with secure cookie
- CLI tools → header auth still works (no Origin header)
- Testing → X-Client: cli escape hatch for hybrid scenarios

### Future Enhancements
- [ ] Add server-side token blacklist for early invalidation
- [ ] Consider session versioning for forced re-auth
- [ ] Monitor for suspicious header auth attempts from browser Origins
- [ ] Add telemetry for auth method usage (cookie vs. header)

---

## 📞 Contact

Questions or issues? Ping Kip or check:
- Frontend: `apps/web/src/boot/fetch-shim.ts`
- Backend: `apps/api/src/kam/session.ts`
- Docs: `/docs/modules/kam.md`, `/docs/modules/boot.md`

