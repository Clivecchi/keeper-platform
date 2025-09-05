# KAM Read-Only API

## 📌 Purpose
Expose read-only endpoints for Agent → Board → Frame → Config with scoped service-key auth, rate limits, and audit logging.

## 🧱 Key Files
- `routes.ts` – KAM router mounted at `/kam`
- `middleware.ts` – `kamAuth`, `kamScope`, `kamRateLimit`, `kamAudit`

## 🔄 Data & Behavior
- Read-only only; all routes require `Authorization: Bearer <SERVICE_KEY>` and `X-Domain-Id` headers.
- DTO responses (no Prisma internals).
- Rate limit: 100 req / 5 min per key.
- Audit: JSON line `[kam:audit]` per request.

## Routes
- `GET /kam/agents/:agentId/home` – Resolve Agent Home Board without mutation.
- `GET /kam/boards/:boardId` – Board metadata.
- `GET /kam/boards/:boardId/frames` – Ordered frames.
- `GET /kam/frames/:frameInstanceId/config` – Config/props of a frame.
- `GET /kam/boards?agentId=` – List boards by agent.

## ⚠️ Notes & ToDo
- [ ] Persist audit to DB table `kam_audit` (future).
- [ ] Add automated tests.

## 📆 Update Log
- 2025-09-04: Initial read-only implementation.


