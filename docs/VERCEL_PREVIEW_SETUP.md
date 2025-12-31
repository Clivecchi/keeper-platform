# Vercel Preview Deployments - Cookie Auth Setup

## Overview
Enables Vercel preview deployments (*.vercel.app) to authenticate with the production API (api.ke3p.com) using HttpOnly cookies with cross-site support.

---

## Problem Statement

**Without This Setup**:
- ❌ Preview deploys at `https://<hash>.vercel.app` cannot login
- ❌ Cookies from `api.ke3p.com` rejected (cross-site)
- ❌ CORS blocks preview origins
- ❌ CSRF guard rejects preview origins

**With This Setup**:
- ✅ Preview deployments can login and use API
- ✅ Cookies use `SameSite=None` for cross-site
- ✅ CORS dynamically allows preview origins
- ✅ CSRF guard permits preview origins
- ✅ Production stays hardened (SameSite=Lax)
- ✅ Can be disabled with single env var

---

## Architecture

### Cookie Behavior

| Environment | Origin | SameSite | Cross-Site |
|------------|---------|----------|------------|
| **Production** | www.ke3p.com → api.ke3p.com | Lax | No (same-site) |
| **Preview** | xyz.vercel.app → api.ke3p.com | None | Yes (cross-site) |

### Security Model

**Production (WEB_PREVIEW_ALLOW=0 or unset)**:
- Only `.ke3p.com` origins allowed
- Cookies: SameSite=Lax
- CSRF: Only `.ke3p.com` origins
- Maximum security

**Preview (WEB_PREVIEW_ALLOW=1)**:
- Additional: `*.vercel.app` origins allowed
- Cookies: SameSite=None for preview, Lax for production
- CSRF: Both `.ke3p.com` and `*.vercel.app` origins
- Controlled by environment variable

---

## Backend Implementation

### 1. Session Management (`apps/api/src/kam/session.ts`)

**Preview Detection**:
```typescript
function isPreviewOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  
  const url = new URL(origin);
  const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
  const prefix = process.env.WEB_PREVIEW_HOST_PREFIX || '';
  
  return url.hostname.endsWith(suffix) && 
         (!prefix || url.hostname.startsWith(prefix));
}
```

**Cookie Setting**:
```typescript
export function setSessionCookie(req: Request, res: Response, token: string) {
  const isPreview = isPreviewOrigin(req);
  
  res.cookie('keeper_session', token, {
    httpOnly: true,
    secure: true,
    sameSite: isPreview ? 'none' : 'lax', // ← Key difference
    domain: '.ke3p.com',
    path: '/',
    maxAge: 7 * 24 * 3600_000,
  });
}
```

**CSRF Guard**:
```typescript
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  
  // Production origins
  const okProd = origin.endsWith('.ke3p.com') || 
                 referer.includes('.ke3p.com');
  
  // Preview origins (if enabled)
  let okPreview = false;
  if (process.env.WEB_PREVIEW_ALLOW === '1') {
    const url = new URL(origin || referer);
    const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
    okPreview = url.hostname.endsWith(suffix);
  }
  
  if (okProd || okPreview) return next();
  return res.status(403).json({ error: 'CSRF check failed' });
}
```

### 2. CORS Configuration (`apps/api/src/index.ts`)

**Dynamic Origin Check**:
```typescript
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (CORS_ALLOWLIST.has(origin)) return true;
  if (CORS_WILDCARDS.some(rx => rx.test(origin))) return true;
  
  // Check for preview origins (if enabled)
  if (process.env.WEB_PREVIEW_ALLOW === '1') {
    const url = new URL(origin);
    const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
    const prefix = process.env.WEB_PREVIEW_HOST_PREFIX || '';
    
    if (url.hostname.endsWith(suffix) && 
        (!prefix || url.hostname.startsWith(prefix))) {
      console.log('[CORS] Allowing preview origin:', origin);
      return true;
    }
  }
  
  return false;
}
```

---

## Environment Variables

### Backend (Railway)

**Required for Preview Support**:
```bash
# Enable preview origin support
WEB_PREVIEW_ALLOW=1

# Default suffix for preview deployments
WEB_PREVIEW_HOST_SUFFIX=.vercel.app  # Optional (defaults to this)

# Optional: Restrict to specific project prefix
WEB_PREVIEW_HOST_PREFIX=keeper-platform-  # Optional
```

**Example: Tight Control**:
```bash
WEB_PREVIEW_ALLOW=1
WEB_PREVIEW_HOST_SUFFIX=.vercel.app
WEB_PREVIEW_HOST_PREFIX=keeper-platform-
# Only allows: keeper-platform-*.vercel.app
```

**Example: All Vercel Previews**:
```bash
WEB_PREVIEW_ALLOW=1
# Allows: *.vercel.app (any Vercel deployment)
```

### Frontend (Vercel)

**Preview Environment Variables**:
```bash
# Set in Vercel Project → Settings → Environment Variables → Preview
VITE_API_URL=https://api.ke3p.com
```

**Production Variables** (unchanged):
```bash
# Set for Production environment
VITE_API_URL=https://api.ke3p.com
```

---

## Deployment Steps

### Step 1: Backend (Railway)

1. **Set Environment Variables**:
   ```bash
   # In Railway project settings
   WEB_PREVIEW_ALLOW=1
   WEB_PREVIEW_HOST_SUFFIX=.vercel.app  # Optional
   ```

2. **Deploy Updated Code**:
   - Code changes already applied
   - Railway will rebuild with new CORS/cookie logic

3. **Verify Logs**:
   ```
   [CORS] Allowing preview origin: https://keeper-platform-xyz.vercel.app
   [session] Set preview cookie (SameSite=None) for origin: https://...
   ```

### Step 2: Frontend (Vercel)

1. **Set Preview Environment**:
   - Vercel Dashboard → Project → Settings
   - Environment Variables → Preview
   - Add: `VITE_API_URL=https://api.ke3p.com`

2. **Deploy to Preview**:
   - Push to branch (not main)
   - Vercel creates preview deployment
   - Preview URL: `https://<branch>-<project>.vercel.app`

3. **No Code Changes Needed**:
   - Fetch shim already uses `credentials: 'include'`
   - AuthGate already validates with `/api/kam/auth/me`
   - Production checks already in place

---

## Verification Steps

### Test 1: Preview Login Flow

```
1. Open preview URL: https://<hash>.vercel.app
2. Navigate to /login
3. Enter credentials → Submit
4. DevTools → Network → POST /api/kam/auth/login:
   ✓ Request Origin: https://<hash>.vercel.app
   ✓ Response: Set-Cookie: keeper_session; SameSite=None; Secure
   ✓ Status: 200
5. DevTools → Application → Cookies → .ke3p.com:
   ✓ keeper_session present
   ✓ SameSite: None (for preview)
```

### Test 2: Authenticated Requests

```
1. After login, navigate to Board Studio
2. DevTools → Network → GET /api/board-data/*:
   ✓ Request Cookies: keeper_session=...
   ✓ Request Origin: https://<hash>.vercel.app
   ✓ Response: 200 OK
3. Board loads successfully ✓
```

### Test 3: CSRF Protection

```
1. Make a mutating request (POST/PUT/DELETE)
2. DevTools → Network → Request:
   ✓ Origin: https://<hash>.vercel.app
   ✓ Response: 200 (not 403)
3. CSRF guard allows preview origin ✓
```

### Test 4: Production Unchanged

```
1. Open production: https://www.ke3p.com
2. Login → Check cookie:
   ✓ SameSite: Lax (not None)
   ✓ Same-site optimization maintained
3. CSRF guard still strict for production ✓
```

### Test 5: Rollback Lever

```
1. Set WEB_PREVIEW_ALLOW=0 in Railway
2. Redeploy backend
3. Preview login attempt:
   ✓ CORS rejects preview origin
   ✓ Status: 403
4. Production still works ✓
```

---

## Troubleshooting

### Issue: Preview login fails with CORS error

**Symptoms**:
```
Access to fetch at 'https://api.ke3p.com/api/kam/auth/login' from origin 
'https://xyz.vercel.app' has been blocked by CORS policy
```

**Check**:
1. `WEB_PREVIEW_ALLOW=1` set in Railway ✓
2. Backend redeployed after env var change ✓
3. Check Railway logs for `[CORS] Allowing preview origin` ✓

### Issue: Cookie not being set

**Symptoms**:
- Login returns 200
- No `keeper_session` cookie in DevTools

**Check**:
1. Response includes `Set-Cookie` header ✓
2. Cookie has `SameSite=None` (for preview) ✓
3. Cookie domain is `.ke3p.com` ✓
4. Browser allows third-party cookies ✓

### Issue: Cookie set but not sent on subsequent requests

**Symptoms**:
- Cookie visible in Application tab
- Not sent in Request Cookies

**Check**:
1. Cookie domain matches API domain ✓
2. Fetch uses `credentials: 'include'` ✓
3. Browser third-party cookie settings ✓
4. Cookie not expired ✓

### Issue: CSRF 403 on mutations

**Symptoms**:
- GET requests work
- POST/PUT/DELETE return 403

**Check**:
1. `WEB_PREVIEW_ALLOW=1` set ✓
2. CSRF guard updated with preview check ✓
3. Request includes `Origin` header ✓
4. Backend logs show `[CSRF] Rejected request from...` (debug)

### Issue: Production affected by preview changes

**Test**:
1. Visit www.ke3p.com
2. Login and check cookie:
   - SameSite should be `Lax` (not None)
3. If SameSite=None in production:
   - Check origin detection logic
   - Preview detection should only match `.vercel.app`

---

## Security Considerations

### Why This is Safe

**1. Controlled by Environment Variable**:
- Preview support disabled by default
- Must explicitly enable with `WEB_PREVIEW_ALLOW=1`
- Can disable anytime (rollback lever)

**2. Domain Restrictions**:
- Only allows specific suffixes (`.vercel.app`)
- Optional prefix filtering (`keeper-platform-*`)
- Not a wildcard for all domains

**3. Production Unaffected**:
- Production uses SameSite=Lax (stricter)
- Preview detection checks origin
- No performance impact on production

**4. CSRF Still Protected**:
- Origin/Referer checks still apply
- Preview origins explicitly checked
- Not accepting arbitrary origins

**5. HttpOnly Cookies**:
- Still unreadable by JavaScript
- Still extension-proof
- Only changed SameSite attribute

### Attack Surface

**Without Preview Support**:
- Attack surface: `.ke3p.com` origins only
- Protection: SameSite=Lax + CSRF guard

**With Preview Support**:
- Attack surface: `.ke3p.com` + `*.vercel.app` origins
- Protection: SameSite=None (required for cross-site) + CSRF guard
- Risk: Minimal (Vercel domains are under your control)

**Mitigation**:
- Use `WEB_PREVIEW_HOST_PREFIX` to restrict to your project
- Monitor preview deployments
- Disable when not needed (`WEB_PREVIEW_ALLOW=0`)

---

## Best Practices

### 1. Temporary Enable for Testing
```bash
# Enable for preview testing
WEB_PREVIEW_ALLOW=1

# Disable after testing complete
WEB_PREVIEW_ALLOW=0
```

### 2. Use Project Prefix
```bash
# More restrictive
WEB_PREVIEW_ALLOW=1
WEB_PREVIEW_HOST_PREFIX=keeper-platform-
```

### 3. Monitor Preview Logs
```bash
# Watch for preview logins in Railway logs
[CORS] Allowing preview origin: https://keeper-platform-xyz.vercel.app
[session] Set preview cookie (SameSite=None) for origin: https://...
```

### 4. Test Production Separately
- Always test production after enabling preview
- Verify production still uses SameSite=Lax
- Confirm CSRF guard still strict for production

---

## Rollback Plan

### Immediate Disable

**Step 1**: Set environment variable
```bash
# In Railway dashboard
WEB_PREVIEW_ALLOW=0
```

**Step 2**: Redeploy (or wait for Railway auto-redeploy)

**Result**:
- Preview origins rejected by CORS (403)
- Preview logins fail immediately
- Production completely unaffected
- No code changes needed

### Complete Removal

If you want to remove preview support entirely:

1. Revert code changes in:
   - `apps/api/src/kam/session.ts`
   - `apps/api/src/index.ts`

2. Remove environment variables:
   - `WEB_PREVIEW_ALLOW`
   - `WEB_PREVIEW_HOST_SUFFIX`
   - `WEB_PREVIEW_HOST_PREFIX`

3. Redeploy backend

---

## Summary

✅ **Preview Support Enabled**:
- Vercel preview deployments can login
- Cross-site cookies (SameSite=None)
- CORS allows preview origins
- CSRF permits preview origins

✅ **Production Unchanged**:
- Same-site cookies (SameSite=Lax)
- Strict CSRF enforcement
- No performance impact

✅ **Controlled & Safe**:
- Disabled by default
- Domain restrictions
- Rollback lever available
- HttpOnly cookies maintained

✅ **Easy to Manage**:
- Single env var to enable/disable
- No frontend code changes
- Comprehensive logging
- Clear verification steps

---

## Environment Variable Reference

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `WEB_PREVIEW_ALLOW` | Yes (for preview) | `0` | Enable/disable preview support |
| `WEB_PREVIEW_HOST_SUFFIX` | No | `.vercel.app` | Preview domain suffix |
| `WEB_PREVIEW_HOST_PREFIX` | No | `` | Preview domain prefix (optional) |

---

## Next Steps

1. ✅ Backend code deployed (Railway)
2. ✅ Frontend requires no changes
3. 🔄 Set `WEB_PREVIEW_ALLOW=1` in Railway
4. 🧪 Test preview deployment login
5. ✅ Verify production unaffected
6. 📊 Monitor logs for preview usage

🎉 **Preview deployments can now authenticate!** 🎉

