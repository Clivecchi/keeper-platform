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
- 2025-10-15 – Stabilization: mounted lightweight auth attach, added `/api/whoami`, debug providers status and env-gated self-test routes; ModelProviderService respects `STABILIZE_MODE=1` (env-only keys). Updated `turbo.json` to expose `VITE_API_BASE_URL`.
- 2025-09-03 – Fixed TS errors in `src/api/agents/topics.ts` (import `PrismaClient`, resolved `agentId` shadowing).
- 2025-09-04 – Agent Home Board ensure made idempotent; added admin inspect route `GET /api/admin/inspect/agent-home/:agentId`.
- 2025-09-11: Added API `GET /api/domains/:domainId/management-board` to ensure and fetch Domain Management Board (idempotent).
 - 2025-09-17: Hardened domain resolution and board-data error handling:
   - `/api/domains/my` now self-heals `Domain.deletedAt` via guard and resolves robustly using context, user primary, membership, and ownership fallbacks.
   - `GET /api/board-data/:id` calls the guard and returns `403` on domain mismatch with `{ boardDomainId, ctxDomainId }` to prevent UI 500s.
- 2025-09-30 – CORS updated with debug logging and wildcard support (reads `CORS_ALLOWLIST` and `CORS_ORIGINS`, supports patterns like `https://*.vercel.app`). Added explicit `app.options('*', cors(corsOptions))` preflight handling.

