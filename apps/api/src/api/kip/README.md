# kip

## 📌 Purpose
Expose KIP agent endpoints. Includes a mock fallback for `/api/kip/agents` when DB is disabled.

## 🧱 Key Files
- `agents.ts`
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

## 📆 Update Log
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
