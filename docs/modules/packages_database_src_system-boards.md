# System Boards

## 📌 Purpose
Canonical system board definitions plus helper utilities that ensure each domain has the logged-in experience boards (Feed, Kip, Keepers, Journeys, Profile). Shared by seeds and the API.

## 🧱 Key Files
- `index.ts` – Board definitions and `ensureCanonicalBoard` helpers

## 🔄 Data & Behavior
- `SYSTEM_BOARD_DEFINITIONS` describes each board’s frames, props, and tags.
- `ensureCanonicalBoard`/`ensureAllCanonicalBoards` hydrate Prisma with deterministic IDs so reruns are idempotent.
- Frame configs are auto-created per `(slug,key)` pair.

## ⚠️ Notes & ToDo
- [ ] Replace sample props with live data bindings when backend endpoints are ready.
- [ ] Extend definitions when new logged-in screens are introduced.

## 📆 Update Log
- 2025-11-22: Added canonical board definitions and Prisma ensure helpers.


