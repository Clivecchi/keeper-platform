# Cookie-Only Auth Quick Reference

## 🎯 TL;DR
- **Web browsers** → Cookie-only auth (Authorization headers stripped)
- **CLI/tools** → Header auth still works
- **Both** → Cookies always accepted

---

## 🔑 Request Flow

### Browser Request
```
Browser → Fetch (with Authorization header)
  ↓
Fetch Shim (PROD) → Strips Authorization header
  ↓
API Request (credentials: include)
  ↓
Backend → Reads keeper_session cookie ✅
Backend → Ignores Authorization header ❌
```

### CLI Request
```
CLI (curl/Postman) → API Request
  ↓
Backend → Checks Origin header (none present)
Backend → Reads Authorization header ✅
Backend → Accepts header auth ✅
```

---

## 📝 Implementation Files

| Component | File | Purpose |
|-----------|------|---------|
| **Frontend** | `apps/web/src/boot/fetch-shim.ts` | Strips Authorization in PROD |
| **Backend** | `apps/api/src/kam/session.ts` | Ignores header for browsers |
| **Main** | `apps/web/src/main.tsx` | Imports shim first |

---

## 🔧 Environment Variables

### Frontend
```bash
# Enable debug logging
VITE_FETCH_SHIM_DEBUG=1

# Allow header auth in PROD (troubleshooting only)
VITE_ALLOW_HEADER_AUTH=1

# API URL for detection
VITE_API_URL=https://api.ke3p.com
```

### Backend
```bash
# JWT secret (required)
JWT_SECRET=your_secret_here
```

---

## 🧪 Quick Tests

### Test 1: CLI Auth Works
```bash
curl -H "Authorization: Bearer <VALID_TOKEN>" \
     https://api.ke3p.com/api/kam/auth/me
```
**Expected**: 200 OK ✅

### Test 2: Browser Can't Spoof
```bash
curl -H "Origin: https://www.ke3p.com" \
     -H "Authorization: Bearer FAKE" \
     https://api.ke3p.com/api/kam/auth/me
```
**Expected**: 401 Unauthorized ✅

### Test 3: CLI Override
```bash
curl -H "Origin: https://www.ke3p.com" \
     -H "X-Client: cli" \
     -H "Authorization: Bearer <VALID_TOKEN>" \
     https://api.ke3p.com/api/kam/auth/me
```
**Expected**: 200 OK ✅

---

## 🔍 Browser DevTools Checklist

### Network Tab
1. Open any API request (e.g., `/api/domains/my`)
2. Check **Request Headers**:
   - ❌ No `Authorization` header
   - ✅ `Cookie: keeper_session=...` present
3. Check **Response**:
   - ✅ Status: 200 OK
   - ✅ Valid JSON data

### Console
```javascript
// Check if shim is installed
window.__keeper.fetchShimInstalled
// → true

// Check mode
window.__keeper.fetchShimMode
// → "production" or "development"

// Check if debug is enabled
window.__keeper.fetchShimDebug
// → true/false
```

---

## 🚨 Troubleshooting

### Problem: 401 in Production
**Symptoms**: API returns unauthorized
**Check**:
1. DevTools → Application → Cookies
2. Verify `keeper_session` exists
3. Check domain is `.ke3p.com`

**Fix**: Re-login to get fresh cookie

---

### Problem: CLI Gets 401
**Symptoms**: curl/Postman returns unauthorized
**Check**:
1. Token is valid (not expired)
2. No `Origin` header being sent
3. Using correct API endpoint

**Fix**: 
```bash
# Add X-Client header if needed
curl -H "X-Client: cli" \
     -H "Authorization: Bearer <TOKEN>" \
     https://api.ke3p.com/api/kam/auth/me
```

---

### Problem: Shim Not Working
**Symptoms**: Authorization headers still present
**Check**:
1. `fetch-shim.ts` imported first in `main.tsx`
2. Build is PROD mode
3. `VITE_ALLOW_HEADER_AUTH` not set

**Fix**: Hard refresh browser (Ctrl+Shift+R)

---

## 📊 Auth Decision Matrix

| Client Type | Origin Header | X-Client | Cookie | Header Auth | Result |
|-------------|---------------|----------|--------|-------------|--------|
| Browser (PROD) | Yes | - | ✅ | ❌ | Cookie only |
| Browser (DEV) | Yes | - | ✅ | ✅ | Both allowed |
| CLI/curl | No | - | ✅ | ✅ | Both allowed |
| CLI (forced) | Yes | cli | ✅ | ✅ | Both allowed |
| Extension | Yes | - | ✅ | ❌ | Cookie only |

---

## 🎨 Visual Flow

```
┌─────────────┐
│   Browser   │
│  (PROD)     │
└──────┬──────┘
       │ fetch() with Authorization header
       ▼
┌──────────────────────────┐
│   Fetch Shim             │
│   - Detects PROD mode    │
│   - Strips Authorization │
│   - Sets credentials     │
└──────┬───────────────────┘
       │ Request with cookie only
       ▼
┌──────────────────────────┐
│   Backend Middleware     │
│   - Checks Origin        │
│   - Ignores header       │
│   - Reads cookie         │
└──────┬───────────────────┘
       │
       ▼
     Auth ✅


┌─────────────┐
│  CLI/Tool   │
│  (No Origin)│
└──────┬──────┘
       │ Request with Authorization header
       ▼
┌──────────────────────────┐
│   Backend Middleware     │
│   - No Origin detected   │
│   - Accepts header       │
└──────┬───────────────────┘
       │
       ▼
     Auth ✅
```

---

## 📚 Related Docs

- **Full Acceptance Tests**: `COOKIE_AUTH_ACCEPTANCE.md`
- **Implementation Details**: `COOKIE_AUTH_IMPLEMENTATION_SUMMARY.md`
- **Automated Tests**: `./test-cookie-auth.sh`
- **Boot Module**: `apps/web/src/boot/README.md`
- **KAM Module**: `apps/api/src/kam/README.md`

---

## ✅ Deploy Checklist

- [ ] Backend deployed with updated `session.ts`
- [ ] Frontend deployed with updated `fetch-shim.ts`
- [ ] `JWT_SECRET` set in production
- [ ] Browser test: No Authorization header in Network tab
- [ ] CLI test: Header auth works
- [ ] Board Studio loads correctly
- [ ] Production logs clean

---

**Status**: ✅ Ready for Production

**Last Updated**: 2025-10-11

