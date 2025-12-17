# kip

## 📌 Purpose
Expose KIP agent endpoints. Includes a mock fallback for `/api/kip/agents` when DB is disabled.

## 🧱 Key Files
- `agents.ts`
- `lenses.ts`
- `mode-config.ts`
- `../../lib/env.ts`
- `../../services/kip/mockAgents.ts`

## 🔄 Data & Behavior
- GET `/api/kip/agents` reads from DB normally.
- When `DISABLE_DB=true` or `DATABASE_URL` is unset, it returns a static mock list instead of touching the DB.
- POST `/api/kip/agents` (action=run) now resolves env-v1 context via KAM and injects it (with debug canary) into Kip model input without changing response shapes.
  - Env now includes domain slug/name, agent identity, and per-run debug.canary UUID.

## ⚠️ Notes & ToDo
- [ ] Expand mock set as needed
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-12-17: Kip env injection now surfaces domain slug/name, agent identity, and per-run debug.canary UUID.
- 2025-12-16: Kip run action now injects a KAM-resolved env-v1 context (with debug canary) into model input so `/api/kip/agents` executions are environment-aware even when anonymous.
- 2025-12-15: Hardened updateSessionMetadata auth (user+agent), normalized tags inputs, and fixed resolvedUser initialization to prevent PATCH 500s.
- 2025-12-15: updateSessionMetadata now accepts summary + flexible tags (array or object) and logs requestId/sessionId on success for PATCH `/api/kip/agents`.
- 2025-12-14: Added Lens CRUD endpoints (`/api/kip/lenses`) and agent mode config routes (`/api/kip/agents/:id/mode-config`) to drive Domain/Debug mode selection with lenses and per-mode limits.
- 2025-12-13: Added structured request logging (headers/query/body/domain) for createSession/messages/sessions flows to make 400/500 causes traceable.
- 2025-12-12: Added request-scoped logging plus 400/404 responses for create-session and message fetch failures instead of leaking 500s on bad agent/session input.
- 2025-12-11: Added session topic/summary/tag surface area and PATCH endpoint for updating session metadata.
- 2025-12-08: Added structured agent error propagation (provider error codes bubble up to `/api/domains/:id/agent/execute`).
- 2025-08-31: Added mock fallback wiring and env helpers.

