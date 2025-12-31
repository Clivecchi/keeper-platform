# Board Studio - Root Cause Analysis

## The REAL Problem

Your Board Studio changes **were applied to the frontend**, but the backend is **blocking all PATCH requests via CORS**.

---

## Evidence from Logs

### Browser Console Errors
```
Access to fetch at 'https://api.ke3p.com/api/board-data/.../frames/reorder' 
from origin 'https://keeper-platform-n0ijebhg5-clivecchis-projects.vercel.app' 
has been blocked by CORS policy: Method PATCH is not allowed by 
Access-Control-Allow-Methods in preflight response.

Request header field if-match is not allowed by 
Access-Control-Allow-Headers in preflight response.
```

### Railway Logs Show
```
OPTIONS /api/board-data/.../frames/reorder 200 ✅ (preflight allowed)
OPTIONS /api/board-data/.../frames/... 200 ✅ (preflight allowed)
```

But the actual PATCH requests never arrive because the browser blocks them after seeing the preflight response doesn't list PATCH as allowed.

---

## What Was Wrong in Backend

### File: `apps/api/src/index.ts`

**Line 253 - OPTIONS handler:**
```typescript
// BEFORE (blocking PATCH)
res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-debug-token');
```

**Line 283-285 - cors() middleware:**
```typescript
// BEFORE (blocking PATCH)
methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-debug-token'],
exposedHeaders: ['x-debug-info'],
```

### File: `apps/api/src/middleware/dynamicCorsMiddleware.ts`

**Line 76-78:**
```typescript
// BEFORE (blocking PATCH)
allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Had PATCH
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'], // Missing If-Match
exposedHeaders: ['X-Total-Count', 'X-Page-Count'], // Missing ETag
```

---

## What I Fixed

### 1. `apps/api/src/index.ts` - Manual OPTIONS Handler

**Now allows:**
```typescript
res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-debug-token, If-Match, ETag');
res.header('Access-Control-Expose-Headers', 'ETag, X-Total-Count, X-Page-Count');
```

### 2. `apps/api/src/index.ts` - cors() Middleware

**Now allows:**
```typescript
methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-debug-token', 'If-Match', 'ETag'],
exposedHeaders: ['x-debug-info', 'ETag', 'X-Total-Count', 'X-Page-Count'],
```

### 3. `apps/api/src/middleware/dynamicCorsMiddleware.ts` - Default Config

**Now allows:**
```typescript
allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'If-Match', 'ETag'],
exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'ETag'],
```

---

## Why This Was Invisible

1. **PUT requests worked** - That's why some saves seemed to succeed
2. **GET requests worked** - That's why loading boards worked
3. **PATCH requests silently failed** - Browser blocked them before they reached the server
4. **Frontend code changes were correct** - They just couldn't execute because of CORS
5. **You're on Vercel preview** - Different origin than production, so CORS is enforced

---

## What You Need to Do

### 1. Deploy the Backend Fix

The backend changes are in:
- `apps/api/src/index.ts`
- `apps/api/src/middleware/dynamicCorsMiddleware.ts`

**Deploy to Railway:**
```bash
# If you have auto-deploy from git:
git add apps/api/src/index.ts apps/api/src/middleware/dynamicCorsMiddleware.ts
git commit -m "fix: Add PATCH method and If-Match/ETag headers to CORS config"
git push

# Or trigger manual Railway deploy if needed
```

### 2. Wait for Railway Deployment

Watch Railway logs for:
```
Starting Container
...
🚀 Keeper API Server (Domain-Enabled Version)
```

### 3. Test Again

After Railway finishes deploying:
1. **Hard refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. Try adding a frame
3. Try editing frame name
4. Check browser console for:
   - ✅ Should see `✅ Frame created and persisted: {id}`
   - ❌ Should NOT see "CORS policy" errors

---

## Why My Code Changes Didn't Work Initially

**Sequence of events:**
1. I updated BoardContext.tsx to call backend APIs ✅
2. Frontend builds and deploys to Vercel preview ✅
3. User tests → Calls PATCH /api/board-data/.../frames/... ✅
4. **Browser checks CORS preflight** → Backend says "PATCH not allowed" ❌
5. **Browser blocks the request** before it even leaves the client ❌
6. User sees "nothing changed" because requests never reached the server ❌

**The frontend changes were correct** - they just couldn't execute because of a backend CORS misconfiguration.

---

## Files Modified (Total: 3)

### Frontend
1. `apps/web/src/context/BoardContext.tsx` - Added real API calls for frame CRUD

### Backend (CORS Fix)
2. `apps/api/src/index.ts` - Added PATCH, If-Match, ETag to CORS config
3. `apps/api/src/middleware/dynamicCorsMiddleware.ts` - Added If-Match, ETag to default config

---

## Expected Outcome After Deploy

✅ PATCH requests will succeed  
✅ Frame creation will persist  
✅ Frame updates (including props) will persist  
✅ Frame deletion will work  
✅ Frame reordering will work  
✅ No more "CORS policy" errors in console  

---

## How to Verify

After Railway deploys, check browser console:

**Before (Current):**
```
❌ Access to fetch blocked by CORS policy: Method PATCH is not allowed
❌ Failed to fetch
```

**After (Fixed):**
```
✅ Frame created and persisted: abc-123-def-456
✅ Frame updated and persisted: abc-123-def-456
✅ Props persisted to server for frame: abc-123-def-456
```

---

**Status:** Backend CORS config fixed. Waiting for Railway deployment.

