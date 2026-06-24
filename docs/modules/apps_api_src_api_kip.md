# kip

## 📌 Purpose
Expose KIP agent endpoints. Includes a mock fallback for `/api/kip/agents` when DB is disabled.

## 🧱 Key Files
- `agents.ts`
- `companion.ts` — POST /api/kip/companion (public guest chat — no auth, rate-limited)
- `models.ts` — GET /api/kip/models (model catalog for frontend)
- `lenses.ts`
- `mode-config.ts`
- `../../lib/env.ts`
- `../../services/kip/mockAgents.ts`

## 🔄 Data & Behavior
- GET `/api/kip/agents` reads from DB normally.
- GET `/api/kip/agents?actionPack=true&agentId=...&domainId=...` returns the action pack (tools/actions the agent can use) for the given agent and domain. Resolves environment via KAM and returns `{ actionPack, allowedActions, soleStatus, composedSystemPrompt? }`. `soleStatus.soleActive` is true when in domain (SOLE always accessible); `keeperSharpening` when keeper uses SOLE. Add `composePrompt=true` and optionally `journeyId`/`keeperId` to get `composedSystemPrompt`.
- When `DISABLE_DB=true` or `DATABASE_URL` is unset, it returns a static mock list instead of touching the DB.
- POST `/api/kip/agents` (action=run) now resolves env-v1 context via KAM and injects it (with debug canary) into Kip model input without changing response shapes.
  - Env now includes domain slug/name, agent identity, and per-run debug.canary UUID.
- Kip agent runs instruct the model to return structured JSON (`response` + optional `actions`), validate actions against policy allowlist, and execute draft actions server-side with domain/user scoping and failure guardrails.

## ⚠️ Notes & ToDo
- [ ] Expand mock set as needed
- [ ] Behavior to confirm with Kip
- [ ] companion.ts: no HTTP rate limiting on the platform key resolution path — monitor usage in Railway logs
- [ ] companion.ts: conversationHistory is unvalidated content from the browser — consider server-side content policy if abuse is detected

## 📆 Update Log
- 2026-06-24: GET agent-by-slug now self-heals canonical Lead agents (`kip`, `ceox`) when DB records drift from expected `role=Lead` and `visibility=public`.
- 2026-06-22: **Read-action follow-up (Lead agents)** — After read-only actions (`draft.read`, `journey.read`, etc.), server runs a second model turn with live results so Kip answers substantively instead of stopping at deferral text + a Retrieved receipt.
- 2026-06-19: **Draft points preservation** — `draft.create` upsert merges spec (preserves points); version snapshot before overwrite; agent prompts forbid rebuilding existing drafts via create; `processDraftIntent` merges on update.
- 2026-06-18: **MCP wired into Cloud agent runs** — `mcp.call` action executes Railway/Vercel/GitHub tools in-process; Cloud gets tool catalog in system prompt + follow-up turn with live results.
- 2026-06-17: **Director delegation hardening** — instrument sub-runs use IDE-scoped env + agent capabilities; only successful Cloud/Rendr beats returned to client (no failure placeholder in UI).
- 2026-06-17: **IDE director delegation (server)** — POST `action=run` accepts `directorDelegation`; Lead saves the user's message, runs Cloud/Rendr, synthesizes, returns `directorDelegation` beat in response data.
- 2026-06-15: **Structure pipeline Phase 1** — agent runs use `ensureKipAgentOutputEnvelope` (`services/structure`): prose-wrap for plain replies, Together repair on broken JSON, no cryptic parse error for conversational text. Exported `agentOutputEnvelopeSchema` from `actions/schema.ts`.
- 2026-06-12: **Agent classification field rename** — `kip_agents.role` is the canonical agent classification field; type renamed to `AgentRole`. Values unchanged.
- 2026-05-27: **Draft update reliability** — System agents (Cloud) now use `draft.update` directly in prompts; `draftIntent` no longer skips all actions (only duplicate `draft.create`). Payload normalizer maps `draftId` → `id`; `draft.update` preserves summary/spec when omitted. `skipActionTypes` on execution context.
- 2026-05-26: **System agents (Cloud) — action execution + session fix** — `role === 'System'` now executes parsed `draft.create` / `moment.create` actions via `executeAgentActions`, persists `actionResults` on agent messages, and returns `actions` in the response. Session bootstrap saves user messages after server-side session creation (was skipped). Frontend reads `data.data.actions` and syncs `session_id` when the client had no session yet.

- 2026-05-25: **System agents (Cloud) interactive dialog** — `role === 'System'` now runs `callAIModel`, persists user/agent messages to the session, and returns `system_interaction` (was stub `generic_processing` with no session writes). Respects `config.suppress_kip_system_prompt` in `callAIModel` domain contract injection. Seed sets `memory_enabled: true` for new Cloud records. **Fix:** `callAIModel` merges default settings with `agent.model` — empty `model_settings: {}` no longer drops the model field (Anthropic `model: Field required`).
- 2026-03-08: **image.generate action (Step 4 of 4)** — Added `image.generate` to Kip's action schema (`actions/schema.ts`): `imageGeneratePayloadSchema` + exported `ImageGenerateAction` type. Added handler in `agents.ts` that reads domain `image_style` from `frame_json.kip.image_style`, assembles a FLUX prompt, and calls `ModelProviderService.generateImage()` directly (no internal fetch). Result is pushed to `ActionExecutionResult.data` as `imageUrl`, `imagePrompt`, `imageModel`, `subject`, `aspectRatio`. Fails gracefully — Kip's text response completes even if image generation fails. Added `image.generate` as a Golden Path action (always allowed). Updated system prompt instructions with `image.generate` description and domain visual character injection. `image_style` and `image_model` from `frame_json.kip` are read per request and surfaced to Kip's context.
- 2026-03-06: Added `companion.ts` — POST /api/kip/companion. Public guest chat endpoint. Rate-limited (20 req/min/IP via express-rate-limit). Direct Anthropic call using domain frame kip_context.guest as system prompt and kip.model as model. API key resolution: Railway env → domain owner's user key → platform DB key. Registered in index.ts before authMiddlewareCompat. No SOLE, governance, or action packs.
- 2026-03-04: Fixed VALIDATION_ERROR in `sole.save`: journey validation was scoped to active `keeperId`, blocking cross-keeper journey references. Changed to domain-scoped lookup — any journey in the domain is now a valid SOLE memory link regardless of which keeper is active.
- 2026-02-26: GET /api/kip/models?provider=X now fetches models dynamically from provider APIs (OpenAI, Anthropic) using stored API keys. 1h cache. Falls back to static catalog on failure. Added ProviderModelsFetcher service.
- 2026-02-19: Added GET /api/kip/models. Returns model catalog (providers, models with id/label, defaults). ModelProviderService now reads from config/modelCatalog.ts.
- 2026-02-15: SOLE memory links: sole.save payload extended with journeyId, momentId, engagementTemplateId; validation in agents.ts. SOLE architecture prompt + domain index injected into agent. Auth retry on 401 in AgentBoardFrame.
- 2026-02-15: Wired Domain Contract to Kip: contract text now injected into system prompt when domainId present. Aligned draft rules with contract (plan/outline/spec/design/architecture → MUST call draft.create). SOLE high bar added to prompt.
- 2026-02-17: Agent reliability: draft listing must include titles and dates (not just count); draft.create/update/delete always allowed (golden path); SOLE scope tagging (keeper vs domain-wide); session naming closing ritual.
- 2026-02-09: Stronger draft behavior instructions: only create when explicitly asked; respond-only for capability questions; check draftsDirectory to avoid duplicates; prefer draft.update for existing drafts.
- 2026-02-09: SOLE domain-wide (always active in domain); keeper association sharpens. buildComposedSystemPrompt + composePrompt query param for full system prompt in Cockpit.
- 2026-02-09: Added JSON extraction from mixed response text, draft.create payload normalizer, composeSystemPrompt in run response, soleStatus, actionResults persistence in message metadata, JSON mode for OpenAI, repetition instruction, spec.sections requirement for draft quality.
- 2026-02-09: Added GET actionPack query param to return agent tools/actions. Expanded structured response prompt with draft.create payload schema, JSON example, and stronger instruction for draft creation.
- 2025-12-19: Added DraftIntent pipeline with server-owned draft create/populate/setActive, enforced action envelopes (no fenced or non-agent_output JSON), runtime actionPack exposure, and a repairDraft utility for backfilling empty drafts.
- 2025-12-17: Added structured-response enforcement for Kip runs plus server-side execution of policy-allowed draft actions (create/update/list/get) with guardrails when persistence fails.
- 2025-12-16: Kip run now forwards `sessionId` into KAM env resolution so env-v1 bundles can carry the session’s activeDraft summary when present.
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
