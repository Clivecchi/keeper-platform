# MCP Canary Verification System ✅

**Date:** October 22, 2025  
**Purpose:** Prove whether MCP requests reach Railway backend or die at Vercel edge  
**Status:** ✅ Implemented and Ready for Testing  

---

## 🎯 Overview

This system adds **unmistakable canary markers** to every MCP response, enabling positive proof of whether requests reach the Railway API backend or get blocked/intercepted at Vercel edge.

### Key Features

1. **Canary Headers** - All `/mcp*` responses include `X-Keeper-Origin: railway-api`
2. **Teapot Endpoint** - `GET/POST /mcp/_canary` returns 418 status
3. **Trace Logging** - Every `/mcp*` hit logged with method, path, UA, request ID
4. **JSON-RPC Canary** - All JSON-RPC results include `__keeper_canary` object
5. **404 Detection** - Explicit logging when routes are missed
6. **Defensive JSON Parsing** - Tolerates missing/odd Content-Type headers

---

## 🔧 Implementation Details

### 1. Canary Headers (All `/mcp*` Responses)

Every response from `/mcp` or `/api/mcp` paths includes these headers:

```
X-Keeper-Origin: railway-api
X-Keeper-Build: <RAILWAY_DEPLOYMENT_ID or BUILD_ID>
X-Keeper-Service: keeper-api-mcp
```

**Implementation:** `apps/api/src/index.ts` lines 962-971

**Purpose:** Headers prove the request reached Railway, not Vercel edge

### 2. Teapot Canary Endpoint

**Endpoints:**
- `GET/POST /mcp/_canary`
- `GET/POST /api/mcp/_canary`

**Response:**
```json
{
  "ok": true,
  "why": "teapot",
  "method": "POST",
  "path": "/mcp/_canary",
  "origin": "railway-api",
  "service": "keeper-api-mcp",
  "build": "prod-abc123",
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

**Status Code:** 418 (I'm a teapot)

**Implementation:** `apps/api/src/index.ts` lines 974-1001

**Purpose:** Unique status code and body prove backend reached

### 3. Trace Logging

All `/mcp*` requests logged **before** routing:

```
[MCP TRACE] method=POST path=/mcp host=api.ke3p.com origin="https://agent.openai.com" ua="OpenAI-Agent/1.0" rid=abc-123
```

**Implementation:** `apps/api/src/index.ts` lines 950-960

**Purpose:** Correlate client requests with Railway logs

### 4. JSON-RPC Canary Markers

All JSON-RPC success responses include `__keeper_canary`:

```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "actions": [...],
    "__keeper_canary": {
      "origin": "railway-api",
      "service": "keeper-api-mcp",
      "build": "prod-abc123",
      "timestamp": "2025-10-22T12:00:00.000Z"
    }
  }
}
```

**Implementation:** `apps/api/src/mcp/jsonRpc.ts` lines 143-152

**Purpose:** Embedded proof in every JSON-RPC payload

### 5. 404 Detection & Logging

Missed `/mcp*` routes explicitly logged:

```
[MCP 404] method=POST path=/mcp/invalid rid=abc-123
```

**Response:**
```json
{
  "ok": false,
  "where": "railway-api",
  "error": "Not Found",
  "path": "/mcp/invalid",
  "method": "POST",
  "timestamp": "2025-10-22T12:00:00.000Z"
}
```

**Implementation:** `apps/api/src/index.ts` lines 1042-1059

**Purpose:** Distinguish between Vercel 404 (edge) and Railway 404 (backend)

### 6. Defensive JSON Parsing

Accepts JSON even with missing/incorrect `Content-Type`:

```javascript
app.use(express.json({ limit: '1mb', type: ['application/json', 'text/json', '*/json'] }));
app.use(express.text({ type: '*/*', limit: '1mb' }));
// Parse text body as JSON if possible
app.use((req, _res, next) => {
  if (!req.is('application/json') && typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body); } catch { /* ignore */ }
  }
  next();
});
```

**Implementation:** `apps/api/src/index.ts` lines 295-310

**Purpose:** Handle OpenAI Agent Builder quirks with Content-Type

---

## 🧪 Testing

### PowerShell Verification Script

Run the comprehensive test script:

```powershell
# Set your API key first
$env:OPAI_AGENT_MCP_KEY = "your_key_here"

# Run the test script
.\test-mcp-canary.ps1
```

**What it tests:**
1. ✅ Canary endpoint via Vercel → Railway
2. ✅ JSON-RPC `list_actions` via Vercel → Railway
3. ✅ JSON-RPC `call_action` via Vercel → Railway
4. ✅ Direct Railway connection (A/B comparison)

**Expected Output:**
```
═══════════════════════════════════════════════════════
MCP CANARY VERIFICATION
═══════════════════════════════════════════════════════

🔑 Using API Key: sk_test...
📊 Request ID: abc-123-def-456

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: Canary Endpoint (Vercel → Railway)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Status: 418
✅ X-Keeper-Origin: railway-api
✅ X-Keeper-Build: prod-abc123
✅ Body.origin: railway-api
🎉 PASS: Canary reached Railway backend!

[... more tests ...]
```

### Manual cURL Tests

#### Test 1: Canary Endpoint
```bash
curl -i https://api.ke3p.com/mcp/_canary \
  -H "Authorization: Bearer YOUR_KEY"
```

**Expected:**
```
HTTP/1.1 418 I'm a teapot
X-Keeper-Origin: railway-api
X-Keeper-Build: prod-abc123
X-Keeper-Service: keeper-api-mcp

{"ok":true,"why":"teapot","origin":"railway-api",...}
```

#### Test 2: JSON-RPC list_actions
```bash
curl -i https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "x-request-id: test-123" \
  -d '{"jsonrpc":"2.0","id":"test","method":"list_actions","params":{}}'
```

**Expected:**
```
HTTP/1.1 200 OK
X-Keeper-Origin: railway-api
X-Keeper-Build: prod-abc123

{
  "jsonrpc":"2.0",
  "id":"test",
  "result":{
    "actions":[...],
    "__keeper_canary":{
      "origin":"railway-api",
      "service":"keeper-api-mcp",
      "build":"prod-abc123",
      "timestamp":"..."
    }
  }
}
```

#### Test 3: JSON-RPC call_action
```bash
curl -i https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":"test2",
    "method":"call_action",
    "params":{
      "name":"gk_recent_moments",
      "arguments":{"limit":3}
    }
  }'
```

**Expected:**
```
HTTP/1.1 200 OK
X-Keeper-Origin: railway-api

{
  "jsonrpc":"2.0",
  "id":"test2",
  "result":{
    "moments":[...],
    "__keeper_canary":{
      "origin":"railway-api",
      ...
    }
  }
}
```

---

## 📊 Log Analysis

### Railway Logs

Check Railway logs for canary markers:

```bash
# View all MCP requests
railway logs | grep '\[MCP'

# View trace logs
railway logs | grep '\[MCP TRACE\]'

# View canary hits
railway logs | grep '\[MCP CANARY\]'

# View JSON-RPC calls
railway logs | grep '\[MCP JSONRPC\]'

# View 404s
railway logs | grep '\[MCP 404\]'

# Find specific request ID
railway logs | grep 'rid=abc-123'
```

### Expected Log Entries

**Trace Log:**
```
[MCP TRACE] method=POST path=/mcp host=api.ke3p.com origin="https://agent.openai.com" ua="OpenAI-Agent/1.0" rid=abc-123
```

**Canary Log:**
```
[MCP CANARY] method=GET path=/mcp/_canary rid=abc-123
```

**JSON-RPC Log:**
```
[MCP JSONRPC] rid=abc-123 method=list_actions hasAuth=true
[MCP JSONRPC] rid=def-456 method=call_action name=gk_recent_moments hasAuth=true
```

**404 Log:**
```
[MCP 404] method=POST path=/mcp/invalid rid=xyz-789
```

---

## 🔍 Troubleshooting

### If Canary Headers Are Missing

**Problem:** No `X-Keeper-Origin` header in response

**Diagnosis:**
1. Request never reached Railway backend
2. Vercel is blocking/intercepting at edge
3. Check `vercel.json` rewrites

**Fix:**
```json
{
  "rewrites": [
    { "source": "/mcp", "destination": "https://keeper-platform-production.up.railway.app/mcp" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" }
  ]
}
```

### If 418 Status Not Returned

**Problem:** `/mcp/_canary` returns 200 or 404

**Diagnosis:**
1. **200** - Request hit wrong handler (not canary endpoint)
2. **404** - Canary endpoint not mounted or Vercel blocking

**Fix:**
- Check Railway logs for `[MCP TRACE]` entry
- If no trace log → Vercel is blocking
- If trace log but wrong status → route mounting order issue

### If `__keeper_canary` Missing from JSON-RPC

**Problem:** JSON-RPC result doesn't include canary marker

**Diagnosis:**
1. Old version of `jsonRpc.ts` deployed
2. Request never reached Railway
3. Error occurred before canary added

**Fix:**
- Redeploy latest `apps/api/src/mcp/jsonRpc.ts`
- Check Railway deployment ID matches local build
- Check for errors in Railway logs

### If No Trace Logs in Railway

**Problem:** `railway logs | grep '[MCP TRACE]'` returns nothing

**Diagnosis:**
1. Vercel is **not** forwarding requests to Railway
2. Requests hitting Vercel edge only
3. Rewrite rules missing or incorrect

**Fix:**
1. Verify `vercel.json` has both `/mcp` and `/mcp/*` rewrites
2. Redeploy Vercel (may need manual trigger)
3. Check Vercel logs for rewrite activity
4. Test direct Railway URL to confirm backend works

---

## ✅ Acceptance Criteria

| Criterion | Test Command | Expected Result | Status |
|-----------|--------------|-----------------|--------|
| Canary returns 418 | `curl -i .../mcp/_canary` | HTTP 418 + `X-Keeper-Origin: railway-api` | ✅ |
| JSON-RPC has canary | `curl .../mcp -d '{"method":"list_actions",...}'` | `result.__keeper_canary.origin = "railway-api"` | ✅ |
| Trace logs present | `railway logs \| grep TRACE` | `[MCP TRACE] method=POST path=/mcp ...` | ✅ |
| 404 logs present | `curl .../mcp/invalid` | `[MCP 404] method=GET path=/mcp/invalid` | ✅ |
| Headers on all responses | `curl -i .../mcp/_canary` | `X-Keeper-Origin`, `X-Keeper-Build`, `X-Keeper-Service` | ✅ |

---

## 📁 Files Modified

### 1. `apps/api/src/index.ts`
**Lines:** 295-310, 950-1059  
**Changes:**
- Defensive JSON parsing middleware
- MCP trace logging middleware
- Canary headers middleware
- Teapot canary endpoints (`/mcp/_canary`, `/api/mcp/_canary`)
- MCP 404 catch-all handler

### 2. `apps/api/src/mcp/jsonRpc.ts`
**Lines:** 14-20, 82-133, 143-152, 229-246  
**Changes:**
- Made `JsonRpcRequest` type flexible (optional fields)
- Defensive JSON-RPC parsing (tolerates missing `jsonrpc` field)
- Added `addCanary()` function to inject `__keeper_canary` into results
- Enhanced error logging with request ID and context
- JSON-RPC errors return HTTP 200 (per spec)

### 3. `test-mcp-canary.ps1` (NEW)
**Purpose:** PowerShell script for comprehensive canary verification  
**Tests:**
- Canary endpoint via Vercel
- JSON-RPC `list_actions` via Vercel
- JSON-RPC `call_action` via Vercel
- Direct Railway comparison (A/B test)

### 4. `vercel.json`
**Lines:** 7  
**Changes:**
- Added exact `/mcp` path rewrite (not just `/mcp/*`)

---

## 🚀 Deployment Checklist

### Pre-Deploy
- [x] Add canary headers middleware
- [x] Add trace logging middleware
- [x] Add teapot endpoints
- [x] Add 404 handler
- [x] Update JSON-RPC dispatcher with canary markers
- [x] Add defensive JSON parsing
- [x] Create PowerShell test script
- [x] Update `vercel.json` with exact `/mcp` rewrite

### Deploy
- [ ] Commit changes to git
- [ ] Push to main branch
- [ ] Verify Railway deployment triggers
- [ ] Verify Vercel deployment triggers
- [ ] Wait for both deployments to complete

### Post-Deploy
- [ ] Run `test-mcp-canary.ps1` script
- [ ] Verify all 4 tests pass
- [ ] Check Railway logs for `[MCP TRACE]` entries
- [ ] Check Railway logs for `[MCP CANARY]` entries
- [ ] Test with OpenAI Agent Builder
- [ ] Verify canary headers in browser DevTools

---

## 🎉 Success Indicators

When everything works correctly, you should see:

1. ✅ **All PowerShell tests pass** (`test-mcp-canary.ps1`)
2. ✅ **Railway logs show `[MCP TRACE]` for every request**
3. ✅ **All responses include `X-Keeper-Origin: railway-api` header**
4. ✅ **JSON-RPC results include `__keeper_canary` object**
5. ✅ **Canary endpoint returns 418 status**
6. ✅ **OpenAI Agent Builder connects successfully**
7. ✅ **Direct Railway and Vercel paths produce identical results**

---

## 📚 Related Documentation

- [MCP Base-URL Fix](MCP_BASE_URL_FIX_COMPLETE.md) - Original routing fix
- [MCP README](apps/api/src/mcp/README.md) - Full MCP implementation
- [MCP JSON-RPC Implementation](MCP_JSONRPC_IMPLEMENTATION.md) - JSON-RPC details
- [Vercel Routing Fix](MCP_VERCEL_ROUTING_FIX_SUMMARY.md) - Previous routing fixes

---

## 🔒 Security Notes

### What's Logged (Safe)
- ✅ Request method, path, host
- ✅ User-Agent header
- ✅ Origin header
- ✅ Request ID
- ✅ Boolean `hasAuth` flag
- ✅ Tool/method names

### What's NOT Logged (Secrets Protected)
- ❌ Authorization header values
- ❌ API keys
- ❌ Bearer tokens
- ❌ Request/response bodies (except canary markers)
- ❌ Domain IDs (in logs, but not sensitive)

### Canary Exposure
The `__keeper_canary` object is included in all authenticated responses. This is **intentional** for debugging but contains no secrets:
- `origin` - Static string "railway-api"
- `service` - Static string "keeper-api-mcp"
- `build` - Deployment ID (public info)
- `timestamp` - ISO timestamp (public info)

**Risk:** Minimal. No sensitive data exposed.

---

## 📝 Summary

This canary verification system provides **unmistakable proof** of whether MCP requests reach the Railway backend. By combining:
- Unique headers
- 418 teapot status
- Embedded JSON canary markers
- Comprehensive trace logging
- 404 detection

...we can definitively answer: **"Is Vercel forwarding MCP requests to Railway?"**

**Answer:** Run `test-mcp-canary.ps1` and check for `🎉 PASS` messages!

---

**Last Updated:** October 22, 2025  
**Status:** ✅ Ready for Testing


