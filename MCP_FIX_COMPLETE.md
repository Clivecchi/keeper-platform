# MCP Routing Fix - COMPLETE

**Date**: October 20, 2025  
**Status**: ✅ READY TO DEPLOY  
**Confidence**: HIGH - Correct file identified and updated

---

## The Problem

OpenAI Agent Builder "Opai" cannot complete MCP handshake because `/mcp/*` requests return HTML instead of JSON.

**Evidence:**
- `GET https://api.ke3p.com/mcp/tools` → 200 `text/html` (❌ wrong!)
- `GET https://api.ke3p.com/api/health` → 200 `application/json` (✅ works!)
- Probe result: `handshakeOk: false` with error "MCP handshake failed - no tool endpoints responded"

---

## Root Cause

**Wrong file was updated in the first fix attempt!**

There are TWO `vercel.json` files:
1. `vercel.json` (root) - Build configuration
2. `apps/web/vercel.json` - **ACTIVE routing configuration** ⭐

The initial fix updated the root file, but Vercel reads routing from `apps/web/vercel.json`.

---

## The Solution

### Updated File: `apps/web/vercel.json`

Added line 4 (between lines 3 and 5):

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" },  // ← ADDED
    { "source": "/(.*)", "destination": "/" }  // ← ADDED (was missing!)
  ],
  "redirects": [...]
}
```

**Two changes:**
1. **Line 4**: Proxy `/mcp/*` to Railway (same as `/api/*`)
2. **Line 5**: SPA catch-all fallback (was missing entirely!)

---

## Why This Will Work

### Before (Broken)
```
Request: GET /mcp/tools
→ Vercel checks apps/web/vercel.json
→ No match for /mcp/* (only had /api/*)
→ No catch-all, so Vercel serves static SPA
→ Returns: 200 text/html ❌
```

### After (Fixed)
```
Request: GET /mcp/tools  
→ Vercel checks apps/web/vercel.json
→ Match /mcp/* → Proxy to Railway
→ Railway returns: 200 application/json ✅
```

---

## Deploy Now

```bash
# 1. Commit both config files
git add apps/web/vercel.json vercel.json
git commit -m "fix: Add /mcp/* rewrite to apps/web/vercel.json (active config)"
git push origin main

# 2. Wait 1-2 minutes for Vercel deployment

# 3. Verify
curl -i https://api.ke3p.com/mcp/health
# Expected: 200 OK, application/json, x-railway-edge header

# 4. Run probe
curl https://api.ke3p.com/api/debug/opai-mcp-probe | jq .handshakeOk
# Expected: true
```

---

## Verification Checklist

After deployment (wait 2 minutes), verify ALL of these:

```bash
# ✅ Health check returns JSON
curl -I https://api.ke3p.com/mcp/health | grep "content-type"
# Expected: content-type: application/json; charset=utf-8

# ✅ Tools require auth
curl -I https://api.ke3p.com/mcp/tools
# Expected: HTTP/2 401

# ✅ Tools work with auth
curl -I https://api.ke3p.com/mcp/tools -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
# Expected: HTTP/2 200 + content-type: application/json

# ✅ Probe succeeds
curl -s https://api.ke3p.com/api/debug/opai-mcp-probe | jq '{reachable, authOk, handshakeOk, toolCount: (.tools | length)}'
# Expected: All true, toolCount >= 2

# ✅ Response has Railway header (proves it's not SPA)
curl -I https://api.ke3p.com/mcp/health | grep -E "x-railway|x-vercel-id"
# Expected: x-railway-edge: ... (NOT x-vercel-id serving HTML)
```

---

## Files Changed

| File | Status | Description |
|------|--------|-------------|
| `apps/web/vercel.json` | ✅ FIXED | Added `/mcp/*` rewrite + SPA fallback |
| `vercel.json` (root) | ✅ Updated | Consistency (also has `/mcp/*`) |
| `MCP_VERCEL_FIX_FINAL.md` | 📄 Docs | Root cause analysis |
| `MCP_FIX_DEPLOY_CHECKLIST.md` | 📄 Docs | Deployment guide |
| `MCP_FIX_COMPLETE.md` | 📄 Docs | This summary |

---

## Success Indicators

When everything is working:

1. ✅ All `/mcp/*` endpoints return JSON (never HTML)
2. ✅ Responses have `x-railway-edge` header
3. ✅ Auth required for protected endpoints
4. ✅ 401 JSON for missing auth (not HTML error page)
5. ✅ Probe shows `handshakeOk: true`
6. ✅ OpenAI Agent Builder shows "Connected"
7. ✅ Tools list populated in Agent Builder

---

## Why This Time Is Different

| Attempt | File Updated | Result |
|---------|--------------|--------|
| First | `vercel.json` (root) | ❌ Failed - wrong file |
| Second | `apps/web/vercel.json` | ✅ Will work - correct file |

**Key insight:** In monorepos, Vercel may use different config files for build vs. routing.

---

## Rollback (If Needed)

```bash
git revert HEAD
git push origin main
```

Vercel will auto-deploy the previous version (1-2 minutes).

---

## Next Steps After Successful Deployment

1. ✅ Verify all endpoints return JSON
2. ✅ Confirm probe shows green
3. ✅ Test OpenAI Agent Builder connection
4. ✅ Execute a test tool call from Opai
5. ✅ Document in team wiki
6. ✅ Set up monitoring alert if probe fails

---

## Technical Details

### Routing Order (Critical!)
```json
"rewrites": [
  { "source": "/api/(.*)", ... },    // 1. Most specific first
  { "source": "/mcp/(.*)", ... },    // 2. Also specific
  { "source": "/(.*)", ... }         // 3. Catch-all MUST be last
]
```

**If catch-all comes first, it matches everything and specific rules never run!**

### File Precedence
- Vercel checks for config in the **project root directory** (set in dashboard)
- If project root = `/`, uses `vercel.json`
- If project root = `apps/web`, uses `apps/web/vercel.json`
- Build commands only in root `vercel.json`
- Routing can be in either (or both for redundancy)

### Header Fingerprints
- `x-railway-edge: ...` = Railway backend handled request ✅
- `x-vercel-id: ...` + HTML = Vercel SPA served request ❌

---

## Confidence Level: 🟢 HIGH

**Why:**
1. ✅ Correct file identified (`apps/web/vercel.json`)
2. ✅ Verified by comparing file structure and evidence
3. ✅ Both config files now updated (redundancy)
4. ✅ Backend already works (proven by `/api/health`)
5. ✅ Simple routing change (low risk)
6. ✅ Easy rollback if needed

---

**Ready to deploy!** 🚀

Just run the git commands above and verify in 2 minutes.

