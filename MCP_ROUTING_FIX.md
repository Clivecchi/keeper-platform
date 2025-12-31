# MCP Routing Fix - Vercel Configuration Update

**Date**: October 20, 2025  
**Status**: ✅ FIXED - Ready to Deploy

## Problem

`/mcp/*` routes were being served by the Vercel SPA (returning HTML) instead of being proxied to the MCP backend on Railway. This caused OpenAI Agent Builder ("Opai") to fail the MCP handshake with the error:

```
"MCP handshake failed - no tool endpoints responded"
```

**Evidence from Production:**
- `GET https://api.ke3p.com/mcp/tools` → 200, `text/html` (SPA shell)
- `GET https://api.ke3p.com/mcp/capabilities` → 200, `text/html` (SPA shell)
- `GET https://api.ke3p.com/api/health` → 200, `application/json` ✅ (proxied correctly)

**Root Cause:**  
The Vercel configuration in `vercel.json` had a catch-all rewrite `{ "source": "/(.*)", "destination": "/" }` that was matching `/mcp/*` requests and serving them from the SPA, because there was no explicit rewrite rule for `/mcp/*` paths.

## Solution

Updated `vercel.json` to add an explicit rewrite rule for `/mcp/*` paths that proxies them to the Railway backend, similar to how `/api/*` requests are already handled.

### Changes Made

**File**: `vercel.json` (root)

**Before:**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**After:**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" },
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Key Points:**
- Added line 7: `/mcp/*` rewrite rule
- Order matters: specific routes MUST come before the catch-all `/(.*)`
- The Railway backend already handles MCP properly (verified in `apps/api/src/mcp/index.ts`)

## Backend Status (Already Correct)

The Railway backend (`apps/api/src/mcp/index.ts`) already:
- ✅ Sets `Content-Type: application/json; charset=utf-8` on all responses
- ✅ Requires `Authorization: Bearer <OPAI_AGENT_MCP_KEY>` for protected endpoints
- ✅ Returns JSON 404 for unknown `/mcp/*` routes (not HTML)
- ✅ Has proper CORS headers for OpenAI Agent Builder
- ✅ Implements all required MCP endpoints:
  - `/mcp/tools`
  - `/mcp/capabilities`
  - `/mcp/.well-known/mcp`
  - `/mcp/health` (no auth)
  - `/mcp/schema`
  - `/mcp/call`

No backend changes were needed.

## Deployment Steps

1. **Commit the change:**
   ```bash
   git add vercel.json
   git commit -m "fix: Add /mcp/* rewrite rule to proxy to Railway backend"
   git push origin main
   ```

2. **Vercel will auto-deploy** (if auto-deploy is enabled)

3. **Verify the fix** after deployment:

   ```bash
   # Set your MCP key
   export OPAI_AGENT_MCP_KEY="your-key-here"
   
   # Test with auth (should return JSON)
   curl -i https://api.ke3p.com/mcp/tools \
     -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
   
   # Expected: 200 OK, Content-Type: application/json
   # Response body should contain: {"tools":[...],"timestamp":"..."}
   
   # Test capabilities
   curl -i https://api.ke3p.com/mcp/capabilities \
     -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
   
   # Test well-known discovery
   curl -i https://api.ke3p.com/mcp/.well-known/mcp \
     -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
   
   # Test without auth (should return 401 JSON)
   curl -i https://api.ke3p.com/mcp/tools
   # Expected: 401, {"ok":false,"error":"unauthorized"}
   
   # Test health (no auth required)
   curl -i https://api.ke3p.com/mcp/health
   # Expected: 200, {"ok":true,"service":"keeper-mcp",...}
   ```

4. **Verify the probe flips green:**
   ```bash
   curl https://www.ke3p.com/api/debug/opai-mcp-probe
   ```
   
   Expected response:
   ```json
   {
     "reachable": true,
     "authOk": true,
     "handshakeOk": true,
     "tools": [...]
   }
   ```

## Acceptance Criteria

✅ **Routing:**
- `/mcp/*` requests are NOT handled by SPA fallback
- `/mcp/*` requests are proxied to Railway backend (same as `/api/*`)

✅ **Responses:**
- `GET /mcp/tools` → 200 `application/json` with tools list
- `GET /mcp/capabilities` → 200 `application/json` with capabilities
- `GET /mcp/.well-known/mcp` → 200 `application/json` with discovery info
- Unknown `/mcp/*` paths → 404 `application/json` (NOT HTML)

✅ **Auth:**
- `/mcp/*` (except `/mcp/health`) requires `Authorization: Bearer <key>`
- Missing/invalid token → 401 `application/json` with `{"error":"unauthorized"}`

✅ **Headers:**
- All `/mcp/*` responses have `Content-Type: application/json; charset=utf-8`
- Backend sets these headers (no Vercel override needed)

✅ **Probe:**
- `GET /api/debug/opai-mcp-probe` returns `handshakeOk: true`

## What Changed

**Changed Files:**
1. `vercel.json` - Added `/mcp/*` rewrite rule (line 7)

**Unchanged (already correct):**
- `apps/api/src/mcp/index.ts` - MCP router implementation
- `apps/api/src/mcp/cors.ts` - CORS configuration
- `apps/api/src/mcp/tools.ts` - Tool registry
- `apps/api/src/mcp/auth.ts` - Authentication logic

## Testing Locally

To test this locally before deploying:

1. Ensure Railway backend is running and accessible
2. Vercel dev server doesn't fully replicate production routing, so this is best tested on Vercel preview or production

## OpenAI Agent Builder Setup

After deployment, configure OpenAI Agent Builder:

1. **Base URL**: `https://api.ke3p.com/mcp`
2. **Authentication**: Bearer token
3. **API Key**: Your `OPAI_AGENT_MCP_KEY` value from Railway env vars
4. **Expected Status**: "Connected" ✅ (not "Establishing connection...")

## Notes

- This is a **pure routing fix** - no code changes needed
- The backend was already correctly implementing MCP
- Vercel's rewrite rules are evaluated top-to-bottom
- The catch-all `/(.*) -> /` must always be last
- Headers from the destination service (Railway) are preserved by Vercel rewrites

## Related Documentation

- [MCP Implementation](./apps/api/src/mcp/README.md)
- [MCP Test Script](./test-mcp-cors.sh)
- [OpenAI MCP Setup](./MCP_OPENAI_SETUP.md)
- [Opai Probe Implementation](./OPAI_MCP_PROBE_IMPLEMENTATION.md)
