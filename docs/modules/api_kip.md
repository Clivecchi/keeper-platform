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
- 2025-12-08: Added structured agent error propagation (provider error codes bubble up to `/api/domains/:id/agent/execute`).
- 2025-08-31: Added mock fallback wiring and env helpers.
