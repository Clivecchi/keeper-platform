# Quick Start: Deploy Debug Build & Get Logs

## 🚀 Deploy (2 minutes)

```bash
cd C:\Users\Chucks-Domain\Documents\GitHub\keeper-platform

git add apps/api/src/kam/session.ts apps/api/src/kam/auth.ts
git commit -m "debug: add cookie authentication logging"
git push origin main
```

Wait 3-5 minutes for Railway deployment.

---

## 🧪 Test (1 minute)

1. Go to: `https://www.ke3p.com/login`
2. Login with test credentials
3. Note if you get logged in or get an error

---

## 📋 Get Logs (2 minutes)

1. Railway dashboard → API service → Logs tab
2. Look for lines with `🔍 [DEBUG]`
3. Copy all debug lines

**Share with me:**
- All `🔍 [DEBUG]` log lines
- Screenshot of browser Network tab (login response)
- Screenshot of Application → Cookies

---

## 🔍 What to Look For

In Railway logs, you should see:
```
🔍 [DEBUG] Login successful for user: xxx
🔍 [DEBUG] setSessionCookie called: { domain: '.ke3p.com', ... }
🔍 [DEBUG] Set-Cookie header after res.cookie(): { present: ?, value: ? }
🔍 [DEBUG] Sending login success response
```

**The critical line is**: `present: true` or `present: false`

---

## Alternative: Quick Test Without Deploy

Test current production:
```bash
curl -v -X POST https://api.ke3p.com/api/kam/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://www.ke3p.com" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' \
  2>&1 | grep -i "set-cookie"
```

If you see `set-cookie: keeper_session=...` then cookie IS being set by server.

---

**Then share the logs and I'll tell you the exact fix!** 🎯

