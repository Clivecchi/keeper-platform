# Domains API Routes

## 📌 Purpose
Domain-level REST endpoints for CRUD, permissions, board data, custom domains, and domain-scoped agent execution (V0 Kip).

## 🧱 Key Files
- `routes.ts` – Primary router for CRUD, permissions, agent execution, and management helpers.
- `board-data.ts` – Hydrates and persists domain board frame data for inline editing experiences.
- `custom-domain-routes.ts` – Legacy + new custom domain verification endpoints.
- `contact.ts` – Domain contact form submission handler.
- `kip-drafts.ts` – Domain-scoped Kip draft directory and session active-draft pointer routes.
- `kip-designer.ts` – Kip Designer conversation endpoint. Now persists Dialog + kip_session + kip_messages, enabling conversation resumption after browser close.
- `kip-dialogs.ts` – Dialog CRUD routes: create, list, get-with-sessions, update/archive, resolve-active.
- `frame-schemas.ts` – Per-frame JSON Schema objects for Together AI guided decoding (`response_format`). One schema per governed frame; `FRAME_SCHEMA_MAP` keyed by `V0FrameKey`.
- `DOMAIN_HOME_BOARD_CHECKLIST.md` – Manual verification checklist for domain-home board ensure.

## 🔄 Data & Behavior
- Applies `createDomainResolutionMiddleware` so downstream routes receive resolved domain metadata.
- `/:domainId/home-board` ensures and returns the canonical `boardType="domain-home"` board with minimal frame metadata.
- `/by-slug/:slug/home-board` resolves domain by slug, enforces read permission, and returns the same canonical board.
- `/:domainId/agent/execute` now auto-assigns Kip as the primary agent when missing, then calls `KipAgentService` and surfaces typed error codes (`MISSING_API_KEY`, `INVALID_MODEL`, etc.).
- Board data routes guard frame IDs via the Domain keeper type template, updating JSON props and flushing cache.
- Custom domain routes share logic between legacy and `/custom` prefixed paths for compatibility.
- `/:domainId/kip/environment` returns a stable, read-only Kip environment bundle (now with `policy` + `draftsDirectory`); the agent execute route builds the same bundle and injects it into the model payload without changing response shapes.
- `/:domainId/kip/sole-memory-cards` (Option B) returns domain anchor SOLE memory cards (keeperId null, domainId set) for Cockpit when no keeper is selected.
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
- 2026-06-15: **kip-designer slice fix** — reads frame blocks via `getFrameSliceFromDomainFrame` from `@keeper/shared` (correct `moments` → `kept_moments`, `admin` → `domain_admin`, etc.).
### 2026-05-27 — Draft Point model in spec_json
- `kip-drafts.ts` normalizes `spec_json` on read/write via `@keeper/shared` `normalizeDraftSpecJson`; responses always include `spec.points` (array, may be empty).
- New/create/update paths persist normalized spec including `points: []` when absent.
### 2026-04-01 — Dialog: persistent conversation container
- Added `kip-dialogs.ts` with four routes: `POST /:domainId/kip/dialogs`, `GET /:domainId/kip/dialogs`, `GET /:domainId/kip/dialogs/:dialogId`, `PATCH /:domainId/kip/dialogs/:dialogId`, and `GET /:domainId/kip/dialogs/resolve/active`.
- Modified `kip-designer.ts`: accepts optional `dialog_id` in the request body; after generating the Kip response, finds-or-creates a `Dialog` for the context (domain + board + frame), finds-or-creates a `kip_session` for that Dialog, and persists both the user message and Kip response as `kip_messages`. Returns `dialog_id` and `session_id` in the response.
- Persistence failure is non-blocking: if the DB operation fails, the Kip response is still returned; only resumption is affected.
- Guest conversations (via `/api/kip/companion`) explicitly never create Dialog records — enforced by the `INVARIANT` comment and absence of any Dialog logic in that handler.
- Registered `kipDialogRoutes` in `routes.ts`.
### 2026-03-12 - Together AI JSON Mode upgrade + frame schemas
- Created `frame-schemas.ts` with nine per-frame JSON Schema objects (cover, commons, moment, moments, journeys, agent, diagnostics, admin, kip) derived from `domain-frame.types.ts`. Exports `FRAME_SCHEMA_MAP` keyed by `V0FrameKey`.
- Upgraded `kip-designer.ts`: imports `FRAME_SCHEMA_MAP`; skips Together AI for schema-less frames (`index`, `present`, `feed`, `keepers`, `profile`); passes `response_format: { type: 'json_object', schema }` for governed frames; upgraded model from `Mixtral-8x7B` to `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`; updated Together AI system prompt to use frame-aware authoring instructions.
- Updated `AgentFrame.tsx`: reads `domainFrame?.kip` from shell context with fallback to `DEFAULT_DOMAIN_FRAME.kip`; replaces hardcoded subtitle placeholder with `kipLabels.greeting`.
### 2026-03-10 - Designer Frame: Kip designer conversation endpoint
- Added `kip-designer.ts` with `POST /:domainId/kip/designer`.
- Two-model pattern: Anthropic (claude-sonnet-4-6) for conversation + Together AI Mixtral JSON Mode for structured DomainFrameJson output.
- Intent detection determines if the user's message requests a JSON proposal; Together AI only called when yes.
- Returns `{ response: string, draft?: { spec_json: object } }`.
- Registered in `routes.ts` alongside `kipDraftRoutes`.
### 2026-03-10 - domain_json draft publish handler
- Added `POST /:domainId/kip/drafts/:draftId/publish` in `kip-drafts.ts`.
- Handler validates `kind === "domain_json"`, confirms `spec_json` is a non-null object, verifies the requesting user is the domain owner, then writes `spec_json` → `Domain.frame_json` (full replace) and marks the draft `status = "promoted"` — both in a single Prisma transaction.
- Idempotent: a second call on an already-promoted draft returns `200 { idempotent: true }` without re-writing.
- Added `"domain_json"` to `VALID_KINDS` in `agents.ts` (Kip payload normalizer) and to `autoDraft.kinds` in `policyPack.ts` (Kip agent prompt context).
### 2026-03-05 - Domain frame JSON endpoint
- Added `GET /api/domains/:slug/frame` (public, no auth required) that returns `domain.frame_json` from the database.
- Placed in the public routes section, before the domain resolution middleware.
- Falls back to `DEFAULT_FRAME_FALLBACK` (inline const) if `frame_json` is null or empty `{}`.
- Returns 404 with `DOMAIN_NOT_FOUND` if the slug does not match any domain.
- Pairs with the `frame_json Json? @default("{}")` field added to the Domain model (migration `20260305_add_domain_frame_json`) and the `loadDomainFrame` update in the web app.
### 2026-02-23 - Cover image in by-slug response
- Added `theme` to `GET /api/domains/by-slug/:slug` select so domain cover image (`theme.coverImage`) is available for the public cover frame.
### 2026-02-09 - SOLE domain anchor (Option B)
- Added `GET /api/domains/:domainId/kip/sole-memory-cards` for domain anchor SOLE records (keeperId null). Requires domain read permission.
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
