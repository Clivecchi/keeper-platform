# Upload HTTP 413 Fix - November 2025

## Problem
Image uploads were failing with HTTP 413 "Payload Too Large" error, even for files under the advertised 25MB limit.

### Error Details
```
Failed to load resource: the server responded with a status of 413 ()
[MediaUploader] Upload error: Error: HTTP 413
```

### Root Cause
The Express.js server had body parser limits set to **1MB**, which was too small for base64-encoded images. A 3.17 MB image becomes approximately 4.23 MB when base64-encoded, exceeding the 1MB limit.

## Solution
Increased Express body parser limits from **1MB to 50MB** to accommodate:
- 25MB maximum file size (as advertised in UI)
- Base64 encoding overhead (~33% larger)
- Safety margin for large files

### Files Modified
- `apps/api/src/index.ts` (lines 299-302)

### Changes
```typescript
// Before (1MB limit)
app.use(express.json({ limit: '1mb', type: ['application/json', 'text/json', '*/json'] as any }));
app.use(express.text({ type: '*/*', limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// After (50MB limit)
app.use(express.json({ limit: '50mb', type: ['application/json', 'text/json', '*/json'] as any }));
app.use(express.text({ type: '*/*', limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

## Deployment Instructions

### Railway (Production)
The API is hosted on Railway and will need to be redeployed:

```bash
# Commit the changes
git add apps/api/src/index.ts
git commit -m "fix: Increase Express body size limit to 50MB for image uploads"
git push origin main

# Railway will automatically deploy
# Monitor at: https://railway.app/project/your-project-id
```

### Verification After Deployment

1. **Check server logs** for successful restart:
   ```
   🚀 Keeper API Server running on port 8080
   ```

2. **Test upload endpoint**:
   ```bash
   curl -X POST https://api.ke3p.com/api/uploads/sign \
     -H "Content-Type: application/json" \
     -H "Cookie: keeper_session=YOUR_TOKEN" \
     -d '{"filename":"test.jpg","contentType":"image/jpeg","size":5242880}'
   ```

3. **Test in UI**:
   - Navigate to Board Studio
   - Select Cover frame
   - Upload a 3-5 MB image
   - Should succeed without HTTP 413 error

### Expected Results
✅ Files up to 25MB upload successfully  
✅ No HTTP 413 errors  
✅ Upload progress shows correctly  
✅ Image displays after upload  

### Rollback Plan
If issues occur, revert to previous limits:
```typescript
app.use(express.json({ limit: '1mb', type: ['application/json', 'text/json', '*/json'] as any }));
app.use(express.text({ type: '*/*', limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
```

## Technical Details

### Why 50MB?
- Maximum file size: 25 MB
- Base64 encoding overhead: 4/3 × 25 MB = 33.3 MB
- Safety margin: 50 MB
- Covers edge cases and metadata

### Performance Impact
**Minimal**. Body parser limits only affect memory allocation for request parsing. The limit is per-request, not system-wide.

### Security Considerations
- ✅ Validation still enforced in upload route (max 25MB)
- ✅ Authentication required for uploads
- ✅ User-scoped file paths prevent unauthorized access
- ✅ File type validation prevents malicious uploads

## Related Files
- `apps/api/src/api/uploads/routes.ts` - Upload endpoint handlers
- `apps/web/src/components/studio/MediaUploader.tsx` - Frontend upload component
- `IMAGE_UPLOAD_SETUP.md` - Complete upload documentation
- `UPLOAD_FIX_SUMMARY.md` - Previous upload fixes

## Testing Checklist

Before closing this issue, verify:
- [ ] 1 MB file uploads successfully
- [ ] 5 MB file uploads successfully
- [ ] 10 MB file uploads successfully
- [ ] 20 MB file uploads successfully
- [ ] 25 MB file uploads successfully
- [ ] 26 MB file is rejected with proper error message
- [ ] Unsupported file types are rejected
- [ ] Upload progress displays correctly
- [ ] Uploaded images display correctly in preview
- [ ] Delete functionality works

## Additional Issue Found: HTTP 401 on Upload

### Problem
After fixing the HTTP 413 error, uploads were still failing with HTTP 401 "Unauthorized" on the second request (`/api/uploads/direct`).

### Root Cause
The backend was returning the Railway hostname (`keeper-platform-production.up.railway.app`) in the upload URL instead of the proper API domain (`api.ke3p.com`). Since the session cookie is set for domain `.ke3p.com`, the browser wouldn't send it with requests to the Railway hostname, causing authentication to fail.

**Railway Logs Showed:**
```
[AuthMiddleware] Token check: {
  path: '/sign',
  hasCookie: true,  ← Cookie present for first request
  ...
}

[AuthMiddleware] Token check: {
  path: '/direct',
  hasCookie: false,  ← NO COOKIE for second request!
  ...
}
```

### Solution
Modified `apps/api/src/api/uploads/routes.ts` to always return `https://api.ke3p.com` in production instead of using the request hostname:

```typescript
// Before
const host = req.get('host') || 'api.ke3p.com';
const baseUrl = process.env.API_BASE_URL || `${protocol}://${host}`;

// After  
const baseUrl = process.env.API_BASE_URL || (isProduction ? 'https://api.ke3p.com' : `${req.protocol || 'http'}://${req.get('host')}`);
```

This ensures the upload URL uses the same domain as the cookie, allowing authentication to work properly.

## Status
**Fixed - Pending Deployment**

Date: November 9, 2025  
Developer: Claude (Cursor AI)  
Verified by: [Pending]

## Files Modified
1. `apps/api/src/index.ts` - Increased body parser limits (HTTP 413 fix)
2. `apps/api/src/api/uploads/routes.ts` - Fixed URL domain for cookie auth (HTTP 401 fix)
3. `apps/api/src/middleware/authMiddleware.ts` - Added debug logging

## Next Steps
1. Commit and push changes
2. Monitor Railway deployment
3. Test in production with various file sizes
4. Verify upload URL in logs shows `https://api.ke3p.com/api/uploads/direct`
5. Confirm both requests have `hasCookie: true` in logs
6. Update `IMAGE_UPLOAD_SETUP.md` if needed
7. Close related GitHub issues

