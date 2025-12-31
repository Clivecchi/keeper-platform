# Authentication Debug - Next Steps
**Date**: October 15, 2025  
**Status**: Debug logging added, ready for testing

---

## ✅ What We Confirmed

From your Railway screenshot:
```
COOKIE_DOMAIN = .ke3p.com
```
✅ **This is correct** - The environment variable is properly set with the leading dot.

---

## 🔍 What We Did

Since the env var is correct but cookies still aren't being set, I added debug logging to identify where the issue occurs.

### Files Modified:

#### 1. `apps/api/src/kam/session.ts`
Added logging to `setSessionCookie()`:
- ✅ Logs cookie configuration before setting
- ✅ Logs the domain value from env var at runtime
- ✅ Verifies if Set-Cookie header is present after `res.cookie()`

#### 2. `apps/api/src/kam/auth.ts`
Added logging to `login()`:
- ✅ Confirms successful authentication
- ✅ Confirms cookie function is being called
- ✅ Confirms response is being sent

---

## 🚀 Next Steps

### Step 1: Deploy to Railway ⏱️ 3-5 minutes

```bash
# Commit the debug changes
git add apps/api/src/kam/session.ts apps/api/src/kam/auth.ts
git commit -m "debug: add cookie authentication logging"
git push origin main
```

Railway will automatically redeploy when you push to main.

---

### Step 2: Test Login and Check Logs ⏱️ 5 minutes

#### A. Attempt Login
1. Go to `https://www.ke3p.com/login`
2. Login with your test credentials
3. Watch for 200 OK response (or any response)

#### B. Check Railway Logs
1. Go to Railway dashboard
2. Find your API service
3. Open the **Logs** tab
4. Look for lines starting with `🔍 [DEBUG]`

---

### Step 3: Analyze the Debug Output

You should see logs like this:

#### ✅ Expected Success Pattern:
```
🔍 [DEBUG] Login successful for user: test@example.com
🔍 [DEBUG] setSessionCookie called: {
  cookieName: 'keeper_session',
  domain: '.ke3p.com',
  domainFromEnv: '.ke3p.com',
  origin: 'https://www.ke3p.com',
  isPreview: false,
  tokenLength: 200
}
🔍 [DEBUG] Set-Cookie header after res.cookie(): {
  present: true,
  value: ['keeper_session=eyJhbGc...; Domain=.ke3p.com; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800']
}
🔍 [DEBUG] Sending login success response
```

#### ❌ Problem Pattern 1 (Cookie not set):
```
🔍 [DEBUG] Login successful for user: test@example.com
🔍 [DEBUG] setSessionCookie called: { ... }
🔍 [DEBUG] Set-Cookie header after res.cookie(): {
  present: false,    ← ⚠️ PROBLEM: No Set-Cookie header
  value: undefined
}
```
**Meaning**: Express `res.cookie()` is not working - possible Express version issue or response already sent.

#### ❌ Problem Pattern 2 (Domain wrong at runtime):
```
🔍 [DEBUG] setSessionCookie called: {
  domain: 'api.ke3p.com',        ← ⚠️ PROBLEM: Missing leading dot
  domainFromEnv: 'api.ke3p.com'  ← ⚠️ Env var changed at runtime?
}
```
**Meaning**: Env var is different at runtime than in Railway dashboard (cache issue?).

#### ❌ Problem Pattern 3 (No logs at all):
```
(no debug logs appear)
```
**Meaning**: Login handler is not being reached - routing issue or old deployment still running.

---

## What Each Log Tells Us

### Log 1: Login Success
```javascript
console.log('🔍 [DEBUG] Login successful for user:', user.email);
```
**Confirms**: Authentication worked, we're past password validation

### Log 2: Cookie Configuration
```javascript
console.log('🔍 [DEBUG] setSessionCookie called:', { ... });
```
**Reveals**:
- Actual domain value at runtime
- Origin of the request
- Whether it's detected as preview deployment

### Log 3: Set-Cookie Header
```javascript
console.log('🔍 [DEBUG] Set-Cookie header after res.cookie():', { ... });
```
**Critical**: Shows if Express successfully added the Set-Cookie header
- If `present: true` → Express worked, Railway might be stripping it
- If `present: false` → Express didn't set cookie (bug in our code or Express issue)

### Log 4: Response Sent
```javascript
console.log('🔍 [DEBUG] Sending login success response');
```
**Confirms**: We're about to send the response with the cookie header

---

## Possible Findings & Solutions

### Finding 1: Set-Cookie Header Present in Logs but Not in Browser

**Logs show**:
```
present: true
value: ['keeper_session=...; Domain=.ke3p.com; ...']
```

**But browser shows**: No Set-Cookie header in Network tab

**Diagnosis**: Railway's proxy is stripping the Set-Cookie header

**Solutions**:
1. Check Railway proxy settings (unlikely to be configurable)
2. Contact Railway support about cookie handling
3. Consider alternative: Use Railway's private networking or different deployment

---

### Finding 2: Set-Cookie Header NOT Present in Logs

**Logs show**:
```
present: false
value: undefined
```

**Diagnosis**: Express `res.cookie()` failed to add the header

**Possible causes**:
- Response headers already sent
- Express cookie-parser issue
- Response object already finalized

**Solutions**:
1. Verify cookie-parser is installed: Check `package.json` for `cookie-parser`
2. Verify cookie-parser middleware: Should be `app.use(cookieParser())` before routes
3. Check response timing: Ensure cookie is set before `res.json()`

---

### Finding 3: Domain Value Wrong at Runtime

**Logs show**:
```
domain: 'api.ke3p.com'     (no leading dot)
domainFromEnv: 'api.ke3p.com'
```

**Diagnosis**: Environment variable changed between when we checked and now

**Solutions**:
1. Verify Railway env var again (maybe someone changed it)
2. Check if there are multiple deployments with different configs
3. Ensure you're checking the correct Railway service (API, not proxy)

---

### Finding 4: No Logs Appear

**No debug logs in Railway**

**Diagnosis**: Code not deployed or login not reaching handler

**Solutions**:
1. Verify deployment completed successfully in Railway
2. Check Railway build logs for errors
3. Verify the login endpoint is being called (check Network tab for 404 vs 200)
4. Try hitting the API directly: `curl -X POST https://api.ke3p.com/api/kam/auth/login ...`

---

## After Getting Logs

### If Set-Cookie IS Present (Railway stripping)
This is rare but possible. Next steps:
1. Verify browser actually receives response headers
2. Check if Railway has cookie restrictions
3. Consider filing Railway support ticket

### If Set-Cookie is NOT Present (Express not setting)
More common. Next steps:
1. Check cookie-parser installation
2. Verify middleware order in `index.ts`
3. Look for conflicting middleware

### If Domain is Wrong
1. Re-check Railway dashboard env vars
2. Verify correct service (API, not proxy)
3. Redeploy to force env var refresh

---

## Quick Test Commands

### Test login with curl (bypass browser):
```bash
curl -v -X POST https://api.ke3p.com/api/kam/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.ke3p.com" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  2>&1 | grep -i "set-cookie"
```

**Look for**:
```
< set-cookie: keeper_session=...; Domain=.ke3p.com; ...
```

If you see the Set-Cookie header in curl but not in browser, it confirms Railway is handling it differently for browser vs non-browser requests.

---

## Timeline

1. ✅ **0 min**: Commit and push changes
2. ⏳ **3-5 min**: Wait for Railway deployment
3. 🧪 **2 min**: Test login
4. 📋 **1 min**: Copy Railway logs
5. 🔍 **2 min**: Analyze logs
6. 🛠️ **Variable**: Implement fix based on findings

**Total**: ~10-15 minutes to identify root cause

---

## Share the Logs

After you test, please share:
1. **Complete Railway logs** from the login attempt (all lines with `🔍 [DEBUG]`)
2. **Browser Network tab** screenshot of the login response headers
3. Any **errors** in Railway logs or browser console

With these, I can tell you exactly what's wrong and how to fix it.

---

## Cleanup

After we identify and fix the issue, we should **remove the debug logging** since it may expose sensitive information (email addresses in logs).

---

**Ready to deploy?** Commit and push the changes, then let me know what you see in the Railway logs! 🚀


