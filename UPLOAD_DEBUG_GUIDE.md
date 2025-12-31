# Image Upload Debugging Guide

## Current Issue: "Failed to fetch" Error

The image upload is failing with a "Failed to fetch" error before reaching the server. This is a client-side network error that can have several causes.

## Diagnostic Steps

### 1. Check Environment Variables

**On the API Server (apps/api):**

```bash
# Required for Vercel Blob uploads
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_XXXXXXXXXXXXXXXXX"

# Ensure CORS allows your frontend
CORS_ALLOWLIST="https://www.ke3p.com,http://localhost:3000,http://localhost:5173"
PUBLIC_WEB_ORIGIN="https://www.ke3p.com"
APP_ORIGIN="https://api.ke3p.com"
```

**On the Web App (apps/web):**

```bash
# API URL configuration
VITE_API_URL="https://api.ke3p.com"  # or http://localhost:3001 for local dev
```

### 2. Verify API Server is Running

Test the upload endpoints directly:

```bash
# Test API health
curl https://api.ke3p.com/api/health

# Test upload sign endpoint (requires auth)
curl -X POST https://api.ke3p.com/api/uploads/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: keeper_session=YOUR_SESSION_TOKEN" \
  -d '{
    "filename": "test.jpg",
    "contentType": "image/jpeg",
    "size": 1024
  }'
```

### 3. Check Browser Console

Open DevTools (F12) and look for:

1. **Network Tab:**
   - Is the request to `/api/uploads/sign` being made?
   - What is the status code? (Failed = network error, 401 = auth issue, 500 = server error)
   - Check request headers (especially `Cookie` and `Origin`)

2. **Console Tab:**
   - CORS errors? (Access-Control-Allow-Origin)
   - Mixed content warnings? (HTTPS loading HTTP resources)
   - Authentication errors?

### 4. Test Authentication

The upload requires authentication. Verify:

```bash
# Check if you're authenticated
curl https://api.ke3p.com/api/whoami \
  -H "Cookie: keeper_session=YOUR_SESSION_TOKEN"
```

Expected response:
```json
{
  "userId": "xxx-xxx-xxx",
  "email": "user@example.com"
}
```

If you get 401 Unauthorized, you need to log in first.

### 5. Use the Diagnostic Component

Add the diagnostic component to your page to run automated checks:

```tsx
import ImageUploadDiagnostic from '@/components/props/editors/ImageUploadDiagnostic';

// In your component
<ImageUploadDiagnostic />
```

This will test:
- ✅ API connectivity
- ✅ Authentication status
- ✅ Environment configuration
- ✅ Upload signature request

## Common Solutions

### Solution 1: Set BLOB_READ_WRITE_TOKEN

The most common issue is the missing Vercel Blob token.

**Steps:**
1. Go to [Vercel Dashboard → Storage](https://vercel.com/dashboard/stores)
2. Create or select your Blob store
3. Copy the Read/Write Token
4. Set it on your API server:

```bash
# Railway
railway variables set BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Vercel
vercel env add BLOB_READ_WRITE_TOKEN

# Local .env
echo 'BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."' >> apps/api/.env
```

5. Restart your API server

### Solution 2: Fix CORS Configuration

If you see CORS errors in the console:

1. Update `CORS_ALLOWLIST` to include your frontend origin:

```bash
# On API server
CORS_ALLOWLIST="https://www.ke3p.com,http://localhost:3000,http://localhost:5173"
```

2. Restart the API server

3. Clear browser cache and try again

### Solution 3: Fix Authentication

If uploads fail with 401 Unauthorized:

1. **Clear cookies and re-login:**
   - Open DevTools → Application → Cookies
   - Delete `keeper_session` cookie
   - Log in again

2. **Check cookie domain:**
   ```bash
   # API server should set
   COOKIE_DOMAIN=".ke3p.com"  # Allows www.ke3p.com and api.ke3p.com to share
   ```

3. **Verify session cookie is sent:**
   - DevTools → Network → Select upload request
   - Check Request Headers for `Cookie: keeper_session=...`

### Solution 4: Check API URL Configuration

If the frontend can't reach the API:

1. **Set VITE_API_URL in apps/web/.env:**
   ```bash
   # Production
   VITE_API_URL="https://api.ke3p.com"
   
   # Local development
   VITE_API_URL="http://localhost:3001"
   ```

2. **Restart the Vite dev server:**
   ```bash
   cd apps/web
   pnpm dev
   ```

### Solution 5: Test with Minimal File

Try uploading a very small file (< 1KB) to rule out size/timeout issues:

1. Create a 1x1 pixel PNG
2. Try uploading it
3. Check console for specific error

## Verification Checklist

After applying fixes, verify:

- [ ] `BLOB_READ_WRITE_TOKEN` is set on API server
- [ ] API server is running and accessible
- [ ] CORS is configured to allow frontend origin
- [ ] User is authenticated (check `/api/whoami`)
- [ ] Frontend can reach API (check `VITE_API_URL`)
- [ ] No console errors in browser
- [ ] Upload sign request returns 200 OK
- [ ] Test upload completes successfully

## Still Not Working?

If none of these solutions work:

1. **Check the logs:**
   ```bash
   # API server logs (Railway)
   railway logs
   
   # API server logs (local)
   cd apps/api && pnpm dev
   ```

2. **Enable debug logging:**
   ```bash
   # API server
   LOG_LEVEL="debug"
   DEBUG_HTTP="1"
   ENABLE_REQUEST_LOGGING="true"
   ```

3. **Test upload directly with curl:**
   ```bash
   # Get upload signature
   SIGN_RESPONSE=$(curl -X POST http://localhost:3001/api/uploads/sign \
     -H "Content-Type: application/json" \
     -H "Cookie: keeper_session=YOUR_TOKEN" \
     -d '{"filename":"test.jpg","contentType":"image/jpeg","size":1024}')
   
   echo $SIGN_RESPONSE
   
   # Upload file (extract URL and fields from SIGN_RESPONSE)
   curl -X POST "UPLOAD_URL_FROM_RESPONSE" \
     -H "Content-Type: application/json" \
     -d '{"key":"KEY_FROM_RESPONSE","file":"BASE64_ENCODED_FILE"}'
   ```

4. **Check for proxy/firewall issues:**
   - Corporate firewall blocking Vercel domains?
   - VPN interfering with requests?
   - Browser extensions blocking requests?

## Contact Support

If you've tried everything and uploads still fail, provide:

1. Browser console errors (screenshot)
2. Network tab showing failed request
3. API server logs during upload attempt
4. Environment variable configuration (redact tokens)
5. Steps to reproduce the issue

This will help diagnose the root cause faster.


