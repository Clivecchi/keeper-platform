# Proxy

## 📌 Purpose
A tiny Express proxy exposing read-only routes to Keeper APIs with auth, CORS, and rate limiting.

## 🧱 Key Files
- `src/index.ts`
- `src/mcpProxy.ts`
- `src/middleware/auth.ts`
- `src/middleware/cors.ts`
- `src/middleware/ratelimit.ts`
- `src/http.ts`
 - `src/db.ts`

## 🔄 Data & Behavior
- Validates envs: `PROXY_API_KEY`, `KAM_SERVICE_KEY`, `KEEPER_API_BASE`, `CORS_ORIGINS`, `DATABASE_URL`.
- Requires `Authorization: Bearer <PROXY_API_KEY>` on `/v1/*` routes. `/healthz` is public.
- CORS allows only configured `CORS_ORIGINS`.
- In-memory token-bucket rate limit keyed by Authorization header.
- Proxies to Keeper:
  - `/v1/agents/:agentId/home` -> `${KEEPER_API_BASE}/api/board-data/agents/:agentId/home` with pass-through user JWT if provided via `x-user-authorization` or `x-user-token`, else uses `KAM_SERVICE_KEY`.
  - `/v1/boards/:boardId/frames` -> `${KEEPER_API_BASE}/kam/boards/:boardId/frames` with `KAM_SERVICE_KEY`.
  - `/v1/frames/:frameId/config` -> `${KEEPER_API_BASE}/kam/frames/:frameId/config` with `KAM_SERVICE_KEY`.
  - MCP routes with dedicated CORS handling and dual auth support (x-api-key OR Bearer token):
    - `GET /api/mcp` -> Health check probe (`{ ok: true, service: "keeper-mcp-proxy" }`)
    - `HEAD /api/mcp` -> Base health probe (200)
    - `HEAD /api/mcp/schema` -> Schema health probe (200)
    - `HEAD /api/mcp/call` -> Call health probe (200)
    - `GET /api/mcp/schema` -> `${KEEPER_API_BASE}/api/mcp/schema` with extracted API key sent as both `x-api-key` and `Authorization: Bearer`.
    - `POST /api/mcp/call` -> `${KEEPER_API_BASE}/api/mcp/call` with extracted API key sent as both `x-api-key` and `Authorization: Bearer`.
    - Auth extraction: Accepts `x-api-key` header OR `Authorization: Bearer <token>` and forwards both styles to upstream.
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
- [2025-09-30] Align TypeScript to ~5.8.3 and confirm build script tsc -p tsconfig.json works.
- [2025-10-12] Add MCP proxy routes `/api/mcp/schema` and `/api/mcp/call` in `src/mcpProxy.ts` with dedicated CORS handling. Forwards requests to `${KEEPER_API_BASE}/api/mcp/*` with authentication headers.
- [2025-10-12] Update MCP proxy with HEAD probes for OpenAI Agent Builder compatibility. Added health check endpoints (`GET/HEAD /api/mcp`, `HEAD /schema`, `HEAD /call`) and dual auth support (x-api-key OR Bearer token extraction). Content-Type includes charset=utf-8.
- [2025-10-12] Transform `/api/mcp/schema` response to MCP v1 format: `{ mcp: { version }, server: { name: { human_readable }, version }, tools: [{ name, description, input_schema }] }`. Renames `parameters` to `input_schema` per MCP spec.
