# Domains API Routes

## 📌 Purpose
Domain-level REST endpoints for CRUD, permissions, board data, custom domains, and domain-scoped agent execution (V0 Kip).

## 🧱 Key Files
- `routes.ts` – Primary router for CRUD, permissions, agent execution, and management helpers.
- `board-data.ts` – Hydrates and persists domain board frame data for inline editing experiences.
- `custom-domain-routes.ts` – Legacy + new custom domain verification endpoints.
- `contact.ts` – Domain contact form submission handler.

## 🔄 Data & Behavior
- Applies `createDomainResolutionMiddleware` so downstream routes receive resolved domain metadata.
- `/:domainId/agent/execute` now auto-assigns Kip as the primary agent when missing, then calls `KipAgentService` and surfaces typed error codes (`MISSING_API_KEY`, `INVALID_MODEL`, etc.).
- Board data routes guard frame IDs via the Domain keeper type template, updating JSON props and flushing cache.
- Custom domain routes share logic between legacy and `/custom` prefixed paths for compatibility.

## ⚠️ Notes & ToDo
- [ ] Expose domain agent execution metrics for observability dashboards.
- [ ] Confirm auto-assignment rules for non-Kip default agents once multi-agent support ships.

## 📆 Update Log
### 2025-12-08 - Kip Auto-Assignment & Error Mapping
- Auto-assigned Kip as the default primary agent when a domain lacks `settings.primaryAgentId`.
- Added structured error responses for agent execution (e.g., `MISSING_API_KEY`, `PROVIDER_UNAVAILABLE`).
