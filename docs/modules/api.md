# Keeper API

## 📌 Purpose
Express.js API server powering Keeper platform: auth, user settings, and core agent/board endpoints.

## 🧱 Key Files
- `src/index.ts`
- `src/api/agents/*.ts`
- `package.json`
- `tsconfig.json`

## 🔄 Data & Behavior
Uses Express, CORS, `@keeper/database` for Prisma, `@keeper/kam` for auth, and `@keeper/shared` utilities.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-09-03 – Fixed TS errors in `src/api/agents/topics.ts` (import `PrismaClient`, resolved `agentId` shadowing).
- 2025-09-04 – Agent Home Board ensure made idempotent; added admin inspect route `GET /api/admin/inspect/agent-home/:agentId`.
- 2025-09-11: Added API `GET /api/domains/:domainId/management-board` to ensure and fetch Domain Management Board (idempotent).

