# kip

## 📌 Purpose
Expose KIP agent endpoints. Includes a mock fallback for `/api/kip/agents` when DB is disabled.

## 🧱 Key Files
- `agents.ts`
- `../../lib/env.ts`
- `../../services/kip/mockAgents.ts`

## 🔄 Data & Behavior
- GET `/api/kip/agents` reads from DB normally.
- When `DISABLE_DB=true` or `DATABASE_URL` is unset, it returns a static mock list instead of touching the DB.

## ⚠️ Notes & ToDo
- [ ] Expand mock set as needed
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-12-13: Added structured request logging (headers/query/body/domain) for createSession/messages/sessions flows to make 400/500 causes traceable.
- 2025-12-12: Added request-scoped logging plus 400/404 responses for create-session and message fetch failures instead of leaking 500s on bad agent/session input.
- 2025-12-11: Added session topic/summary/tag surface area and PATCH endpoint for updating session metadata.
- 2025-12-08: Added structured agent error propagation (provider error codes bubble up to `/api/domains/:id/agent/execute`).
- 2025-08-31: Added mock fallback wiring and env helpers.
