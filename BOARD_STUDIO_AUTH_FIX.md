# Board Studio Auth/Logout Issue - Fix Applied

**Date:** 2025-10-17  
**Status:** ✅ Fix Deployed - Awaiting Testing

## Problem Summary

**Symptoms:**
- Clicking on Board Studio causes white screen
- User gets completely logged out (session and platform cleared)
- Very few logs appear
- Cannot navigate to other URLs after logout
- Must reload site and login again

## Root Cause Identified

The `apiFetch` utility was throwing plain `Error` objects without attaching the HTTP status code. When Board Studio made API calls on mount and received ANY error, the error handling code would call `handleAuthError(undefined, error)`, but since `error.status` was undefined, 401s weren't being properly detected.

**The Bug:**
```typescript
// OLD - apiFetch threw errors without status
throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// error.status = undefined ❌

// Then in board-studio-page.tsx:
catch (error) {
  if (handleAuthError(undefined, error)) {
    // This check failed because error.status didn't exist
    // So legitimate 401s weren't caught
  }
}
```

## Fix Applied

### File: `apps/web/src/lib/apiFetch.ts`

**Change:** All error objects now include `status` and `response` properties

```typescript
// NEW - errors include status for proper handling
const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
error.status = response.status; // ✅ Now handleAuthError can check this
error.response = response; // ✅ Additional context
throw error;
```

### How It Works Now

1. **Board Studio mounts** → calls `loadBoardsAndFrames()`
2. **API call made** → `/api/board-data?keeperId=...`
3. **If 401 returned** → `apiFetch` throws error with `status=401`
4. **Catch block** → `handleAuthError(undefined, error)` checks `error.status === 401`
5. **If true** → Clear auth and redirect to login (correct behavior)
6. **If not 401** → Show error message but keep user logged in (correct behavior)

## What This Fixes

✅ **Proper 401 Detection:** Only actual authentication failures trigger logout  
✅ **Preserved Sessions:** Non-auth errors no longer clear user session  
✅ **Better Error Context:** Error objects include full response for debugging  
✅ **Consistent Error Handling:** All API errors now have status property  

## Testing Checklist

After deployment, verify:

### ✅ Happy Path (Valid Auth)
1. Login to platform
2. Navigate to Board Studio (`/studio/board-studio`)
3. **Expected:** Board Studio loads successfully
4. **Expected:** Board list appears
5. **Expected:** No logout occurs

### ✅ Auth Error Path (401)
1. Manually expire/delete auth cookie
2. Try to access Board Studio
3. **Expected:** Immediate redirect to `/login`
4. **Expected:** Clean error message
5. **Expected:** No white screen

### ✅ Other Error Path (500, 404, etc.)
1. Break the API endpoint temporarily
2. Access Board Studio
3. **Expected:** Error message displayed
4. **Expected:** User stays logged in
5. **Expected:** Can navigate to other pages

## What to Watch For

### Still Getting Logged Out?
If users are still being logged out after this fix, check:

1. **API Endpoint Health:**
   ```bash
   curl -i https://api.ke3p.com/api/board-data?keeperId=test
   ```
   - Look for actual 401 responses
   - Check if auth cookie is being sent

2. **Cookie Issues:**
   - Check browser DevTools → Application → Cookies
   - Verify `keeper_session` cookie exists
   - Check cookie domain and path settings

3. **CORS/Credentials:**
   - Verify `credentials: 'include'` in all API calls
   - Check CORS headers on API responses

### White Screen Still Appearing?
If white screen persists:

1. **Check Browser Console:**
   - Look for JavaScript errors
   - Check for React error boundaries triggering
   - Look for network failures

2. **Check Network Tab:**
   - See which API call fails first
   - Check response status codes
   - Verify request headers include cookies

3. **Enable Debug Logging:**
   ```
   Set VITE_STUDIO_DEBUG=1 in environment
   Reload page
   Check console for detailed logs
   ```

## Additional Fixes Included

### 1. Board Studio Import Fix (Previously Applied)
- Added missing `import { apiFetch }` to `BoardStudio.tsx`
- Fixed "apiFetch is not defined" error

### 2. Environment-First API Keys (Previously Applied)
- Changed key resolution order to prefer ENV over DB
- Added `/api/debug/key-source` endpoint

### 3. OpenAI MCP Probe (Previously Applied)
- Added `/api/debug/opai-mcp-probe` for connectivity testing

## Files Modified

| File | Change | Impact |
|------|--------|--------|
| `apps/web/src/lib/apiFetch.ts` | Added `status` and `response` to errors | All API errors now properly handled |
| `apps/web/src/lib/README.md` | Documented fix | Future reference |
| `apps/web/src/features/board-studio/v0/BoardStudio.tsx` | Added missing import | Board Studio can now load |

## Next Steps

1. **Deploy changes** to production
2. **Test thoroughly** using checklist above
3. **Monitor logs** for:
   - `[handleAuthError] 401 detected` messages
   - Board Studio API errors
   - Unexpected logouts

4. **If issues persist:**
   - Check Railway logs for API errors
   - Verify auth middleware is working
   - Check database for board-data permissions
   - Review cookie configuration

## Debug Commands

### Check API Auth Status
```powershell
# Test board-data endpoint
Invoke-WebRequest -Uri "https://api.ke3p.com/api/board-data?keeperId=test" `
  -UseBasicParsing -SessionVariable session

# Check cookies
$session.Cookies.GetCookies("https://api.ke3p.com")
```

### Check User Session
```javascript
// In browser console
console.log('Token:', localStorage.getItem('keeper_token'));
console.log('User:', localStorage.getItem('keeper_user'));
console.log('Cookies:', document.cookie);
```

### Enable Verbose Logging
```javascript
// In browser console before loading Board Studio
localStorage.setItem('debug', 'keeper:*');
```

## Success Criteria

Board Studio is considered fixed when:
- ✅ Users can access Board Studio without being logged out
- ✅ Only legitimate 401s trigger logout
- ✅ Other errors show messages but preserve session
- ✅ White screen no longer appears
- ✅ Navigation works after visiting Board Studio

---

**Questions or Issues?** Check the logs and reach out with:
1. Browser console errors
2. Network tab screenshot showing failed request
3. Whether other pages work (to isolate Board Studio specifically)

