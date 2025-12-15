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

## Error Taxonomy
- **Domain layer**: `AUTH_REQUIRED`, `DOMAIN_NOT_FOUND`, `ACCESS_DENIED`, and `NO_PRIMARY_AGENT` return 4xx before reaching Kip.
- **Agent layer**: `KipAgentService` raises `AGENT_MISCONFIGURED` or the fallback `AGENT_EXECUTION_FAILED` when the agent payload cannot be normalized.
- **Provider layer**: `ModelProviderService` raises `MISSING_API_KEY`, `INVALID_MODEL`, or `PROVIDER_UNAVAILABLE`. We now short-circuit when the OpenAI key is missing so the response is deterministically mapped to HTTP 400.
- `AGENT_ERROR_TAXONOMY` (in `routes.ts`) documents the mapping between code → layer → HTTP status/message, keeping `/agent/execute` responses consistent as we add more codes.

## ⚠️ Notes & ToDo
- [ ] Expose domain agent execution metrics for observability dashboards.
- [ ] Confirm auto-assignment rules for non-Kip default agents once multi-agent support ships.

## 📆 Update Log
### 2025-12-14 - Mode-aware agent execute
- Domain agent execute now forwards domainId/slug and explicit Domain mode to `KipAgentService.runAgent`, ensuring mode-specific lens/config selection is respected.
### 2025-12-09 - Agent Error Taxonomy
- Added the shared `AGENT_ERROR_TAXONOMY` map and early `MISSING_API_KEY` detection in ModelProviderService so agents surface structured responses without inventing a new error system.
### 2025-12-08 - Kip Auto-Assignment & Error Mapping
- Auto-assigned Kip as the default primary agent when a domain lacks `settings.primaryAgentId`.
- Added structured error responses for agent execution (e.g., `MISSING_API_KEY`, `PROVIDER_UNAVAILABLE`).
