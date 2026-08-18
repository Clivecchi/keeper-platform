# API Lib

## 📌 Purpose
Shared utilities and service clients used across Express routes and middleware.

## 🧱 Key Files
- `keeperDomainsCors.ts` — tenant `https://{slug}.keeper.domains` CORS origin validation (mirrors web `platformHost.ts` reserved subdomains)
- `keeperCors.ts` — req-aware CORS middleware (static allowlist, tenant origins, verified custom domains, `x-forwarded-host` same-site)
- `nango.ts` — lazy singleton for `@nangohq/node` (self-hosted Nango)
- `nangoConfig.ts` — `DEFAULT_NANGO_HOST`, `resolveNangoIntegrationId()`, Nango error formatting
- `integrationCustomConnect.ts` — Custom integration token verification (Railway + Vercel probes)
- `railwayGraphql.ts` — Railway Public API host + token headers (`Bearer` vs `Project-Access-Token`)
- `resolveServiceBinding.ts` — domain-scoped GitHub binding resolver for MCP tools, agent context, and Chronicle PATCH
- `loadDomainTier.ts` — reads `domain.settings.tier` and key policy flags
- `resolveDomainProviderApiKey.ts` — tier-gated provider key resolution for domain runtime
- `resolveProviderApiKey.ts` — env → user → platform key resolution (presence sync)
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

### 2026-08-17 — Axios status parsed on Nango errors
- `nangoConfig.formatNangoError` reads `status code NNN` from Axios messages when `response.status` is missing, so GitHub MCP can tell a 404 from a generic 502.

### 2026-07-28 — Railway GraphQL auth (logs)
- `railwayGraphql.ts` — canonical host `backboard.railway.com`; project UUID tokens use `Project-Access-Token`.
- `integrationCustomConnect` probe now verifies `deploymentLogs` (not only project reachability).

### 2026-07-07 — Custom domain CORS (livecchi.us login fix)
- Added `keeperCors.ts` + tests — allows verified custom domain origins and `x-forwarded-host` same-site requests; returns 403 instead of 500 on reject

### 2026-07-04 — keeper.domains tenant CORS
- Added `keeperDomainsCors.ts` + tests — validates `https://{slug}.keeper.domains` origins; excludes reserved infrastructure subdomains

### 2026-06-27 — Domain tier key flags
- `domainTier.ts` in `@keeper/shared` — `free` / `keeper` / `studio` tiers gate included vs BYOK
- `loadDomainTier.ts` + `resolveDomainProviderApiKey.ts` — runtime resolver respects tier policy
- `GET /api/domains/:domainId/key-access` — tier + synced Key presence for Agent Board AI Access nav

### 2026-06-27 — Service binding resolver
- Added `resolveServiceBinding.ts` — resolves GitHub repo/branch from `domain.settings.serviceBindings`, legacy `ideBuildContext`, integration metadata, or env default; persists binding on integration PATCH

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
