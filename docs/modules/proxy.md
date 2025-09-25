# Proxy

## 📌 Purpose
A tiny Express proxy exposing read-only routes to Keeper APIs with auth, CORS, and rate limiting.

## 🧱 Key Files
- `apps/proxy/src/index.ts`
- `apps/proxy/src/middleware/auth.ts`
- `apps/proxy/src/middleware/cors.ts`
- `apps/proxy/src/middleware/ratelimit.ts`
- `apps/proxy/src/http.ts`
 - `apps/proxy/src/db.ts`

## 🔄 Data & Behavior
- Validates envs: `PROXY_API_KEY`, `KAM_SERVICE_KEY`, `KEEPER_API_BASE`, `CORS_ORIGINS`, `DATABASE_URL`.
- Requires `Authorization: Bearer <PROXY_API_KEY>` on `/v1/*` routes. `/healthz` is public.
- CORS allows only configured `CORS_ORIGINS`.
- In-memory token-bucket rate limit keyed by Authorization header.
- Proxies to Keeper:
  - `/v1/agents/:agentId/home` -> `${KEEPER_API_BASE}/api/board-data/agents/:agentId/home` with pass-through user JWT if provided via `x-user-authorization` or `x-user-token`, else uses `KAM_SERVICE_KEY`.
  - `/v1/boards/:boardId/frames` -> `${KEEPER_API_BASE}/kam/boards/:boardId/frames` with `KAM_SERVICE_KEY`.
  - `/v1/frames/:frameId/config` -> `${KEEPER_API_BASE}/kam/frames/:frameId/config` with `KAM_SERVICE_KEY`.
 - TEMP local endpoints (to be migrated into KAM):
   - `GET /v1/topics` list mini payloads (id, slug, title, area, status, createdAt). Supports `?limit=&q=&verbose=true`.
   - `POST /v1/topics` create topic with `{ slug, title, area, status?, notes?, actions? }`.
   - Storage: local `proxy_topics` table in Railway Postgres. Initialized on first `/v1` request.

## ⚠️ Notes & ToDo
- [ ] Confirm allowed CORS origins list
- [ ] Consider moving rate limit store to Redis for horizontal scale
- [ ] // TODO: Verify and describe assumptions
 - [ ] TEMP: migrate Topics API into KAM by 2025-10-01

## 📆 Update Log
- [2025-09-09T00:00:00.000Z] Add TEMP `/v1/topics` (mini payloads) with `proxy_topics` table.
- [2025-09-24T00:00:00.000Z] Production disablement for single-domain MVP. Service gated by `KEEPER_PROXY_ENABLED` (default `false`) and scaled to 0 replicas in Railway. `api.keeper.domains` DNS removed/parked.
