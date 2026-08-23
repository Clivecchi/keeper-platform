# Kip Services

## 📌 Purpose
Shared server-side helpers for Kip agent runtime — environment resolution, dialog lifecycle, and draft persistence glue.

## 🧱 Key Files
- `buildKipEnvironmentContext.ts` — Session-bound environment payload for agent runs
- `resolveAgentEnvironment.ts` — Per-agent capability and policy resolution
- `buildDomainLeadCollaborationPrompt.ts` — Role-aware domain lead vs Kip support prompt (Lead only; never Cast)
- `buildKeeperCardRenderingPrompt.ts` — Shared keeper-card vs prose system prompt (decision consult Lock/Open/Next Step)
- `ensureDialogGlossCarrier.ts` — Find/create Dialog message for Document Point glossThreads
- `ingestExternalDocument.ts` — External markdown → Dialog + document_manuscript Points + real session (create or attach)
- `resolveKipActionAllowlistStatus.ts` — session-bound Kip allowlist + canDraft read (MCP / REST)
- `agentRunTimings.ts` — Per-turn phase timing bag (`envResolve` / model / actions) for latency diagnosis
- `streamAgentOutput.ts` — Incremental extractor for the streamed `response` field inside `agent_output` JSON
- `loadDialogDocumentForChronicle.ts` — Chronicle Document loader (Forward/Step/Paths + manuscripts with Points)
- `loadDialogDocumentForAgent.ts` — Agent-facing Document summary (prompt injection)
- `linkDraftToSessionDialog.ts` — Sets `kip_drafts.dialog_id` from the active session's Dialog (first link wins)
- `promoteDraftPoint.ts` — Keeps accepted `journey_spec` Points as Moments with identity preserved (`Moment.id = Point.id`); supports evolution + path-at-keep / pathless keep
- `actionFollowUp.ts` — Second model turn after read-only actions (`draft.read`, etc.) so Kip answers with live results
- `pointIntent.ts` — Explicit Point-intent Agency obligation (detect → Working on target → prompt + follow-up)
- `documentReorganizeStore.ts` — persist / Apply / dismiss a Lead Review & Reorganize proposal on the manuscript
- `documentReorganizeIntent.ts` — detect review/reorganize language and prompt the Lead to propose, not rewrite
- `ensureDialogDocumentManuscript.ts` — lazily creates the Dialog `document_manuscript` so named Dialogs can receive Points
- `ensureKnownLeadAgent.ts` — Self-heals canonical Lead agents (`kip`, `ceox`) on slug lookup
- `modeConfig.ts` — Kip mode configuration helpers
- `mockAgents.ts` — DB-disabled development agents

## 🔄 Data & Behavior
- Draft mutations during agent runs call `ensureDraftLinkedToSessionDialog` so Chronicle Sessions blocks can load linked Dialog sessions.
- Linking is idempotent: existing `dialog_id` on a draft is never overwritten.
- Working drafts link only to human-named Dialogs (`user_set`). Chatter stays a session — draft attach does not promote it to a Document.
- `getKipAgentBySlugEnsured` repairs drifted `role` / `visibility` for canonical Lead slugs before agent metadata is returned.

## ⚠️ Notes & ToDo
- [ ] Consolidate dialog find/create helpers with `kipDialogLifecycle.ts` if duplication grows

## 📆 Update Log

### 2026-08-22 — Review & Reorganize
- Lead action `document.reorganize.propose` stores a proposed Document on the manuscript. Apply writes Sections + Points atomically and clears the proposal. The accepted Document is unchanged until Apply.

### 2026-08-22 — Keeper Stage on the turn
- `resolveAgentEnvironment` loads `Domain.settings.keeperStage`. Compact env + Lead prompts include Stage composition and contextual Agency.

### 2026-08-22 — Author result type (Railway tsc)
- `AuthorDialogDocumentResult` is a clean ok/err union so route handlers narrow. Manuscript `spec_json` writes go through `asJson` so Prisma accepts the authored spec.

### 2026-08-22 — Author Document CRUD
- `authorDialogDocument.ts` writes manuscript Points as a full replace (add / update / delete / reorder) so accepted Points can be edited or removed by the author.

### 2026-08-22 — Forward on every named Document
- Chronicle and agent Document loaders resolve Forward from authored Dialog fields. Title-only Forward is enough — description is no longer required to show the slot. Agent prompt: Document is primary background; Forward is the Dialog’s directional objective; user-facing groups are Sections.

### 2026-08-21 — Talking in / Working on write target
- Point obligation writes to the focused Draft (`environment.activeDraft`) when Chronicle is on that Draft. Dialog manuscript is the default only when nothing else is focused. Chatter + Draft writes to the Draft; never invents a Document.

### 2026-08-21 — Point contract is content-only
- Model emits `payload.content`. Keeper owns the manuscript id (ensure + fill at execute). Point grounding forbids Domain Contract / schema / Prisma in Point wording.

### 2026-08-21 — Point UI on failure, not just success
- `pointIntent.ts` — failed `draft.update.propose` builds an error keeper-card and strips Prisma from Dialog copy. Point cards are the UI whether the write landed or not.

### 2026-08-21 — Point write target is Keeper-owned
- `pointIntent.ts` — `isKipDraftUuid` + `applyManuscriptDraftIdToProposePayload`: placeholder ids (`none`) and manuscript keys (`manuscript-…`) are not draft ids. Explicit Point turns force the Dialog manuscript UUID. `findDraftForPointMutation` looks up by UUID or manuscript `key` and never sends a non-UUID to `kip_drafts.id`.

### 2026-08-21 — Point Turns reply with UI, not novels
- Successful `draft.update.propose` attaches a summary keeper-card of the Point titles. Lead essays that dump Cast as `### Cloud` / `### Rendr` are replaced with a short confirmation. Cast Point-turn advice is clamped. Prompt: 1–3 sentences + cards/actions.

### 2026-08-21 — Named Dialog manuscript on Point intent
- `ensureDialogDocumentManuscript.ts` — a named Dialog showing “No Points yet” is an unbuilt Document, not a missing target. Explicit Point intent now creates the empty `document_manuscript` and Lead writes into it. Cast advises; Lead owns `draft.update.propose`.

### 2026-08-20 — Explicit Point intent (first Agency obligation)
- `pointIntent.ts` — detects “propose/add/capture Points” vs “don’t add yet”; resolves the active named Dialog’s `document_manuscript`; Lead follow-up requires `draft.update.propose`; Cast gets compact Keeper-Point grounding.
- `loadDialogDocumentForAgent` now includes `titleSource` + manuscript id so Chatter vs Document and the write target are knowable without a UUID from the human.

### 2026-08-19 — Streamed Dialog replies
- `streamAgentOutput.ts` — extracts user-facing `response` tokens from the JSON envelope as they arrive.
- `actionFollowUp.ts` — `responseAlreadyUsesReadResults` skips a second model call when the first reply already cites live read titles/URLs (never skips `delegate.consult`).

### 2026-08-19 — Session ≠ Dialog (locked)
- `linkDraftToSessionDialog.ts` — no Chatter→Dialog promotion; working drafts link only to `user_set` Dialogs.

### 2026-08-19 — Capability Ledger Phase 1
- `resolveKipActionAllowlistStatus.ts` — session-bound read of the Kip executor allowlist + JWT `canDraft`. Used by MCP `kip_actions_list` and `GET /api/kip/actions/allowlist`. `resolveSessionDraftCapability` exported from `resolveAgentEnvironment.ts`.

### 2026-08-19 — Kip support must act, not promise
- `buildDomainLeadCollaborationPrompt` — platform Kip uses tools in the same turn when the user asks to launch/build/present a surface. No hanging "I'm here if you need me." Domain lead is told not to only ask clarifying questions on a launch ask.

### 2026-08-18 — glossary.read + dialog.read honesty
- `loadObjectGlossary.ts` — same governing file Chronicle renders. `glossary.read` lists terms or returns matching sections. Honesty: not a draft.
- `buildDialogReadHonesty` — empty Points means the Document is unbuilt; follow-up tells Lead not to claim a read. `dialog.read { id }` uses `loadDialogDocumentForAgent` (same source Chronicle renders).

### 2026-08-17 — External writing ingest
- `ingestExternalDocument.ts` — markdown → accepted Document Points on `document_manuscript`; creates or attaches a Dialog; starts a real Kip session on create, reuses the latest session on attach; ensures Gloss carrier. Never a Library item.

### 2026-08-09 — Phrase-level Gloss focus
`buildGlossDiscussPrompt` (in `api/kip/agents.ts`) prefers `glossAnchor.selectionText` when present so Kip discusses the highlighted phrase, not only the parent node snapshot.

### 2026-08-09 — User message attachment metadata
- Agent runs persist `displayContent`, `attachments`, and `supportingDocs` on the saved user `kip_messages.metadata` so Dialog can rehydrate sent thumbs / Pasted tiles after reload.

### 2026-08-06 — Document Gloss carrier
- `ensureDialogGlossCarrier.ts` + `POST /kip/dialogs/:id/gloss-carrier` — Chronicle Document Point Gloss can persist threads without requiring a prior Dialog turn.
- Gloss prompt (agents.ts): draft Points must `draft.point.rewrite` in the same turn or admit no change — no “I’ll revise later” promises.

### 2026-08-05 — Decision consult keeper-cards
- `buildKeeperCardRenderingPrompt.ts` — Lead/cast decision synthesis must emit summary card with Lock / Open / Next Step items; Cockpit compose + live `callAIModel` share one helper.

### 2026-08-05 — Cast ≠ domain lead (collaboration prompt)
- `buildDomainLeadCollaborationPrompt.ts` — domain lead resolution requires `role === 'Lead'` among non-platform agents. Dialog Cast guests (`role: 'Cast'`) no longer trigger Kip “platform support / defer to X” overrides. Locked: Cast membership ≠ domain lead.

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

### 2026-08-10 — Dialogs in domain index + dialog.read + nav index
- `domainIndex.dialogs` added in `buildKipEnvironmentContext` / `resolveAgentEnvironment`.
- Agent action `dialog.read` (list / search / get by id) — same pattern as `library.read`.
- `buildDomainNavIndex.ts` powers member cross-nav search.
- Draft attach promotes Chatter Dialogs (`title_source` auto_generated → system_promoted) in `linkDraftToSessionDialog`.
- Cast-consult runs accept `ephemeral` to skip session create.

### 2026-07-14 — Library in domain index
- `domainIndex` now includes up to 20 recent Library items (id, label, sourceType) alongside keepers and journeys in both `resolveAgentEnvironment` and `buildKipEnvironmentContext`.
