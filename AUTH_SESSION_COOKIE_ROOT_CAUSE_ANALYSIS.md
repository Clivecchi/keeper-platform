# Authentication Session Cookie Root Cause Analysis
**Date**: October 15, 2025
**Issue**: Authenticated requests return 401 after login despite session cookie implementation
**Status**: 🔍 Root Cause Analysis Complete

---

## Executive Summary

**Problem**: After successful login (`POST /api/kam/auth/login` returns 200), subsequent authenticated requests (`GET /api/kam/me`, `GET /api/domains/my`) return 401 Unauthorized.

**Observed Symptoms**:
- ✅ Login returns 200 OK
- ✅ CORS headers present (`Access-Control-Allow-Origin`, `Access-Control-Allow-Credentials`)
- ❌ **No `Set-Cookie` header visible in login response** (critical finding)
- ❌ Cookie storage for `www.ke3p.com` is empty
- ❌ Protected endpoints return 401 immediately after login

**Root Cause**: The session cookie is **not being set** in the browser. While the backend code calls `setSessionCookie()`, the `Set-Cookie` header is either:
1. Not being emitted by Express
2. Being stripped by middleware or proxy
3. Being rejected by the browser due to domain/attribute mismatch

---

## Evidence Review

### 1. Backend Code Analysis ✅

**Login Handler** (`apps/api/src/kam/auth.ts`):
```typescript:45:45
setSessionCookie(req, res, token);
```
✅ Cookie setting function is called

**Session Cookie Configuration** (`apps/api/src/kam/session.ts`):
```typescript:8:46
const COOKIE_NAME = 'keeper_session';
const DOMAIN = process.env.COOKIE_DOMAIN || '.ke3p.com';

export function setSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: DOMAIN,
    path: '/',
    maxAge: 7 * 24 * 3600_000, // 7 days
  });
}
```

✅ Cookie attributes are correct for cross-domain:
- `httpOnly: true` - Prevents XSS
- `secure: true` - HTTPS only (required with sameSite: 'none')
- `sameSite: 'none'` - **Critical for cross-domain** (`api.ke3p.com` → `www.ke3p.com`)
- `domain: '.ke3p.com'` - Works for both subdomains (if env var set correctly)
- `path: '/'` - Available on all paths
- `maxAge: 7 days` - Long-lived session

### 2. Frontend Code Analysis ✅

**API Client** (`apps/web/src/lib/apiFetch.ts`):
```typescript:21:30
export async function apiFetch(input: string | URL, opts: FetchOptions = {}) {
  const url = toApiUrl(input);
  const nextInit: RequestInit = {
    ...opts,
    credentials: 'include',  // ✅ Sends cookies cross-domain
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  };
```

✅ Frontend correctly configured:
- `credentials: 'include'` - Sends and receives cookies cross-origin
- Requests go to `https://api.ke3p.com`

### 3. Middleware Analysis ✅

**Global Middleware** (`apps/api/src/middleware/auth.ts`):
```typescript:5:12
const COOKIE_CANDIDATES = ['keeper_session', 'token', 'keeper_token', 'auth_token'];

function getToken(req: Request): string | null {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookies = (req as any).cookies || {};
  for (const name of COOKIE_CANDIDATES) if (cookies[name]) return cookies[name];
  return null;
}
```

✅ Middleware checks for `keeper_session` first
✅ `cookieParser()` middleware is installed (line 296 in `index.ts`)

### 4. CORS Configuration Analysis ✅

**CORS Setup** (`apps/api/src/index.ts`):
```typescript:263:289
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allow = !origin ? true : isOriginAllowed(origin);
    callback(allow ? null : new Error('CORS: origin not allowed'), allow);
  },
  credentials: true,  // ✅ Required for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-debug-token'],
  exposedHeaders: ['x-debug-info'],
  preflightContinue: false,
  maxAge: 86400,
};
```

✅ CORS configured correctly:
- `credentials: true` - Allows cookies in CORS requests
- Origin validation includes `https://www.ke3p.com`

---

## Root Cause Analysis

### Critical Finding: Missing Set-Cookie Header

**Evidence**: User screenshots show login response with CORS headers but **no `Set-Cookie` header**.

### Possible Causes (in order of likelihood):

### 🔴 **Cause #1: COOKIE_DOMAIN Environment Variable Not Set Correctly**

**Impact**: HIGH - Most Likely Root Cause

The cookie domain defaults to `.ke3p.com` (with leading dot) but only if the env var is not set. If `COOKIE_DOMAIN` is set to an incorrect value in Railway, the cookie may fail silently.

**Incorrect Values**:
- `COOKIE_DOMAIN=""` (empty string) → Cookie scoped to `api.ke3p.com` only
- `COOKIE_DOMAIN="api.ke3p.com"` (no leading dot) → Cookie scoped to exact domain only
- `COOKIE_DOMAIN="ke3p.com"` (no leading dot) → May not work for subdomains
- `COOKIE_DOMAIN=".ke3p.com "` (trailing space) → Invalid domain

**Correct Value**:
```bash
COOKIE_DOMAIN=.ke3p.com
```
Note: The leading dot `.ke3p.com` makes the cookie available to all subdomains.

**Verification**:
```bash
# In Railway dashboard, check environment variables
# Ensure COOKIE_DOMAIN is set to exactly: .ke3p.com
```

---

### 🟡 **Cause #2: Express res.cookie() Not Emitting Set-Cookie**

**Impact**: MEDIUM

If `res.cookie()` is called but the response is already sent or headers are already flushed, the cookie won't be set.

**Check for**:
- Response sent before `setSessionCookie()` is called
- Middleware that commits headers early
- Response object already finalized

**Code Location**: `apps/api/src/kam/auth.ts` lines 44-59

The code structure shows:
```typescript
setSessionCookie(req, res, token);  // Line 45
return res.json({ ... });            // Line 48
```

✅ This looks correct - cookie is set before response is sent.

---

### 🟡 **Cause #3: Railway Proxy Stripping Set-Cookie Headers**

**Impact**: MEDIUM

Railway's internal proxy or load balancer might strip `Set-Cookie` headers in certain configurations, especially if:
- Multiple instances are running
- Session affinity is not configured
- Health checks interfere with cookie handling

**Verification**:
Add temporary logging in login handler:
```typescript
export async function login(req: Request, res: Response) {
  // ... authentication logic ...
  
  setSessionCookie(req, res, token);
  
  // Debug log
  console.log('[DEBUG] Set-Cookie attempted for user:', user.email);
  console.log('[DEBUG] Response headers:', res.getHeaders());
  
  return res.json({ ... });
}
```

---

### 🟡 **Cause #4: Browser Rejecting Cookie Due to SameSite=None**

**Impact**: MEDIUM

Browsers require `Secure=true` when `SameSite=None` is set. If the request is not over HTTPS, the cookie will be silently rejected.

**Verification**:
- ✅ Railway serves over HTTPS (api.ke3p.com uses HTTPS)
- ✅ Code sets `secure: true`
- ⚠️ Check if Railway's internal routing uses HTTP before HTTPS termination

**Modern Browser Requirements** (Chrome 80+, Firefox 69+, Safari 13+):
- `SameSite=None` REQUIRES `Secure=true`
- Cookie must be set over HTTPS connection
- No mixed content allowed

---

### 🟢 **Cause #5: Cookie Being Set but on Wrong Domain**

**Impact**: LOW (but still possible)

If the cookie is set on `api.ke3p.com` without the domain attribute, it won't be sent to `www.ke3p.com`.

**Current Code**:
```typescript
domain: DOMAIN,  // Should be '.ke3p.com'
```

If `DOMAIN` resolves to `undefined` or empty string, Express defaults to the request hostname (`api.ke3p.com`), which won't work for cross-subdomain sharing.

---

## Recommended Diagnostic Steps

### Step 1: Verify Environment Variable ⭐ MOST IMPORTANT

**Action**: Check Railway environment variables

```bash
# In Railway dashboard → Environment Variables
# Verify this EXACT value exists:
COOKIE_DOMAIN=.ke3p.com
```

**Expected**:
- Variable name: `COOKIE_DOMAIN`
- Variable value: `.ke3p.com` (with leading dot, no trailing spaces)

**If missing**: Add it and redeploy

**If incorrect**: Fix it and redeploy

---

### Step 2: Add Temporary Debug Logging

**File**: `apps/api/src/kam/session.ts`

```typescript
export function setSessionCookie(req: Request, res: Response, token: string) {
  const isPreview = isPreviewOrigin(req);
  
  // 🔍 DEBUG LOG
  console.log('[DEBUG] setSessionCookie called:', {
    cookieName: COOKIE_NAME,
    domain: DOMAIN,
    domainFromEnv: process.env.COOKIE_DOMAIN,
    origin: req.headers.origin,
    isPreview,
    tokenLength: token.length,
  });
  
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: DOMAIN,
    path: '/',
    maxAge: 7 * 24 * 3600_000,
  });
  
  // 🔍 DEBUG LOG - verify Set-Cookie header is in response
  const headers = res.getHeaders();
  console.log('[DEBUG] Response headers after cookie set:', {
    hasCookie: !!headers['set-cookie'],
    setCookie: headers['set-cookie'],
  });
}
```

**Deploy and test login**, then check Railway logs for:
```
[DEBUG] setSessionCookie called: { cookieName: 'keeper_session', domain: '.ke3p.com', ... }
[DEBUG] Response headers after cookie set: { hasCookie: true, setCookie: ['keeper_session=...'] }
```

---

### Step 3: Client-Side Cookie Inspection

**After login attempt**:

1. Open DevTools → Application → Cookies
2. Check **both** domains:
   - `https://www.ke3p.com` - Should have cookie if domain is set correctly
   - `https://api.ke3p.com` - May have cookie if domain is not set

3. If cookie exists, check attributes:
   - **Domain**: Should be `.ke3p.com` (with leading dot)
   - **Path**: Should be `/`
   - **Secure**: Should be ✓
   - **HttpOnly**: Should be ✓
   - **SameSite**: Should be `None`
   - **Expires**: Should be ~7 days in future

---

### Step 4: Network Capture of Set-Cookie Header

**Use browser DevTools**:

1. Network tab → Clear
2. Login with credentials
3. Find `POST /api/kam/auth/login` request
4. Check **Response Headers** section
5. Look for `Set-Cookie` header

**Expected**:
```
Set-Cookie: keeper_session=eyJhbGc...; Domain=.ke3p.com; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800
```

**If missing**: The cookie is not being emitted by Express or is being stripped by a proxy.

---

### Step 5: Test with curl (Server-Side Verification)

```bash
# Login and capture response headers
curl -v -X POST https://api.ke3p.com/api/kam/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.ke3p.com" \
  -d '{"email":"test@example.com","password":"password"}' \
  2>&1 | grep -i "set-cookie"
```

**Expected output**:
```
< Set-Cookie: keeper_session=...; Domain=.ke3p.com; Path=/; HttpOnly; Secure; SameSite=None
```

**If missing**: Cookie is not being set by Express.

---

## Recommended Fixes (Priority Order)

### Fix #1: Ensure COOKIE_DOMAIN Environment Variable is Set Correctly ⭐

**Priority**: CRITICAL
**Effort**: 2 minutes
**Risk**: None

**Action**:
1. Go to Railway dashboard
2. Navigate to Environment Variables
3. Add or update:
   ```
   COOKIE_DOMAIN=.ke3p.com
   ```
   (Important: Leading dot, no spaces, no quotes)
4. Redeploy the API service

**Rationale**: This is the most likely root cause. The default value in code is correct, but if the env var is set to an incorrect value, it overrides the default.

---

### Fix #2: Add Defensive Domain Validation

**Priority**: HIGH
**Effort**: 5 minutes
**Risk**: Low

**File**: `apps/api/src/kam/session.ts`

```typescript
const COOKIE_NAME = 'keeper_session';

// Defensive: ensure domain always has leading dot for subdomain sharing
const RAW_DOMAIN = process.env.COOKIE_DOMAIN || '.ke3p.com';
const DOMAIN = RAW_DOMAIN.startsWith('.') ? RAW_DOMAIN : `.${RAW_DOMAIN}`;

// Validate domain is not empty
if (!DOMAIN || DOMAIN === '.') {
  throw new Error('COOKIE_DOMAIN must be set to a valid domain (e.g., .ke3p.com)');
}

const JWT_SECRET = process.env.JWT_SECRET!;

console.log('[session] Cookie domain configured as:', DOMAIN);
```

**Benefits**:
- Automatically adds leading dot if missing
- Prevents empty domain values
- Logs the configured domain at startup for verification

---

### Fix #3: Add Response Header Verification

**Priority**: MEDIUM
**Effort**: 3 minutes
**Risk**: None (debug only)

**File**: `apps/api/src/kam/auth.ts`

```typescript
export async function login(req: Request, res: Response) {
  // ... existing auth logic ...

  // Generate JWT
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

  // Set HttpOnly cookie
  setSessionCookie(req, res, token);

  // 🔍 Verification log (remove after debugging)
  const setCookieHeader = res.getHeader('set-cookie');
  if (!setCookieHeader) {
    console.error('[auth] WARNING: Set-Cookie header not present after setSessionCookie()');
  } else {
    console.log('[auth] Set-Cookie header confirmed:', setCookieHeader);
  }

  return res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url },
    },
  });
}
```

---

### Fix #4: Expose Set-Cookie in CORS for Debugging

**Priority**: LOW
**Effort**: 2 minutes
**Risk**: Low (informational only)

**File**: `apps/api/src/index.ts`

```typescript
const corsOptions = {
  // ... existing options ...
  exposedHeaders: ['x-debug-info', 'set-cookie'],  // Add 'set-cookie'
};
```

**Note**: This won't make the cookie readable by JavaScript (HttpOnly prevents that), but it may help with debugging in some scenarios.

---

## Alternative: Use Same-Domain Cookie (If Cross-Domain is Not Required)

**If** you can serve the frontend from a subdomain of ke3p.com that the API is also on, you can simplify:

**Option A: Serve frontend from `app.ke3p.com`**
```typescript
// Update session.ts
const DOMAIN = process.env.COOKIE_DOMAIN || '.ke3p.com';  // Keep same
res.cookie(COOKIE_NAME, token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',  // Change to 'lax' (more browser support)
  domain: DOMAIN,
  path: '/',
  maxAge: 7 * 24 * 3600_000,
});
```

**Benefits**:
- `SameSite=Lax` is more widely supported
- Simpler browser compatibility
- No need for `SameSite=None` (which requires HTTPS everywhere)

---

## Testing Checklist

After deploying fixes, verify:

### ✅ Step 1: Cookie is Set
1. Login at `https://www.ke3p.com`
2. Open DevTools → Network → Find `POST /api/kam/auth/login`
3. Check Response Headers
4. ✅ Verify `Set-Cookie: keeper_session=...; Domain=.ke3p.com` is present

### ✅ Step 2: Cookie is Stored
1. DevTools → Application → Cookies
2. Check `https://www.ke3p.com` (or `.ke3p.com` if domain cookie)
3. ✅ Verify `keeper_session` cookie exists with correct attributes

### ✅ Step 3: Cookie is Sent on Subsequent Requests
1. Stay on same tab after login
2. DevTools → Network → Clear
3. Navigate to a protected route or let app make API call
4. Find `GET /api/kam/me` or `GET /api/domains/my`
5. Check Request Headers
6. ✅ Verify `Cookie: keeper_session=...` is present

### ✅ Step 4: Protected Endpoints Return 200
1. After login, in same tab/session
2. Call `GET https://api.ke3p.com/api/kam/me`
3. ✅ Expected: `200 OK` with user data
4. Call `GET https://api.ke3p.com/api/domains/my`
5. ✅ Expected: `200 OK` with domain data

---

## Summary of Root Cause (Best Assessment)

Based on the evidence:

1. **Code is correct** - Login handler calls `setSessionCookie()`, attributes are valid
2. **Frontend is correct** - Uses `credentials: 'include'`
3. **Middleware is correct** - Checks for `keeper_session` cookie
4. **CORS is correct** - Allows credentials, correct origins

**Most Likely Root Cause**:

🔴 **`COOKIE_DOMAIN` environment variable is not set or is set incorrectly in Railway deployment**

This would cause:
- Cookie to be scoped to wrong domain (e.g., `api.ke3p.com` only)
- Cookie not accessible from `www.ke3p.com`
- Express might even fail to set cookie silently if domain is invalid

**Second Most Likely**:

🟡 **Railway proxy is stripping `Set-Cookie` headers** or **Headers are not being committed** due to response timing

---

## Immediate Action Items

1. ⭐ **CHECK RAILWAY ENV VARS** (5 minutes)
   - Verify `COOKIE_DOMAIN=.ke3p.com` is set correctly
   - Verify `JWT_SECRET` is set
   - Redeploy if needed

2. ⭐ **ADD DEBUG LOGGING** (10 minutes)
   - Add logs to `setSessionCookie()` as shown in Fix #2
   - Deploy and test login
   - Check Railway logs for diagnostic output

3. ⭐ **BROWSER COOKIE INSPECTION** (5 minutes)
   - After login, check Application → Cookies in DevTools
   - Check both `www.ke3p.com` and `api.ke3p.com` domains
   - Verify cookie attributes if present

4. 🔄 **NETWORK CAPTURE** (5 minutes)
   - Use browser DevTools to capture login request
   - Check for `Set-Cookie` header in response
   - Take screenshots for further analysis

---

## Expected Outcome

After implementing Fix #1 (correct COOKIE_DOMAIN):
- ✅ Login sets `keeper_session` cookie on `.ke3p.com` domain
- ✅ Cookie is visible in browser storage under `www.ke3p.com`
- ✅ Subsequent requests to `api.ke3p.com` include the cookie
- ✅ Protected endpoints return 200 with user context
- ✅ Authentication flow works end-to-end

---

## Follow-Up Documentation

After confirming root cause, update:
- `AUTH_FIX_2025-10-15.md` - Add new issue section
- `COOKIE_AUTH_ACCEPTANCE.md` - Add environment variable checklist
- `env-example.txt` - Add warning comment about leading dot

---

**Analysis completed**: 2025-10-15
**Next step**: Verify `COOKIE_DOMAIN` in Railway deployment

