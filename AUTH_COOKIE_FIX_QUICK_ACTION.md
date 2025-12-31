# Quick Action: Fix Cookie Authentication (2025-10-15)

## 🚨 Immediate Actions Required

### Action 1: Verify COOKIE_DOMAIN in Railway ⏱️ 2 minutes

**Priority**: ⭐⭐⭐ CRITICAL

**Steps**:
1. Go to Railway dashboard → Your project → Environment Variables
2. Find `COOKIE_DOMAIN` variable
3. **Check the value**:
   - ✅ Should be: `.ke3p.com` (with leading dot)
   - ❌ NOT: `api.ke3p.com`, `ke3p.com`, `""` (empty), or anything else

**If missing or incorrect**:
```bash
# Add/update this EXACT value:
COOKIE_DOMAIN=.ke3p.com
```

4. **Redeploy** the API service in Railway
5. **Wait** for deployment to complete (~2-3 minutes)

---

### Action 2: Test Login Flow ⏱️ 5 minutes

**After Railway redeploy**:

1. **Open browser** (Chrome/Edge recommended)
2. Go to `https://www.ke3p.com`
3. **Open DevTools** (F12)
4. Go to **Network tab**
5. **Check "Preserve log"**
6. **Login** with test credentials

**What to check**:

#### A. In Network Tab:
1. Find `POST /api/kam/auth/login` request
2. Click on it
3. Go to **Response Headers** section
4. Look for `Set-Cookie` header

**Expected**:
```
Set-Cookie: keeper_session=eyJhbGc...; Domain=.ke3p.com; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800
```

#### B. In Application Tab:
1. Go to **Application** → **Cookies**
2. Check both:
   - `https://www.ke3p.com`
   - `https://api.ke3p.com`

**Expected**:
- Cookie name: `keeper_session`
- Domain: `.ke3p.com`
- Path: `/`
- HttpOnly: ✓
- Secure: ✓
- SameSite: `None`
- Expires: ~7 days from now

#### C. Test Protected Endpoint:
1. Stay in same browser tab after login
2. Go to **Console** tab
3. Run:
```javascript
fetch('https://api.ke3p.com/api/kam/me', {credentials: 'include'})
  .then(r => r.json())
  .then(console.log)
```

**Expected**: `{ user: { id: "...", email: "...", ... } }`
**If 401**: Cookie issue persists

---

### Action 3: Run Diagnostic Script (Optional) ⏱️ 3 minutes

**If you have test credentials**:

```bash
chmod +x diagnose-cookie-auth.sh
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpass ./diagnose-cookie-auth.sh
```

This will:
- ✅ Test API reachability
- ✅ Check CORS configuration
- ✅ Attempt login
- ✅ Verify Set-Cookie header
- ✅ Test authenticated endpoints
- 📊 Provide diagnostic summary

---

## 📋 Quick Checklist

After deploying COOKIE_DOMAIN fix:

- [ ] Railway env var `COOKIE_DOMAIN=.ke3p.com` is set
- [ ] API service redeployed
- [ ] Login returns 200 OK
- [ ] `Set-Cookie` header present in login response
- [ ] Cookie visible in DevTools → Application → Cookies
- [ ] Cookie domain is `.ke3p.com` (with leading dot)
- [ ] Cookie has `SameSite=None` and `Secure=true`
- [ ] `GET /api/kam/me` returns 200 OK (not 401)
- [ ] `GET /api/domains/my` returns 200 OK (not 401)
- [ ] App functions normally after login

---

## 🔍 If Still Failing

### Scenario A: Set-Cookie Header Still Missing

**Possible causes**:
1. Railway deployment didn't pick up env var → Redeploy again
2. Railway proxy stripping headers → Add debug logging (see below)
3. Express not emitting cookie → Add debug logging (see below)

**Add Debug Logging**:

Edit `apps/api/src/kam/session.ts`:

```typescript
export function setSessionCookie(req: Request, res: Response, token: string) {
  console.log('🔍 [DEBUG] setSessionCookie called:', {
    cookieName: COOKIE_NAME,
    domain: DOMAIN,
    domainFromEnv: process.env.COOKIE_DOMAIN,
    origin: req.headers.origin,
  });
  
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: DOMAIN,
    path: '/',
    maxAge: 7 * 24 * 3600_000,
  });
  
  console.log('🔍 [DEBUG] Set-Cookie header:', res.getHeader('set-cookie'));
}
```

**Deploy and check Railway logs** after login attempt.

---

### Scenario B: Set-Cookie Present but Cookie Not Stored

**Possible causes**:
1. Domain mismatch (e.g., `api.ke3p.com` instead of `.ke3p.com`)
2. Browser rejecting `SameSite=None` without HTTPS
3. Mixed content (HTTP/HTTPS mismatch)

**Check**:
- Ensure Railway is using HTTPS (it should be by default)
- Verify domain in Set-Cookie has leading dot: `.ke3p.com`
- Check browser console for cookie warnings

---

### Scenario C: Cookie Stored but Not Sent to API

**Possible causes**:
1. Frontend not using `credentials: 'include'`
2. CORS not allowing credentials
3. Cookie domain doesn't match request host

**Verify**:
```javascript
// In browser console on www.ke3p.com:
document.cookie  // Should show keeper_session

// Check if cookie is sent:
fetch('https://api.ke3p.com/api/kam/me', {
  credentials: 'include'  // This MUST be present
}).then(r => r.text()).then(console.log)
```

---

### Scenario D: Cookie Sent but Middleware Doesn't Recognize It

**Check**:
1. Ensure `cookieParser()` is installed (it is, line 296 in index.ts)
2. Ensure `attachUser` checks for `keeper_session` (it does, line 5 in middleware/auth.ts)

**Add Debug Logging**:

Edit `apps/api/src/middleware/auth.ts`:

```typescript
function getToken(req: Request): string | null {
  const cookies = (req as any).cookies || {};
  console.log('🔍 [DEBUG] getToken cookies:', Object.keys(cookies));
  
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  
  for (const name of COOKIE_CANDIDATES) {
    if (cookies[name]) {
      console.log('🔍 [DEBUG] Found cookie:', name);
      return cookies[name];
    }
  }
  
  console.log('🔍 [DEBUG] No token found');
  return null;
}
```

---

## 📞 Need Help?

**Review full analysis**: `AUTH_SESSION_COOKIE_ROOT_CAUSE_ANALYSIS.md`

**Key findings**:
- ✅ Code is correct
- ✅ Frontend is correct
- ✅ Middleware is correct
- ❌ **Most likely**: `COOKIE_DOMAIN` env var issue

**Next steps if still failing**:
1. Check Railway logs for debug output
2. Capture full network trace (HAR file)
3. Test with curl (see diagnostic script)
4. Verify JWT_SECRET is set in Railway

---

## ✅ Success Criteria

After fix is applied:

1. Login at www.ke3p.com returns 200 OK
2. Set-Cookie header present in login response
3. keeper_session cookie stored in browser with domain `.ke3p.com`
4. Subsequent API calls include Cookie header
5. Protected endpoints return 200 OK (not 401)
6. App functions normally (boards load, etc.)

---

**Date**: 2025-10-15
**Status**: Awaiting Railway env var verification

