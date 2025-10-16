# Cookie Authentication & Proxy Clarification
**Date**: October 15, 2025

## Question: Is the keeper.domain proxy service involved in the authentication failure?

### Answer: **NO** - The proxy is not involved

---

## Current Production Architecture

Based on your codebase configuration:

### ✅ Active Services
```
Frontend (Vercel)          API (Railway)
www.ke3p.com       →       api.ke3p.com
                 ↑
            Direct connection
         (no proxy in between)
```

**Architecture:**
- Frontend: `www.ke3p.com` (Vercel deployment)
- API: `api.ke3p.com` (Railway deployment)
- **Direct CORS connection** with `credentials: 'include'`

### ❌ Disabled Service

**keeper.domain proxy service:**
- **Status**: DISABLED in production
- **Configuration**: `KEEPER_PROXY_ENABLED=false` (default)
- **Railway**: Scaled to 0 replicas (not running)
- **DNS**: `api.keeper.domains` removed/parked
- **Purpose**: Was for multi-domain routing, disabled for "Single-Domain MVP"

**Source**: `docs/Single-Domain-MVP.md`, `apps/proxy/README.md` (line 45)

---

## Does the Proxy Need COOKIE_DOMAIN?

### Short Answer: **NO**

**Why:**
1. The keeper.domain proxy service is **not running** (scaled to 0)
2. It's not in the request path (disabled for single-domain MVP)
3. Requests go directly from frontend → API (no proxy hop)

**Only the API service needs `COOKIE_DOMAIN`** set correctly.

---

## What About Railway's Internal Proxy?

Railway has its own **internal load balancer/proxy** (this is Railway's infrastructure, not your keeper.domain service). This is different from your disabled keeper.domain proxy.

**Railway's proxy:**
- ✅ Automatically handles HTTPS termination
- ✅ Routes requests to your API service
- ✅ Generally passes through all headers including Set-Cookie
- ⚠️ In rare cases, could strip headers (this is what I mentioned as a secondary suspect)

**Configuration:**
- Railway's internal proxy doesn't use your COOKIE_DOMAIN env var
- It just forwards responses from your Express app
- If Express sets `Set-Cookie`, Railway should pass it through

---

## About Your Cookie Domain Screenshot

You mentioned you have a screenshot confirming Cookie Domain is set. **Critical question:**

### What is the exact value shown?

The value must be **exactly**:
```
COOKIE_DOMAIN=.ke3p.com
```

**Common incorrect values that would cause the issue:**

| What It Might Show | Why It's Wrong | Result |
|-------------------|----------------|--------|
| `api.ke3p.com` | No leading dot | Cookie only on api.ke3p.com |
| `ke3p.com` | No leading dot | May not work for subdomains |
| `.ke3p.com ` | Trailing space | Invalid domain |
| ` .ke3p.com` | Leading space | Invalid domain |
| `"*.ke3p.com"` | Wildcard | Invalid (wildcards don't work in cookies) |
| Empty/blank | No domain set | Cookie scoped to request host only |

**The leading dot `.` is critical** - it makes the cookie available to all subdomains:
- `.ke3p.com` → Works for `www.ke3p.com`, `api.ke3p.com`, any subdomain
- `ke3p.com` → May only work for exact domain match

---

## Services in Your Railway Project

Based on the codebase, you likely have these Railway services:

### 1. **API Service** (keeper-platform-api or similar)
**Status**: ✅ Active  
**Domain**: api.ke3p.com  
**Needs COOKIE_DOMAIN**: ✅ YES - Set to `.ke3p.com`  
**Purpose**: Main API backend  

### 2. **Proxy Service** (keeper-platform-proxy or keeper.domain)
**Status**: ❌ Disabled (scaled to 0)  
**Domain**: api.keeper.domains (removed/parked)  
**Needs COOKIE_DOMAIN**: ❌ NO - Not running  
**Purpose**: Multi-domain routing (disabled for MVP)  

### 3. **Database** (PostgreSQL)
**Status**: ✅ Active  
**Needs COOKIE_DOMAIN**: ❌ NO - Not applicable  

---

## Which Service Needs COOKIE_DOMAIN?

```
✅ API Service (active)
   └─ Environment Variables
      └─ COOKIE_DOMAIN=.ke3p.com  ← This one needs to be set correctly

❌ Proxy Service (disabled)
   └─ Not involved, doesn't need it

❌ Database
   └─ Not involved, doesn't need it
```

---

## Next Steps Based on Your Screenshot

### If your screenshot shows the API service has:

#### ✅ `COOKIE_DOMAIN=.ke3p.com` (with leading dot)
**Then the env var is correct**, and we need to look at other causes:
1. Add debug logging to see what's happening at runtime
2. Check if Railway's proxy is stripping headers (unlikely)
3. Verify Express is actually emitting the Set-Cookie header

**Action**: Add debug logging as shown in previous analysis:
```typescript
// In apps/api/src/kam/session.ts
console.log('🔍 Cookie domain:', DOMAIN, 'from env:', process.env.COOKIE_DOMAIN);
console.log('🔍 Set-Cookie header:', res.getHeader('set-cookie'));
```

#### ❌ `COOKIE_DOMAIN=` (something else)
**Then this is the root cause** - needs to be fixed:
1. Update to `.ke3p.com` (with leading dot)
2. Redeploy API service
3. Test login flow

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT PRODUCTION FLOW                      │
└─────────────────────────────────────────────────────────────────┘

User Browser
    ↓
www.ke3p.com (Vercel)
    ↓ [fetch with credentials: 'include']
    ↓
[CORS Request with Origin: https://www.ke3p.com]
    ↓
api.ke3p.com (Railway)
    ↓
Railway Internal Proxy (infrastructure)
    ↓
Your Express App (API Service)
    ↓ [setSessionCookie() called]
    ↓
[Response with Set-Cookie: keeper_session=...; Domain=.ke3p.com]
    ↓
Railway Internal Proxy (should pass through)
    ↓
User Browser (should store cookie)

┌─────────────────────────────────────────────────────────────────┐
│                   DISABLED (NOT IN USE)                          │
└─────────────────────────────────────────────────────────────────┘

keeper.domain proxy service (scaled to 0)
api.keeper.domains (DNS removed)
KEEPER_PROXY_ENABLED=false
```

---

## Summary

**To directly answer your questions:**

1. **Is the failure related to the keeper.domain service on Railway?**
   - ❌ **NO** - That service is disabled (scaled to 0 replicas)

2. **Does the proxy need COOKIE_DOMAIN?**
   - ❌ **NO** - The proxy is not running and not involved

3. **Which service needs COOKIE_DOMAIN?**
   - ✅ **Only the API service** (the main backend on api.ke3p.com)

4. **What about Railway's proxy?**
   - Railway's internal infrastructure proxy generally works fine
   - It's not related to your keeper.domain service
   - It doesn't use your COOKIE_DOMAIN env var

---

## Can You Share?

From your screenshot of Railway environment variables, can you tell me:

1. **Which service** are you looking at? (API, proxy, or database?)
2. **What is the exact value** of COOKIE_DOMAIN? (including any spaces, quotes, etc.)

This will help me confirm if the configuration is correct or identify the issue.

---

**Key Takeaway**: The keeper.domain proxy service is completely uninvolved. Focus only on the API service's COOKIE_DOMAIN environment variable.

