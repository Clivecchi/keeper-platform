# MCP Fix Deployment Checklist

**Date**: October 20, 2025  
**Fix**: Updated `apps/web/vercel.json` to proxy `/mcp/*` to Railway

## Pre-Deployment

- [x] Updated `apps/web/vercel.json` with `/mcp/*` rewrite
- [x] Updated root `vercel.json` (for consistency)
- [x] Both files have identical routing rules
- [x] No linter errors
- [x] Documentation created

## Deployment Commands

```bash
# 1. Check current status
git status

# 2. Stage the files
git add apps/web/vercel.json vercel.json MCP_VERCEL_FIX_FINAL.md MCP_FIX_DEPLOY_CHECKLIST.md

# 3. Commit
git commit -m "fix: Add /mcp/* rewrite to apps/web/vercel.json (active config)

Root cause: Previous fix updated wrong file (root vercel.json).
Vercel uses apps/web/vercel.json for routing.

Changes:
- Added /mcp/* proxy to Railway backend  
- Added missing SPA catch-all fallback
- Updated both files for consistency"

# 4. Push to deploy
git push origin main
```

## Post-Deployment Verification (2 minutes after push)

### 1. Quick Smoke Test
```bash
# Should return JSON, not HTML
curl -i https://api.ke3p.com/mcp/health
```

**✅ Success indicators:**
- Status: `200 OK`
- Content-Type: `application/json; charset=utf-8`
- Header: `x-railway-edge: ...` (proves Railway handled it)
- Body: JSON with `{"ok":true,"service":"keeper-mcp",...}`

**❌ Still broken:**
- Content-Type: `text/html`
- Header: `x-vercel-id: ...` (proves Vercel SPA served it)
- Body: HTML with `<!DOCTYPE html>`

### 2. Auth Test
```bash
# With valid token - should return JSON tool list
curl -i https://api.ke3p.com/mcp/tools \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"

# Without token - should return 401 JSON
curl -i https://api.ke3p.com/mcp/tools
```

### 3. Run Probe
```bash
curl https://api.ke3p.com/api/debug/opai-mcp-probe | jq
```

**Expected output:**
```json
{
  "reachable": true,
  "authOk": true,
  "handshakeOk": true,  // ← This should now be TRUE!
  "tools": ["gk_recent_moments", "pool_create_quote"],
  "error": null
}
```

### 4. Check All MCP Endpoints
```bash
# All should return JSON with auth
export KEY="$OPAI_AGENT_MCP_KEY"

curl -s https://api.ke3p.com/mcp/tools -H "Authorization: Bearer $KEY" | jq '.tools | length'
# Expected: 2 (or more)

curl -s https://api.ke3p.com/mcp/capabilities -H "Authorization: Bearer $KEY" | jq '.capabilities'
# Expected: {"tools":true,"toolExecution":true,"domainScoping":true}

curl -s https://api.ke3p.com/mcp/.well-known/mcp -H "Authorization: Bearer $KEY" | jq '.endpoints'
# Expected: Object with endpoint paths
```

### 5. OpenAI Agent Builder
1. Go to OpenAI Agent Builder
2. Check MCP connection status
3. Should show: **"Connected"** ✅
4. Tools list should be populated

## Rollback Plan (If Needed)

If verification fails:

```bash
# Option 1: Quick revert
git revert HEAD
git push origin main

# Option 2: Manual fix
# Edit apps/web/vercel.json to remove /mcp/* line
git add apps/web/vercel.json
git commit -m "revert: Remove /mcp/* rewrite (rollback)"
git push origin main
```

## Success Criteria

ALL must be true:

- [ ] `/mcp/health` returns JSON (not HTML)
- [ ] Response has `x-railway-edge` header
- [ ] `/mcp/tools` with auth returns JSON tool list
- [ ] `/mcp/tools` without auth returns 401 JSON
- [ ] `/mcp/capabilities` returns JSON
- [ ] `/mcp/.well-known/mcp` returns JSON
- [ ] Probe shows `handshakeOk: true`
- [ ] OpenAI Agent Builder shows "Connected"
- [ ] No `/mcp/*` endpoint returns HTML

## Files Changed

1. **`apps/web/vercel.json`** - ⭐ PRIMARY FIX (active routing config)
2. **`vercel.json`** (root) - Updated for consistency
3. **`MCP_VERCEL_FIX_FINAL.md`** - Root cause analysis
4. **`MCP_FIX_DEPLOY_CHECKLIST.md`** - This checklist

## Key Learnings

1. **Monorepo Confusion**: Root `vercel.json` has build config, but `apps/web/vercel.json` has routing
2. **Vercel Priority**: Always check which config file Vercel is actually using
3. **Rewrite Order**: Specific routes MUST come before catch-all `/(.*)`
4. **Header Fingerprints**: `x-railway-edge` vs `x-vercel-id` reveals which service responded

## Timeline

- **Initial attempt**: Updated root `vercel.json` ❌ (wrong file)
- **Second attempt**: Updated `apps/web/vercel.json` ✅ (correct file)
- **Expected resolution**: 1-2 minutes after push

---

**Ready to deploy?** Follow the commands above! 🚀

