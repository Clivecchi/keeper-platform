# Developer Notes

## TEMP Topics API on keeper-domains-proxy

// TEMP: migrate to KAM by 2025-10-01

This is a minimal, temporary Topics API implemented directly in the `apps/proxy` service to unblock KipGPT usage without touching core Keeper runtime.

- Endpoints: `GET/POST /v1/topics` guarded by `Authorization: Bearer ${PROXY_API_KEY}`
- Storage: small `proxy_topics` table in Railway Postgres, created lazily on first `/v1` request
- Default responses are mini payloads to avoid GPT sandbox bloat; add `?verbose=true` for full
- No impact to AHB/DMB runtime paths; only adds a new route group under `/v1`

Migration plan:
1. Implement equivalent routes under KAM with Prisma and align schema.
2. Backfill `proxy_topics` into KAM storage.
3. Switch proxy routes to forward to KAM, then drop `proxy_topics` and related code.

Environment variables required by proxy:
- `PROXY_API_KEY` (required)
- `KEEPER_API_BASE` (default production URL)
- `KAM_SERVICE_KEY` (for upstream KAM requests)
- `CORS_ORIGINS` (CSV)
- `DATABASE_URL` (Railway Postgres)





