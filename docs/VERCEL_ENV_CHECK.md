# Vercel Environment Variables Check

## If you see requests to `llm.keeper.ai` or 502/CORS errors

The keeper-platform codebase **does not reference** `llm.keeper.ai` anywhere. All API calls use:
- `VITE_API_URL` (env var), or
- Fallback `https://api.ke3p.com`, or
- **Relative `/api/`** when served from www.ke3p.com (Vercel rewrites to Railway)

If your browser is making requests to `https://llm.keeper.ai/...`, the base URL is coming from **Vercel environment variables** at build time.

## What to check

1. **Vercel Dashboard** → Your project → **Settings** → **Environment Variables**

2. Look for:
   - `VITE_API_URL` — must be `https://api.ke3p.com` or `https://keeper-platform-production.up.railway.app`
   - **NOT** `https://llm.keeper.ai` or any other domain

3. If `VITE_API_URL` is set to `llm.keeper.ai`, **remove it or change it** to:
   ```
   https://api.ke3p.com
   ```
   or leave it unset (the app will use relative `/api` when on ke3p.com).

4. **Redeploy** after changing env vars — Vite bakes env vars into the build.

## Correct setup

| Variable | Production value |
|---------|------------------|
| `VITE_API_URL` | `https://api.ke3p.com` or unset (relative /api used on ke3p.com) |

## Same-origin fix (March 2026)

The app now uses **relative `/api/`** URLs when served from `www.ke3p.com` or `ke3p.com`. This:
- Avoids CORS (same-origin requests)
- Works regardless of `VITE_API_URL` (Vercel rewrites `/api/*` to Railway)
- Fixes "Failed to fetch" when env vars are wrong
