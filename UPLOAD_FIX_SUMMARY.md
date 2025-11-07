# Upload Issue - Quick Fix Summary

## Problem
Image uploads are failing with "Failed to fetch" error.

## Root Cause
Based on the diagnostic, the most likely causes are:

1. **Missing `BLOB_READ_WRITE_TOKEN`** on the API server (most common)
2. **CORS configuration** not allowing your frontend origin
3. **Authentication issue** - user not properly logged in

## Quick Fix Steps

### Step 1: Set BLOB_READ_WRITE_TOKEN

This is the **most likely issue**. The API server needs a Vercel Blob storage token.

#### Get the Token:
1. Go to [Vercel Dashboard → Storage](https://vercel.com/dashboard/stores)
2. Create a new Blob store or select existing one
3. Copy the **Read/Write Token** (starts with `vercel_blob_rw_`)

#### Configure the Token:

**If using Railway:**
```bash
railway variables set BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXX"
```

**If using Vercel:**
```bash
vercel env add BLOB_READ_WRITE_TOKEN
# Paste your token when prompted
```

**If using local development:**
```bash
# Add to apps/api/.env
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXX"

# Restart the API server
cd apps/api
pnpm dev
```

### Step 2: Verify CORS Configuration

Make sure your frontend URL is allowed in the API CORS settings:

```bash
# On your API server, set:
CORS_ALLOWLIST="https://www.ke3p.com,http://localhost:3000,http://localhost:5173"

# Or if using Railway:
railway variables set CORS_ALLOWLIST="https://www.ke3p.com,http://localhost:3000,http://localhost:5173"
```

### Step 3: Restart Services

After configuring environment variables:

**Railway:**
- Railway will automatically restart after setting variables

**Vercel:**
```bash
vercel --prod  # Redeploy to apply new env vars
```

**Local:**
```bash
# Terminal 1 - API
cd apps/api
pnpm dev

# Terminal 2 - Web
cd apps/web
pnpm dev
```

### Step 4: Test the Fix

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** the page (Ctrl+F5)
3. **Log out and log back in** to get fresh session
4. **Try uploading** a small image

## Verification

After applying the fix, you should see:

✅ No "Failed to fetch" error
✅ Upload progress indicator shows  
✅ Image appears in the preview after upload
✅ Console shows successful upload messages

## Still Not Working?

### Check Browser Console

Press F12 and look for:

1. **Network tab** - Find the `/api/uploads/sign` request
   - Status 200 = Success
   - Status 401 = Not logged in
   - Status 500 = Server error (likely missing token)
   - Failed = Network/CORS issue

2. **Console tab** - Look for:
   - CORS errors → Fix CORS_ALLOWLIST
   - "Unauthorized" → Log out and back in
   - "Storage not configured" → Set BLOB_READ_WRITE_TOKEN
   - "Failed to fetch" → Check network connectivity

### Check API Server Logs

**Railway:**
```bash
railway logs
```

Look for:
- `❗ BLOB_READ_WRITE_TOKEN not configured` → Set the token
- `CORS: origin not allowed` → Add your frontend to CORS_ALLOWLIST
- `Unauthorized` → Auth issue

### Test with curl

```bash
# Test if API is reachable
curl https://api.ke3p.com/health

# Test upload endpoint (replace YOUR_SESSION_TOKEN)
curl -X POST https://api.ke3p.com/api/uploads/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: keeper_session=YOUR_SESSION_TOKEN" \
  -d '{"filename":"test.jpg","contentType":"image/jpeg","size":1024}'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "url": "https://api.ke3p.com/api/uploads/direct",
    "fields": { ... },
    "key": "uploads/user-id/timestamp-random.jpg"
  }
}
```

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch" | Network/CORS issue | Check API is running, verify CORS_ALLOWLIST |
| "Storage not configured" | Missing BLOB_READ_WRITE_TOKEN | Set environment variable on API server |
| "Unauthorized" / 401 | Not logged in | Log out and back in |
| "Access denied" / 403 | CORS blocking | Add frontend URL to CORS_ALLOWLIST |
| "File size exceeds maximum" | File too large | Use files under 25MB |

## Next Steps

1. ✅ Set `BLOB_READ_WRITE_TOKEN` on your API server
2. ✅ Restart the API server
3. ✅ Clear browser cache and hard refresh
4. ✅ Test uploading a small image (< 1MB)
5. ✅ Check browser console for any errors

## Need More Help?

Run the diagnostic tools:

```bash
# PowerShell (Windows)
.\test-upload-config.ps1

# Bash (Mac/Linux)
./test-upload-config.sh
```

Or check the detailed guide:
- See `UPLOAD_DEBUG_GUIDE.md` for comprehensive troubleshooting
- See `IMAGE_UPLOAD_SETUP.md` for full setup instructions

## Contact

If you've tried everything and it still doesn't work, provide:
1. Screenshot of browser console errors
2. Screenshot of Network tab showing failed request
3. API server logs during upload attempt
4. Which hosting platform you're using (Railway/Vercel/Local)


