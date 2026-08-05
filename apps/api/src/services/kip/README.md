# Kip Services

## 📌 Purpose
Shared server-side helpers for Kip agent runtime — environment resolution, dialog lifecycle, and draft persistence glue.

## 🧱 Key Files
- `buildKipEnvironmentContext.ts` — Session-bound environment payload for agent runs
- `resolveAgentEnvironment.ts` — Per-agent capability and policy resolution
- `buildCompactEnvironmentForPrompt.ts` — Allowlisted slim env for model system-prompt JSON (not the full KAM object)
- `agentRunTimings.ts` — Per-turn phase timing bag (`envResolve` / model / actions) for latency diagnosis
- `loadDialogDocumentForChronicle.ts` — Chronicle Document loader (Forward/Step/Paths + manuscripts with Points)
- `loadDialogDocumentForAgent.ts` — Agent-facing Document summary (prompt injection)
- `linkDraftToSessionDialog.ts` — Sets `kip_drafts.dialog_id` from the active session's Dialog (first link wins)
- `promoteDraftPoint.ts` — Keeps accepted `journey_spec` Points as Moments with identity preserved (`Moment.id = Point.id`); supports evolution + path-at-keep / pathless keep
- `actionFollowUp.ts` — Second model turn after read-only actions (`draft.read`, etc.) so Kip answers with live results
- `ensureKnownLeadAgent.ts` — Self-heals canonical Lead agents (`kip`, `ceox`) on slug lookup
- `modeConfig.ts` — Kip mode configuration helpers
- `mockAgents.ts` — DB-disabled development agents

## 🔄 Data & Behavior
- Draft mutations during agent runs call `ensureDraftLinkedToSessionDialog` so Chronicle Sessions blocks can load linked Dialog sessions.
- Linking is idempotent: existing `dialog_id` on a draft is never overwritten.
- `getKipAgentBySlugEnsured` repairs drifted `role` / `visibility` for canonical Lead slugs before agent metadata is returned.

## ⚠️ Notes & ToDo
- [ ] Consolidate dialog find/create helpers with `kipDialogLifecycle.ts` if duplication grows

## 📆 Update Log

### 2026-08-05 — follow-up budget guard
- `actionFollowUp.ts` — `READ_FOLLOW_UP_MAX_ELAPSED_MS` + `formatReadActionResultsForUserFallback()` so a slow first model call does not start a second synthesis pass that hits the Vercel/proxy timeout; `agents.ts` skips AI follow-up past the budget and returns the retrieved results instead.

### 2026-08-04 — web.search follow-up
- `actionFollowUp.ts` treats `web.search` as read-only; formats title/URL/snippet results and instructs citation in the second model turn.

### 2026-08-03 — History = session chapters + Document keeps
- Stopped per-turn session History rows. `recordSessionChapterEvent` writes once when an auto-named session gets its topic name.
- Document History rows only for durable keeps (`draft.update`, `draft.point.accept`, `draft.point.promote`) via `buildKeptChronicleMeta`; propose/rewrite no longer flood the feed.
- Consult chapters use short actor lists (`buildConsultChapterMeta`); title/summary capped for scan (56 / 120).

### 2026-08-02 — Solo Dialog turns write History
- ~~`recordSessionTurnEvent` / `buildSessionTurnMeta` write a session ChronicleEvent for Dialog-scoped turns…~~ Superseded 2026-08-03 (per-turn History retired).

### 2026-07-30 — Chronicle Events
- `chronicleEvents.ts` persists dialog-scoped History events, authorizes reads with Dialog audience rules, groups child consultations under their Lead turn, and safely closes auto-named sessions with authored metadata.

### 2026-07-28 — Lead MCP ownership + Chronicle Document loader
- Lead prompts/skips: `mcp.call` is Cloud-owned; Lead must `delegate.consult` / cast-consult Cloud.
- `loadDialogDocumentForChronicle.ts` — one DB path for Chronicle UI (no sessions; manuscripts include full `spec` Points).

### 2026-07-27 — compact prompt env + run timings
- `buildCompactEnvironmentForPrompt.ts` — drops policy packs, registries, full dialog/roster dumps from the stringified KAM block (roster + Document stay in dedicated prompt builders).
- `agentRunTimings.ts` — collector summarized as `data.timings` on lead/system runs and logged as `[AgentTurnTiming]`.

### 2026-07-25 — instrument Document + consult excerpts
- `run` accepts `dialogId` even when `sessionId` is omitted (Mechanism A instrument sub-runs).
- Standing honesty heading renamed so models do not treat it as a Document Point title.
- Orchestration metadata persists `castConsultRecords` (reply excerpt + length) for post-hoc diagnosis.

### 2026-07-24 — dialog document + standing honesty
- `loadDialogDocumentForAgent.ts` — loads Dialog Forward/Step/Paths + `document_manuscript` Points for agent context.
- `resolveAgentEnvironment` attaches `environment.dialogDocument` and `dialogParticipation` on `domainAgents`.
- Live `callAIModel` injects standing cast-honesty + Document system prompts (Mechanisms A/B remain distinct consult paths).

### 2026-07-23 — becoming-together-complete (delegation + honesty)
- `actionFollowUp` treats `delegate.consult` as follow-up-eligible; synthesis attributes quotes only from real replies, else “got nothing back.”
- Director fallback prompts no longer invent another agent’s voice when consultation is empty.

### 2026-07-23 — cast role-label fix
- DialogCastMember merge into `domainAgents` uses `role: 'Cast'` (not `'Lead'`) so guest leads are not labeled as owning this domain's dialog voice.

### 2026-07-22 — kip-roster-dialog-cast-sync
- `resolveAgentEnvironment` — optional `dialogId`; resolves `kip_sessions.dialog_id` from `sessionId`; merges `listDialogCastMembers` into `domainAgents` (additive). Awareness only — not turn delegation.

### 2026-07-17 — Point→Moment identity keep
- `promoteDraftPoint.ts`: primary Moment uses Point.id; `sourceDraftId`/`sourcePointId` lineage; `evolvesMomentId` updates in place; optional `pathId` (use / create / pathless); bumps Dialog.document_status drafts→kept

### 2026-06-30 — Draft point promotion service
- Added `promoteDraftPoint.ts` — transaction: accepted point → Path + Moments; persists `point.promotion` on spec_json

### 2026-06-24 — Lead agent self-heal
- Added `ensureKnownLeadAgent.ts` — repairs canonical Lead slugs when DB records drift from `role=Lead` and `visibility=public`.

### 2026-06-22 — Auto-link draft to session Dialog
- Added `ensureDraftLinkedToSessionDialog` — invoked from Kip draft actions, draft intent pipeline, and `POST .../active-draft`.

### 2026-06-22 — Read-action follow-up synthesis (Lead agents)
- Added `actionFollowUp.ts` — when a turn is read-only (`draft.read`, `journey.read`, etc.), the server runs a second model call with action results so Kip completes the engagement instead of stopping at "Reading the draft now."

### 2026-07-14 — Library in domain index
- `domainIndex` now includes up to 20 recent Library items (id, label, sourceType) alongside keepers and journeys in both `resolveAgentEnvironment` and `buildKipEnvironmentContext`.
