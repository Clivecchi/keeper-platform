# database src

## 📌 Purpose
Source entrypoint for the shared database package, exporting the Prisma client, typed helpers, and query utilities for all Keeper services.

## 🧱 Key Files
- `index.ts`
- `queries/`
- `types.ts`

## 🔄 Data & Behavior
- Provides the Prisma client singleton and re-exports generated Prisma types.
- Surfaces query helpers (e.g., Kip sessions/messages) for API layers without duplicating Prisma wiring.
- Centralizes type definitions so API and web clients share consistent shapes.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-12-11: Documented session metadata additions (topic/summary/tags) and the new update helper for Kip sessions.

