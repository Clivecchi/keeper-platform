# API Lib

## 📌 Purpose
Shared utilities and service clients used across Express routes and middleware.

## 🧱 Key Files
- `nango.ts` — lazy singleton for `@nangohq/node` (self-hosted Nango)
- `nangoConfig.ts` — `DEFAULT_NANGO_HOST`, `resolveNangoIntegrationId()`, Nango error formatting
- `integrationCustomConnect.ts` — Custom integration token verification (Railway + Vercel probes)
- `env.ts` — database/redis disable helpers
- `redis.ts` — Redis client helpers
- `errors/DomainError.ts` — domain-scoped API errors

## 🔄 Data & Behavior
`getNango()` reads `NANGO_SECRET_KEY` and `NANGO_HOST` (defaults to `https://services.keeper.domains` when unset). Integration routes use this for connect sessions and proxy requests; credentials never touch Keeper storage.

## ⚠️ Notes & ToDo
- [ ] Confirm Railway `NANGO_SECRET_KEY` is the connect-sessions key from self-hosted Nango (not Nango Cloud)
- [ ] If dashboard integration IDs differ from `github`, set `NANGO_INTEGRATION_*` env overrides
- [ ] Webhook HMAC verification before public launch

## 📆 Update Log

### 2026-06-02 — Integrations Phase A
- Added `integrationCustomConnect.ts` for Railway env token + reachability check (no `RailwayService` changes)
- Vercel converted to Custom integration (`VERCEL_TOKEN` verify); Nango is GitHub-only for Services connect

### 2026-06-01 — Nango connect session typing + legacy HTTP
- `buildConnectSessionBody()` always returns required `tags` (SDK-compatible)
- `createKeeperConnectSession()` posts legacy `end_user` body via fetch when `NANGO_CONNECT_SESSION_TAGS` is unset
- Set `NANGO_CONNECT_SESSION_TAGS=true` only after Nango server is upgraded to tags-based API

### 2026-06-01 — Nango host default + integration ID mapping
- `nangoConfig.ts`: default host matches web `nangoConnect.ts`; env overrides for integration IDs
- Session route returns Nango error `message` + `hint` instead of generic 500

### 2026-05-30 — Nango client (Step 3A)
- Added `nango.ts` with `getNango()` and `isNangoConfigured()`
