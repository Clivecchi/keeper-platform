# database src

## 📌 Purpose
Source entrypoint for the shared database package, exporting the Prisma client, typed helpers, and query utilities for all Keeper services.

## 🧱 Key Files
- `index.ts`
- `prismaRetry.ts`
- `queries/`
- `types.ts`

## 🔄 Data & Behavior
- Provides the Prisma client singleton and re-exports generated Prisma types.
- Surfaces query helpers (e.g., Kip sessions/messages) for API layers without duplicating Prisma wiring.
- Centralizes type definitions so API and web clients share consistent shapes.
- Wraps the singleton with a connection-retry `$extends` so idle Postgres disconnects (P1017) are retried instead of failing Kip/API requests.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-07-17: Added `prismaRetry.ts` + singleton `$extends` retry for transient DB disconnects (fixes Kip `domain.findUnique` "Server has closed the connection").
- 2025-12-11: Documented session metadata additions (topic/summary/tags) and the new update helper for Kip sessions.
