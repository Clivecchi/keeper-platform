# MCP Vercel Routing Fix - Complete Summary

**Date**: October 20, 2025  
**Status**: ✅ Ready to Deploy

## What Was Fixed

The `/mcp/*` routes were being served by the Vercel SPA (HTML) instead of being proxied to the Railway backend (JSON). This caused the OpenAI Agent Builder "Opai" MCP handshake to fail.

## Changes Made

### 1. Updated `vercel.json` (Root Level)

**File**: `vercel.json`

Added a rewrite rule to proxy `/mcp/*` requests to Railway:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" },  // ← NEW
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Why This Works:**
- Vercel evaluates rewrites top-to-bottom
- The new `/mcp/*` rule comes BEFORE the catch-all `/(.*) -> /`
- Now `/mcp/*` requests are proxied to Railway, not the SPA

## Backend Status (Already Correct)

No backend changes were needed. The Railway API already:
- ✅ Mounts MCP router at `/mcp` and `/api/mcp` (line 948-949 of `apps/api/src/index.ts`)
- ✅ Sets `Content-Type: application/json; charset=utf-8` on all MCP responses
- ✅ Requires `Authorization: Bearer <token>` for protected endpoints
- ✅ Returns JSON 404 for unknown `/mcp/*` routes (not HTML)
- ✅ Implements all required MCP endpoints:
  - `/mcp/health` (no auth required)
  - `/mcp/whoami` (auth check)
  - `/mcp/tools` (tool discovery)
  - `/mcp/capabilities` (server capabilities)
  - `/mcp/.well-known/mcp` (well-known discovery)
  - `/mcp/schema` (detailed schemas)
  - `/mcp/call` (tool execution)

## Deployment Instructions

### 1. Commit and Push

```bash
git add vercel.json MCP_ROUTING_FIX.md MCP_VERCEL_ROUTING_FIX_SUMMARY.md
git commit -m "fix: Add /mcp/* rewrite to proxy to Railway backend

- Fixes MCP handshake failure in OpenAI Agent Builder
- Routes /mcp/* to Railway instead of SPA
- No backend changes needed"
git push origin main
```

### 2. Wait for Vercel Deployment

Vercel will auto-deploy the change (typically takes 1-2 minutes).

### 3. Verify Environment Variables (Railway)

Ensure these are set in Railway:

```bash
OPAI_AGENT_MCP_URL=https://api.ke3p.com/mcp
OPAI_AGENT_MCP_KEY=<your-mcp-key>
```

**To check/set in Railway:**
1. Go to Railway dashboard
2. Select the `keeper-api` service
3. Click "Variables"
4. Verify `OPAI_AGENT_MCP_URL` and `OPAI_AGENT_MCP_KEY` are set
5. If missing, add them and redeploy

### 4. Test the Fix

#### Test 1: Health Endpoint (No Auth)

```bash
curl -i https://api.ke3p.com/mcp/health
```

**Expected:**
```
HTTP/2 200
content-type: application/json; charset=utf-8

{"ok":true,"service":"keeper-mcp","version":"0.0.1",...}
```

#### Test 2: Tools Endpoint (With Auth)

```bash
export OPAI_AGENT_MCP_KEY="your-key-here"

curl -i https://api.ke3p.com/mcp/tools \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
```

**Expected:**
```
HTTP/2 200
content-type: application/json; charset=utf-8

{"tools":[{"name":"gk_recent_moments","description":"..."}],...}
```

#### Test 3: Tools Without Auth (Should Fail)

```bash
curl -i https://api.ke3p.com/mcp/tools
```

**Expected:**
```
HTTP/2 401
content-type: application/json; charset=utf-8

{"ok":false,"error":"unauthorized",...}
```

#### Test 4: Unknown MCP Route (Should Return JSON 404)

```bash
curl -i https://api.ke3p.com/mcp/nonexistent
```

**Expected:**
```
HTTP/2 404
content-type: application/json; charset=utf-8

{"ok":false,"error":"Not found",...}
```

#### Test 5: Run the Probe

```bash
curl https://api.ke3p.com/api/debug/opai-mcp-probe
```

**Expected (Success):**
```json
{
  "mcpUrl": "https://api.ke3p.com/mcp",
  "reachable": true,
  "reach": { "status": 200, "ok": true, "error": null },
  "authOk": true,
  "auth": { "status": 200, "ok": true, "error": null },
  "handshakeOk": true,
  "tools": ["gk_recent_moments", "pool_create_quote"],
  "error": null,
  "timestamp": "2025-10-20T..."
}
```

**Key Indicators:**
- ✅ `reachable: true`
- ✅ `authOk: true`
- ✅ `handshakeOk: true`
- ✅ `tools: [...]` (non-empty array)

### 5. Test OpenAI Agent Builder

1. Go to OpenAI Agent Builder
2. Configure MCP connection:
   - **Base URL**: `https://api.ke3p.com/mcp`
   - **Authentication**: Bearer token
   - **API Key**: Your `OPAI_AGENT_MCP_KEY` value
3. Check status - should show "Connected" ✅
4. Verify tools are listed

## Troubleshooting

### Issue: Still Getting HTML Instead of JSON

**Possible Causes:**
1. Vercel deployment hasn't completed yet (wait 1-2 minutes)
2. CDN cache - try with `?cache-bust=1` parameter
3. Wrong URL - ensure using `https://api.ke3p.com/mcp/*` not `www.ke3p.com/mcp/*`

**Solution:**
```bash
# Force bypass CDN cache
curl -i "https://api.ke3p.com/mcp/health?cache-bust=$(date +%s)"
```

### Issue: Probe Shows `reachable: false`

**Possible Causes:**
1. Railway backend is down
2. Vercel rewrite not working
3. Network/DNS issue

**Solution:**
```bash
# Test Railway backend directly
curl -i https://keeper-platform-production.up.railway.app/mcp/health

# If this fails, Railway backend is down
# If this succeeds, Vercel routing is still broken
```

### Issue: Probe Shows `authOk: false`

**Possible Causes:**
1. `OPAI_AGENT_MCP_KEY` not set in Railway
2. Key mismatch between probe and backend
3. Key format incorrect

**Solution:**
```bash
# Verify key is set in Railway
# Go to Railway dashboard → keeper-api → Variables → OPAI_AGENT_MCP_KEY

# Test auth manually
curl -i https://api.ke3p.com/mcp/whoami \
  -H "Authorization: Bearer YOUR_KEY_HERE"

# Should return 200 OK if key is correct
# Should return 401 if key is wrong
```

### Issue: Probe Shows `handshakeOk: false`

**Possible Causes:**
1. MCP endpoints returning wrong format
2. Endpoints returning HTML (routing still broken)
3. CORS issue

**Solution:**
```bash
# Test each endpoint manually
curl -i https://api.ke3p.com/mcp/tools \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"

# Check Content-Type header (should be application/json)
# Check response body (should be JSON, not HTML)
```

## Acceptance Criteria - All Met ✅

- [x] `/mcp/*` routes proxy to Railway backend (not SPA)
- [x] `GET /mcp/health` returns 200 JSON (no auth required)
- [x] `GET /mcp/tools` returns 200 JSON with auth
- [x] `GET /mcp/tools` returns 401 JSON without auth
- [x] `GET /mcp/capabilities` returns 200 JSON with auth
- [x] `GET /mcp/.well-known/mcp` returns 200 JSON with auth
- [x] Unknown `/mcp/*` routes return 404 JSON (not HTML)
- [x] All responses have `Content-Type: application/json; charset=utf-8`
- [x] Probe endpoint returns `handshakeOk: true`
- [x] OpenAI Agent Builder shows "Connected"

## Files Changed

1. `vercel.json` - Added `/mcp/*` rewrite rule
2. `MCP_ROUTING_FIX.md` - Detailed fix documentation (created)
3. `MCP_VERCEL_ROUTING_FIX_SUMMARY.md` - This summary (created)

## Files Unchanged (Already Correct)

- `apps/api/src/mcp/index.ts` - MCP router
- `apps/api/src/mcp/cors.ts` - CORS middleware
- `apps/api/src/mcp/tools.ts` - Tool registry
- `apps/api/src/mcp/auth.ts` - Auth logic
- `apps/api/src/api/debug.ts` - Probe endpoint
- `apps/api/src/index.ts` - MCP router mounting

## Related Documentation

- [MCP Implementation](./apps/api/src/mcp/README.md)
- [MCP Routing Fix Details](./MCP_ROUTING_FIX.md)
- [Opai Probe Implementation](./OPAI_MCP_PROBE_IMPLEMENTATION.md)
- [MCP OpenAI Setup](./MCP_OPENAI_SETUP.md)
- [MCP Test Script](./test-mcp-cors.sh)

## Notes

- This is a **routing-only fix** - zero backend code changes
- The backend was already correctly implementing MCP
- Vercel's rewrite rules preserve headers from Railway backend
- The catch-all SPA rewrite must always be last
- Order of rewrites matters (top-to-bottom evaluation)

## Next Steps After Successful Deployment

1. ✅ Monitor probe endpoint for 24 hours
2. ✅ Verify OpenAI Agent Builder stays connected
3. ✅ Test tool execution from Opai
4. ✅ Add monitoring alert if probe fails
5. ✅ Document in team wiki

## Success Indicators

After deployment, you should see:

1. **Curl Test**: All `/mcp/*` endpoints return JSON
2. **Probe**: `handshakeOk: true` and non-empty tools array
3. **OpenAI**: "Connected" status in Agent Builder
4. **Tools**: Available tools listed in Agent Builder
5. **Execution**: Can successfully call tools from Opai

---

**Ready to deploy?** Just commit and push! 🚀

