# Kip Services

## 📌 Purpose
Shared server-side helpers for Kip agent runtime — environment resolution, dialog lifecycle, and draft persistence glue.

## 🧱 Key Files
- `buildKipEnvironmentContext.ts` — Session-bound environment payload for agent runs
- `resolveAgentEnvironment.ts` — Per-agent capability and policy resolution
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
