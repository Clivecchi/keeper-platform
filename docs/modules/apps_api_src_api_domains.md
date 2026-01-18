# Domains API Routes

## 📌 Purpose
Domain-level REST endpoints for CRUD, permissions, board data, custom domains, and domain-scoped agent execution (V0 Kip).

## 🧱 Key Files
- `routes.ts` – Primary router for CRUD, permissions, agent execution, and management helpers.
- `board-data.ts` – Hydrates and persists domain board frame data for inline editing experiences.
- `custom-domain-routes.ts` – Legacy + new custom domain verification endpoints.
- `contact.ts` – Domain contact form submission handler.
- `kip-drafts.ts` – Domain-scoped Kip draft directory and session active-draft pointer routes.
- `DOMAIN_HOME_BOARD_CHECKLIST.md` – Manual verification checklist for domain-home board ensure.

## 🔄 Data & Behavior
- Applies `createDomainResolutionMiddleware` so downstream routes receive resolved domain metadata.
- `/:domainId/home-board` ensures and returns the canonical `boardType="domain-home"` board with minimal frame metadata.
- `/by-slug/:slug/home-board` resolves domain by slug, enforces read permission, and returns the same canonical board.
- `/:domainId/agent/execute` now auto-assigns Kip as the primary agent when missing, then calls `KipAgentService` and surfaces typed error codes (`MISSING_API_KEY`, `INVALID_MODEL`, etc.).
- Board data routes guard frame IDs via the Domain keeper type template, updating JSON props and flushing cache.
- Custom domain routes share logic between legacy and `/custom` prefixed paths for compatibility.
- `/:domainId/kip/environment` returns a stable, read-only Kip environment bundle (now with `policy` + `draftsDirectory`); the agent execute route builds the same bundle and injects it into the model payload without changing response shapes.
- `/:domainId/policy` (GET/PATCH) exposes the resolved domain policy JSON (policy-v1 default) for viewing and editing.

## Error Taxonomy
- **Domain layer** (this router) owns `AUTH_REQUIRED`, `DOMAIN_NOT_FOUND`, `ACCESS_DENIED`, and `NO_PRIMARY_AGENT`, returning 4xx immediately.
- **Agent layer** (`KipAgentService`) emits `AGENT_MISCONFIGURED` and the generic `AGENT_EXECUTION_FAILED` when the payload is malformed.
- **Provider layer** (`ModelProviderService`) emits `MISSING_API_KEY`, `INVALID_MODEL`, and `PROVIDER_UNAVAILABLE`. We now short-circuit when no OpenAI key exists so the route can deterministically map it to HTTP 400.
- `AGENT_ERROR_TAXONOMY` documents the mapping (layer + HTTP status + UX message) and powers `mapAgentExecutionFailure` so future codes have a single place to live.

## ⚠️ Notes & ToDo
- [ ] Expose domain agent execution metrics for observability dashboards.
- [ ] Confirm auto-assignment rules for non-Kip default agents once multi-agent support ships.

## 📆 Update Log
### 2026-01-18 - Domain home board endpoint
- Added endpoints to ensure and fetch the canonical domain home board by id or slug.
- Documented manual verification checklist for domain home board behavior.
### 2025-12-17 - Domain policy API + enriched environment
- Added `GET/PATCH /api/domains/:domainId/policy` with domain membership enforcement and default `policy-v1` fallback.
- Kip environment route now includes `policy` and `draftsDirectory` (last 25 drafts) for the authenticated owner.
### 2025-12-16 - Kip drafts directory + session pointers
- Added domain-scoped Kip draft routes (`/kip/drafts` + `/kip/sessions/:sessionId/active-draft`) enforcing domain membership + ownership, enabling listing, CRUD, and session active-draft pointers.
- `/kip/environment` now accepts `sessionId` to surface the current session’s activeDraft summary when set.
### 2025-12-15 - Kip environment context surface
- Added `GET /api/domains/:domainId/kip/environment` and wired `/agent/execute` to build the same Kip environment bundle and pass it into the model input (read-only, non-breaking).
### 2025-12-14 - Mode-aware agent execute
- Domain agent execute now forwards domainId/slug and explicit Domain mode to `KipAgentService.runAgent`, ensuring mode-specific lens/config selection is respected.
### 2025-12-09 - Agent Error Taxonomy
- Added the `AGENT_ERROR_TAXONOMY` map so `/agent/execute` responses stay consistent and documented.
- `ModelProviderService` now flags `MISSING_API_KEY` before touching the SDK, which bubbles through KipAgentService → domain route with a structured `{ error, message, details }` body.
### 2025-12-08 - Kip Auto-Assignment & Error Mapping
- Auto-assigned Kip as the default primary agent when a domain lacks `settings.primaryAgentId`.
- Added structured error responses for agent execution (e.g., `MISSING_API_KEY`, `PROVIDER_UNAVAILABLE`).
