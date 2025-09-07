# Proxy

## 📌 Purpose
A tiny Express proxy exposing read-only routes to Keeper APIs with auth, CORS, and rate limiting.

## 🧱 Key Files
- `apps/proxy/src/index.ts`
- `apps/proxy/src/middleware/auth.ts`
- `apps/proxy/src/middleware/cors.ts`
- `apps/proxy/src/middleware/ratelimit.ts`
- `apps/proxy/src/http.ts`

## 🔄 Data & Behavior
- Validates envs: `PROXY_API_KEY`, `KAM_SERVICE_KEY`, `KEEPER_API_BASE`, `CORS_ORIGINS`.
- Requires `Authorization: Bearer <PROXY_API_KEY>` on `/healthz` and all `/v1/*` routes.
- CORS allows only configured `CORS_ORIGINS`.
- In-memory token-bucket rate limit keyed by Authorization header.
- Proxies to Keeper:
  - `/v1/agents/:agentId/home` -> `${KEEPER_API_BASE}/api/board-data/agents/:agentId/home` with pass-through user JWT if provided via `x-user-authorization` or `x-user-token`, else uses `KAM_SERVICE_KEY`.
  - `/v1/boards/:boardId/frames` -> `${KEEPER_API_BASE}/kam/boards/:boardId/frames` with `KAM_SERVICE_KEY`.
  - `/v1/frames/:frameId/config` -> `${KEEPER_API_BASE}/kam/frames/:frameId/config` with `KAM_SERVICE_KEY`.

## ⚠️ Notes & ToDo
- [ ] Confirm allowed CORS origins list
- [ ] Consider moving rate limit store to Redis for horizontal scale
- [ ] // TODO: Verify and describe assumptions

## 📆 Update Log
- [2025-09-07T00:00:00.000Z] Initial scaffold by Cursor
