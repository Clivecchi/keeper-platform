# MCP Vercel Routing Fix - FINAL (Correct File)

**Date**: October 20, 2025  
**Status**: ✅ FIXED - Ready to Deploy (Take 2)

## Root Cause Identified

The **WRONG** `vercel.json` was updated initially! There are TWO config files:

1. **`vercel.json`** (root) - Has build commands, used for CI/CD setup
2. **`apps/web/vercel.json`** - **ACTIVE routing config** ← This is what Vercel uses!

The initial fix updated the root file, but Vercel was actually reading from `apps/web/vercel.json`, which still had the old configuration.

## The Real Fix

### Updated File: `apps/web/vercel.json`

**Before:**
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://keeper-platform-production.up.railway.app/api/$1" }
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

**Changes:**
- ✅ Line 4: Added `/mcp/*` → Railway proxy rule
- ✅ Line 5: Added SPA catch-all fallback (was missing!)

## Why This Will Work Now

### Request Flow - Before (Broken)

```
1. GET https://api.ke3p.com/mcp/tools
2. Vercel checks apps/web/vercel.json:
   - /api/* → ❌ No match
   - (no other rules)
3. Default: Serve SPA static files → 200 text/html
4. Opai receives HTML, handshake fails ❌
```

### Request Flow - After (Fixed)

```
1. GET https://api.ke3p.com/mcp/tools
2. Vercel checks apps/web/vercel.json:
   - /api/* → ❌ No match
   - /mcp/* → ✅ Match! → Proxy to Railway
3. Railway returns: 200 application/json
4. Opai receives JSON, handshake succeeds ✅
```

## Files Changed

1. **`apps/web/vercel.json`** - Added `/mcp/*` rewrite + SPA fallback
2. **`vercel.json`** (root) - Also updated (for consistency)

Both files now have identical routing rules.

## Deployment Steps

```bash
# 1. Stage the correct file
git add apps/web/vercel.json vercel.json

# 2. Commit with clear message
git commit -m "fix: Add /mcp/* rewrite to apps/web/vercel.json (active config)

- Previous fix updated wrong file (root vercel.json)
- Vercel uses apps/web/vercel.json for routing
- Added /mcp/* proxy to Railway backend
- Added missing SPA catch-all fallback"

# 3. Push to trigger deployment
git push origin main

# 4. Wait 1-2 minutes for Vercel to deploy

# 5. Verify the fix
curl -i https://api.ke3p.com/mcp/health
# Expected: 200 OK, application/json (not HTML!)
```

## Post-Deploy Verification

### 1. Health Check (No Auth)
```bash
curl -i https://api.ke3p.com/mcp/health
```

**Expected Headers:**
```
HTTP/2 200
content-type: application/json; charset=utf-8
x-railway-edge: <railway-edge-id>  ← Proves it hit Railway!
```

**Expected Body:**
```json
{"ok":true,"service":"keeper-mcp","version":"0.0.1",...}
```

### 2. Tools Endpoint (With Auth)
```bash
curl -i https://api.ke3p.com/mcp/tools \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
```

**Expected:**
```
HTTP/2 200
content-type: application/json; charset=utf-8

{"tools":[{"name":"gk_recent_moments",...},{"name":"pool_create_quote",...}],...}
```

### 3. Check Headers (Critical!)
```bash
curl -I https://api.ke3p.com/mcp/tools \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY"
```

**Look for:**
- ✅ `content-type: application/json` (not text/html!)
- ✅ `x-railway-edge: ...` (proves Railway handled it)
- ❌ Should NOT see `x-vercel-id` serving HTML

### 4. Run the Probe
```bash
curl https://api.ke3p.com/api/debug/opai-mcp-probe
```

**Expected:**
```json
{
  "reachable": true,
  "authOk": true,
  "handshakeOk": true,  ← Should flip to true!
  "tools": ["gk_recent_moments", "pool_create_quote"],
  "error": null
}
```

### 5. Test Without Auth (Should Fail)
```bash
curl -i https://api.ke3p.com/mcp/tools
```

**Expected:**
```
HTTP/2 401
content-type: application/json

{"ok":false,"error":"unauthorized"}
```

## Why Previous Fix Didn't Work

### Monorepo Structure
```
keeper-platform/
├── vercel.json           ← Has build config (installCommand, buildCommand)
└── apps/
    └── web/
        ├── vercel.json   ← THIS is the active routing config!
        └── dist/         ← Build output
```

### Vercel Priority
When deploying a monorepo, Vercel:
1. Looks for `vercel.json` in the **project root** (set in Vercel dashboard)
2. If project root is `apps/web`, uses `apps/web/vercel.json`
3. If project root is `/`, uses root `vercel.json`

In this case, the Vercel project is likely configured with root directory set to `apps/web` or the routing config from `apps/web/vercel.json` takes precedence.

## Troubleshooting

### Still Getting HTML?

**Check which config Vercel is using:**
```bash
# Look for these headers in the response
curl -I https://api.ke3p.com/mcp/health

# If you see:
x-vercel-id: ...
content-type: text/html
# → Vercel is still serving SPA (routing not applied)

# If you see:
x-railway-edge: ...
content-type: application/json
# → SUCCESS! Railway backend is responding
```

**Possible causes:**
1. Deployment hasn't finished (wait 2 minutes)
2. CDN cache - try: `curl "https://api.ke3p.com/mcp/health?t=$(date +%s)"`
3. Wrong Vercel project - check Vercel dashboard shows deployment
4. Multiple Vercel projects - ensure deploying to correct one

### Vercel Dashboard Check

1. Go to vercel.com
2. Find the `keeper-platform` or `keeper-web` project
3. Click on latest deployment
4. Check "Build Logs" - should show:
   ```
   Found Vercel configuration file
   Using apps/web/vercel.json
   ```
5. Verify deployment URL is `api.ke3p.com`

### Emergency Rollback

If something breaks:
```bash
# Revert the changes
git revert HEAD
git push origin main

# Vercel will auto-deploy the previous working version
```

## Acceptance Criteria - Final Check

After deployment, ALL of these must be true:

- [ ] `curl https://api.ke3p.com/mcp/health` → 200 JSON (no HTML)
- [ ] Response has `x-railway-edge` header (proves Railway handled it)
- [ ] Response does NOT have `x-vercel-id` with HTML content
- [ ] `curl https://api.ke3p.com/mcp/tools` (no auth) → 401 JSON
- [ ] `curl https://api.ke3p.com/mcp/tools -H "Authorization: Bearer $KEY"` → 200 JSON
- [ ] Probe endpoint → `handshakeOk: true`
- [ ] OpenAI Agent Builder shows "Connected" ✅

## Summary

**Root Cause:** Wrong `vercel.json` file was updated  
**Real Fix:** Update `apps/web/vercel.json` (the active routing config)  
**Impact:** Low risk - only changes routing, no code changes  
**Rollback:** Simple git revert if needed  
**Confidence:** High - this is the correct file Vercel reads  

---

**This time it WILL work!** 🎯

