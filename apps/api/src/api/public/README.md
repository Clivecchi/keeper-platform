# Public API (`/api/public`)

## Purpose

Read-only, unauthenticated HTTP routes for public surfaces (e.g. domain journey listings).

## Key Files

- `journeys.ts` — `GET /api/public/:domainSlug/journeys` and `GET /api/public/:domainSlug/journeys/:journeyId` (rate-limited).

## Data & Behavior

Router is mounted at `/api/public` in `apps/api/src/index.ts`. Responses intentionally omit user-identifying fields on journeys/moments where applicable.

## Notes & ToDo

- [ ] Confirm rate limits and caching for production traffic.

## Update Log

- **2026-03-27** — Added public journey list and detail routes with per-IP rate limiting.
