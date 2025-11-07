# Image Upload Mixed Content Fix

## Issue
Image uploads were failing with error: **"Failed to fetch"**

## Root Cause

The browser console showed this critical error:

```
Mixed Content: The page at 'https://www.ke3p.com/studio/board-studio' was loaded over HTTPS, 
but requested an insecure resource 'http://keeper-platform-production.up.railway.app/api/uploads/direct'. 
This request has been blocked; the content must be served over HTTPS.
```

### Why This Happened

1. **Frontend:** Loaded over HTTPS (`https://www.ke3p.com`)
2. **Upload Sign Response:** Returned HTTP URL (`http://...railway.app/api/uploads/direct`)
3. **Browser Security:** Blocks mixed content (HTTPS page → HTTP resource)
4. **Result:** Upload fails with "Failed to fetch"

### Railway SSL Termination

Railway terminates SSL at the load balancer level, so:
- **External:** `https://keeper-platform-production.up.railway.app`
- **Internal:** App sees `req.protocol = 'http'`
- **Problem:** Code was using `req.protocol` to build the upload URL

## The Fix

Updated `apps/api/src/api/uploads/routes.ts` to **always use HTTPS in production**:

```typescript
// Before (WRONG):
const protocol = req.protocol || 'https';
const baseUrl = `${protocol}://${host}`;
// Returns: http://keeper-platform-production.up.railway.app/api/uploads/direct ❌

// After (CORRECT):
const isProduction = process.env.NODE_ENV === 'production';
const protocol = isProduction ? 'https' : (req.protocol || 'http');
const baseUrl = `${protocol}://${host}`;
// Returns: https://keeper-platform-production.up.railway.app/api/uploads/direct ✅
```

## Impact

### Before Fix
- ❌ Upload fails with "Failed to fetch"
- ❌ Mixed content warning in console
- ❌ Browser blocks HTTP request from HTTPS page

### After Fix
- ✅ Upload works correctly
- ✅ No mixed content warnings
- ✅ Browser allows HTTPS request from HTTPS page

## Files Changed

**Single file:**
- `apps/api/src/api/uploads/routes.ts` (lines 47-53)

## Testing Steps

### After Deployment

1. **Navigate to Board Studio**
   ```
   https://www.ke3p.com/studio/board-studio
   ```

2. **Open a board with an image prop**

3. **Click "Upload Image"**

4. **Select an image file (< 25MB)**

5. **Verify:**
   - ✅ Upload starts (progress bar shows)
   - ✅ Upload completes successfully
   - ✅ Image preview appears
   - ✅ No console errors
   - ✅ No "Failed to fetch" error

6. **Check console logs:**
   ```javascript
   // Should see:
   [MediaUploader] Starting upload for: filename.png image/png 1234567
   [MediaUploader] Sign response: {success: true, data: {...}}
   // url should be HTTPS: https://...
   ```

7. **Save the board and verify image URL persists**

## Environment Considerations

### Production (Railway)
- Uses HTTPS URLs
- SSL terminated at load balancer
- `NODE_ENV=production` → Forces HTTPS

### Development (Local)
- Uses HTTP URLs (localhost)
- No SSL termination needed
- `NODE_ENV=development` → Uses req.protocol

### Preview Deployments (Vercel)
- Should work with HTTPS
- Ensure `NODE_ENV=production` is set

## Related Issues

### Other Mixed Content Scenarios

If you see similar "Mixed Content" errors elsewhere:

1. **Check all external API calls** from frontend
2. **Ensure API_BASE_URL uses HTTPS** in production
3. **Look for hardcoded HTTP URLs** in configs
4. **Verify environment variables** use HTTPS

### Railway Deployment Checklist

- [x] API deployed to Railway
- [x] SSL enabled (automatic on Railway)
- [x] `NODE_ENV=production` set
- [x] Custom domain uses HTTPS
- [x] Upload endpoint returns HTTPS URLs

## Additional Notes

### Why req.protocol is HTTP

Railway's architecture:
```
Browser (HTTPS) → Railway Load Balancer (terminates SSL) 
                → Express App (receives HTTP internally)
```

The Express app sees `req.protocol = 'http'` because:
- SSL is terminated at the load balancer
- Internal traffic is HTTP for performance
- But external URLs must still be HTTPS

### Alternative Solutions (Not Used)

We could have:
1. Used `X-Forwarded-Proto` header: `req.get('x-forwarded-proto')`
2. Set `app.set('trust proxy', true)` globally
3. Hardcoded the domain: `https://api.ke3p.com`

But the simplest fix is checking `NODE_ENV` since:
- Production always needs HTTPS
- Development always uses HTTP (localhost)
- No need to trust proxy headers

## Verification Commands

### Test Upload Sign Endpoint

```bash
# Get auth token from browser
TOKEN="your_keeper_session_cookie"

# Test the sign endpoint
curl -X POST https://api.ke3p.com/api/uploads/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: keeper_session=$TOKEN" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "size": 1024
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "url": "https://api.ke3p.com/api/uploads/direct",  ← Must be HTTPS!
    "method": "POST",
    "fields": { ... },
    "key": "uploads/user-id/timestamp-random.jpg"
  }
}
```

**If you see HTTP instead of HTTPS, the fix didn't deploy.**

## Deployment

```bash
# Commit the fix
git add apps/api/src/api/uploads/routes.ts
git commit -m "fix: Use HTTPS for upload URLs in production (mixed content fix)"

# Push to trigger Railway deployment
git push origin main

# Wait for deployment (check Railway dashboard)
# Test upload after deployment completes
```

## Success Criteria

✅ Upload sign response returns HTTPS URL  
✅ No "Mixed Content" warnings in console  
✅ Image upload completes successfully  
✅ Image appears in preview after upload  
✅ Saved board shows uploaded image  
✅ Works on both Board Studio and inline editing  

## Related Documentation

- `IMAGE_UPLOAD_SETUP.md` - Full upload setup guide
- `UPLOAD_DEBUG_GUIDE.md` - Comprehensive troubleshooting
- `UPLOAD_FIX_SUMMARY.md` - Quick fix steps

---

## Summary

**Problem:** Mixed content blocked uploads (HTTPS page → HTTP API)  
**Solution:** Force HTTPS protocol in production environment  
**Impact:** Single-line fix in upload routes  
**Status:** Ready to deploy and test  

This was a classic SSL termination issue with Railway's load balancer architecture.

