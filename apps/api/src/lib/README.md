# API Lib

## 📌 Purpose
Shared utilities and service clients used across Express routes and middleware.

## 🧱 Key Files
- `nango.ts` — lazy singleton for `@nangohq/node` (self-hosted Nango at `NANGO_HOST`)
- `env.ts` — database/redis disable helpers
- `redis.ts` — Redis client helpers
- `errors/DomainError.ts` — domain-scoped API errors

## 🔄 Data & Behavior
`getNango()` reads `NANGO_SECRET_KEY` and `NANGO_HOST` at call time. Integration routes use this for connect sessions and proxy requests; credentials never touch Keeper storage.

## ⚠️ Notes & ToDo
- [ ] Confirm `NANGO_HOST` in all Railway/Vercel envs points to `https://services.keeper.domains`
- [ ] Webhook HMAC verification before public launch

## 📆 Update Log

### 2026-05-30 — Nango client (Step 3A)
- Added `nango.ts` with `getNango()` and `isNangoConfigured()`
