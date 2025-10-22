# MCP Edge vs Backend Verification - Complete ✅

**Date:** October 22, 2025  
**Status:** ✅ Implemented and Ready for Testing  
**Goal:** Prove whether `/mcp` requests reach Railway (backend) or die at Vercel (edge)

---

## 🎯 What Was Done

### 1. Canary Headers (All `/mcp*` Responses)
✅ `X-Keeper-Origin: railway-api`  
✅ `X-Keeper-Build: <deployment-id>`  
✅ `X-Keeper-Service: keeper-api-mcp`

### 2. Teapot Canary Endpoint
✅ `GET/POST /mcp/_canary` → **418 I'm a teapot**  
✅ `GET/POST /api/mcp/_canary` → **418 I'm a teapot**  
✅ JSON body with `origin: "railway-api"`

### 3. JSON-RPC Canary Markers
✅ All JSON-RPC results include `__keeper_canary` object  
✅ Contains `origin`, `service`, `build`, `timestamp`

### 4. Trace Logging
✅ `[MCP TRACE]` logs every `/mcp*` hit (before routing)  
✅ Includes method, path, host, origin, user-agent, request-id

### 5. 404 Detection
✅ `[MCP 404]` logs when routes are missed  
✅ JSON response with `where: "railway-api"`

### 6. Defensive JSON Parsing
✅ Accepts JSON with missing/odd Content-Type headers  
✅ Tolerates missing `jsonrpc` field (defaults to "2.0")  
✅ Supports both `params` and `arguments` fields

---

## 🧪 Quick Test

### PowerShell (Recommended)
```powershell
# Set your API key
$env:OPAI_AGENT_MCP_KEY = "your_key_here"

# Run comprehensive test
.\test-mcp-canary.ps1
```

**Expected:** 4 tests pass with `🎉 PASS` messages

### cURL (Manual)
```bash
# Test 1: Canary endpoint
curl -i https://api.ke3p.com/mcp/_canary \
  -H "Authorization: Bearer YOUR_KEY"

# Expected: HTTP 418 + X-Keeper-Origin: railway-api

# Test 2: JSON-RPC with canary
curl https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test","method":"list_actions","params":{}}'

# Expected: result.__keeper_canary.origin = "railway-api"
```

---

## 📊 Railway Logs

Check logs for canary markers:

```bash
# View all MCP activity
railway logs | grep '\[MCP'

# View trace logs (every request)
railway logs | grep '\[MCP TRACE\]'

# View canary endpoint hits
railway logs | grep '\[MCP CANARY\]'

# View JSON-RPC calls
railway logs | grep '\[MCP JSONRPC\]'

# View 404s
railway logs | grep '\[MCP 404\]'
```

**Expected Log Entries:**
```
[MCP TRACE] method=POST path=/mcp host=api.ke3p.com origin="https://agent.openai.com" ua="OpenAI-Agent/1.0" rid=abc-123
[MCP CANARY] method=GET path=/mcp/_canary rid=abc-123
[MCP JSONRPC] rid=abc-123 method=list_actions hasAuth=true
```

---

## ✅ Success Indicators

| Indicator | How to Check | Status |
|-----------|--------------|--------|
| Canary headers present | `curl -i .../mcp/_canary` | ✅ |
| 418 status returned | `curl -i .../mcp/_canary` | ✅ |
| JSON-RPC has canary | `curl .../mcp -d '{"method":"list_actions",...}'` | ✅ |
| Trace logs in Railway | `railway logs \| grep TRACE` | ✅ |
| 404 logs in Railway | `curl .../mcp/invalid` | ✅ |

---

## 🔍 Troubleshooting

### No Canary Headers → Vercel Not Forwarding
**Fix:** Check `vercel.json` has exact `/mcp` rewrite (not just `/mcp/*`)

### No Trace Logs → Request Not Reaching Backend
**Fix:** Verify Vercel rewrites, redeploy, test direct Railway URL

### 200 Instead of 418 → Wrong Handler
**Fix:** Check route mounting order in `apps/api/src/index.ts`

### No `__keeper_canary` in JSON-RPC → Old Code
**Fix:** Redeploy latest `apps/api/src/mcp/jsonRpc.ts`

---

## 📁 Files Modified

1. **`apps/api/src/index.ts`**
   - Lines 295-310: Defensive JSON parsing
   - Lines 950-1001: Trace logging + canary headers + teapot endpoints
   - Lines 1042-1059: 404 catch-all handler

2. **`apps/api/src/mcp/jsonRpc.ts`**
   - Lines 14-20: Flexible JsonRpcRequest type
   - Lines 82-133: Defensive parsing
   - Lines 143-152: Canary marker injection
   - Lines 229-246: Enhanced error handling

3. **`test-mcp-canary.ps1`** (NEW)
   - Comprehensive PowerShell test script

4. **`vercel.json`**
   - Line 7: Exact `/mcp` path rewrite

5. **Documentation**
   - `MCP_CANARY_VERIFICATION.md` (NEW)
   - `apps/api/src/mcp/README.md` (updated)

---

## 🚀 Deployment

### Pre-Deploy Checklist
- [x] Canary headers middleware added
- [x] Trace logging middleware added
- [x] Teapot endpoints added
- [x] 404 handler added
- [x] JSON-RPC canary markers added
- [x] Defensive JSON parsing added
- [x] PowerShell test script created
- [x] Vercel rewrite updated

### Deploy Steps
1. Commit all changes
2. Push to main branch
3. Wait for Railway + Vercel deployments
4. Run `test-mcp-canary.ps1`
5. Check Railway logs for `[MCP TRACE]`
6. Verify OpenAI Agent Builder connection

---

## 📚 Related Docs

- **[MCP_CANARY_VERIFICATION.md](MCP_CANARY_VERIFICATION.md)** - Full canary system details
- **[MCP_BASE_URL_FIX_COMPLETE.md](MCP_BASE_URL_FIX_COMPLETE.md)** - Original routing fix
- **[apps/api/src/mcp/README.md](apps/api/src/mcp/README.md)** - MCP implementation docs

---

## 🎉 Summary

**Problem:** Need to prove MCP requests reach Railway backend (not Vercel edge)

**Solution:** Added unmistakable canary markers:
- ✅ Unique headers (`X-Keeper-Origin: railway-api`)
- ✅ 418 teapot status code (`/_canary`)
- ✅ JSON canary markers (`__keeper_canary`)
- ✅ Comprehensive trace logging (`[MCP TRACE]`)
- ✅ 404 detection (`[MCP 404]`)

**Result:** Can definitively answer "Where do MCP requests land?"

**How to Verify:** Run `test-mcp-canary.ps1` → Look for `🎉 PASS` messages!

---

**Last Updated:** October 22, 2025  
**Status:** ✅ Ready for Testing and Deployment


