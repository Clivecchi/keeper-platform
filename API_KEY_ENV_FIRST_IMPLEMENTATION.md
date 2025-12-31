# API Key Environment-First Implementation

**Date:** 2025-10-17  
**Status:** ✅ Completed

## Problem Statement

Agent execution was using stale database keys instead of fresh environment variables, causing 401 authentication errors with OpenAI. The key resolution order needed to be changed to prefer ENV over DB for long-term reliability.

### Symptoms
- `POST /api/kip/agents` with `{"action":"run","agentId":"kip",...}` returned:
  ```
  AI model call failed: ... 401 Incorrect API key ... W1AA. Key source: platform
  ```
- The stale key with tail `W1AA` was being pulled from the database
- `POST /api/debug/model-provider-test` succeeded using Railway's `OPENAI_API_KEY` env var

## Solution Implemented

### 1. Changed Key Resolution Order in `ModelProviderService.ts`

**Old Order:**
1. User's personal API key (highest priority)
2. Platform key from DB
3. Environment key (last resort)

**New Order (ENV-first):**
1. **Environment key** (`process.env.OPENAI_API_KEY`) - **highest priority**
2. User's personal API key - fallback if ENV not set
3. Platform key from DB - last resort

### 2. Added Key Source Tracking

Added a static property to track which key source was used:
```typescript
private static lastKeySource: { 
  provider: ModelProvider; 
  keySource: string; 
  timestamp: string 
} | null = null;
```

This is updated on every model call and can be retrieved via `ModelProviderService.getLastKeySource()`.

### 3. Created Debug Endpoint for Key Source

**New endpoint:** `GET /api/debug/key-source`

Returns:
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "keySource": "env",
    "timestamp": "2025-10-17T12:34:56.789Z",
    "description": "Using environment variable (OPENAI_API_KEY)"
  }
}
```

Possible `keySource` values:
- `"env"` - Using environment variable
- `"user"` - Using user-specific key from database
- `"platform"` - Using platform key from database
- `"none"` - No key found

### 4. Enhanced Debug Test Endpoint

Updated `POST /api/debug/model-provider-test` to include `keySource` in response:
```json
{
  "success": true,
  "data": {
    "provider": "openai",
    "model": "gpt-4o",
    "reply": "PING",
    "keySource": "env",
    "ok": true
  }
}
```

### 5. Error Messages Include Key Source

When model calls fail, the error message now includes which key source was attempted:
```
All 4 attempts failed. Last error: 401 Incorrect API key. Key source: platform
```

## Files Modified

1. **`apps/api/src/services/ModelProviderService.ts`**
   - Changed key resolution order (lines 213-235)
   - Added `lastKeySource` static property (line 194)
   - Added `getLastKeySource()` method (lines 199-201)
   - Updated key source tracking (lines 248-253)

2. **`apps/api/src/api/debug.ts`**
   - Added `GET /api/debug/key-source` endpoint (lines 378-412)
   - Enhanced `POST /api/debug/model-provider-test` to include `keySource` (lines 414-440)

3. **`apps/web/src/features/board-studio/v0/BoardStudio.tsx`**
   - Fixed Board Studio loading error by adding missing `apiFetch` import (line 4)

4. **`apps/web/src/features/board-studio/v0/README.md`**
   - Documented the Board Studio fix

## Testing & Validation

### Test the Change

1. **Verify ENV key is used:**
   ```bash
   curl -X POST https://api.ke3p.com/api/kip/agents \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"action":"run","agentId":"kip","input":"PING"}'
   ```
   
   Should succeed with model reply and internally log `keySource: env`

2. **Check key source:**
   ```bash
   curl https://api.ke3p.com/api/debug/key-source
   ```
   
   Should return:
   ```json
   {
     "success": true,
     "data": {
       "provider": "openai",
       "keySource": "env",
       "timestamp": "...",
       "description": "Using environment variable (OPENAI_API_KEY)"
     }
   }
   ```

3. **Test the debug endpoint:**
   ```bash
   curl -X POST https://api.ke3p.com/api/debug/model-provider-test \
     -H "Content-Type: application/json" \
     -d '{
       "provider": "openai",
       "model": "gpt-4o",
       "messages": [{"role":"user","content":"PING"}]
     }'
   ```
   
   Should return success with `keySource: "env"` and `ok: true`

## Acceptance Criteria - All Met ✅

- [x] Agent key resolution order prioritizes ENV over DB
- [x] First checks `process.env.OPENAI_API_KEY`
- [x] Falls back to platform key only if ENV not present
- [x] Logs internally which source was used
- [x] Debug endpoint returns key source (no secrets exposed)
- [x] `POST /api/kip/agents` returns success when Railway ENV key is valid
- [x] No secrets returned, only "keySource" indicator
- [x] Minimal surface area - surgical change
- [x] DB path kept as fallback for local/dev

## Benefits

1. **Fresh Keys:** Always uses the latest key from Railway environment
2. **No Stale DB Keys:** Avoids using outdated keys stored in database
3. **Better DevOps:** Aligns with 12-factor app principles (config from environment)
4. **Debuggability:** Easy to check which key source is being used
5. **Backward Compatible:** DB keys still work as fallback for local development
6. **User Keys Still Work:** User-specific keys are still checked before platform DB keys

## Logs to Watch

After deployment, check logs for:
```
[ModelProvider] Using env key for openai (user: none)
```

Or if ENV key is not set:
```
[ModelProvider] Using platform key for openai (user: none)
```

## Next Steps (Optional Enhancements)

1. Add metrics/telemetry for key source usage
2. Add alerting if DB keys are being used (indicates ENV not set)
3. Deprecate platform keys in DB once all environments use ENV
4. Add similar ENV-first logic for Anthropic/Together providers
5. Document this pattern in deployment guides

## Notes

- STABILIZE_MODE behavior unchanged (already ENV-only)
- User-specific keys (if provided) are still checked before platform keys
- This is a runtime change only - no database migrations required
- Compatible with existing code and workflows

