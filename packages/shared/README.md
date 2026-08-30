# shared

## 📌 Purpose
Shared utilities, TypeScript types, and lightweight helpers reused across the Keeper Platform's frontend and backend.

## 🧱 Key Files
- `package.json` – workspace package manifest
- `tsconfig.json` – compilation settings extending the root config
- `src/index.ts` – public exports
- `src/logger.ts` – simple console logger
- `src/draftPoints.ts` – Draft Point types and `spec_json.points` helpers
- `src/pointProposeIdentity.ts` – Same-Point identity / collapse duplicate `draft.update.propose`
- `src/sessionActionLog.ts` – Session action receipts for the Lead prompt
- `src/draftHostTitle.ts` – Document vs Draft name on Point receipts
- `src/draftPointPromotion.ts` – `buildDraftPointPromotionPlan` for journey_spec point → Path/Moment mapping
- `src/glossAnchor.ts` – `GlossAnchor` type + DOM attribute helpers
- `src/glossThread.ts` – `GlossThread` types, thread keys, metadata upsert helpers
- `src/integrationChronicleDeclarations.ts` – Integration/Key Chronicle declaration defaults and backfill helpers
- `src/domainTier.ts` – domain pricing tier flags (`free` / `keeper` / `studio`) and key access policy
- `src/guidedArrival.ts` – Phase 2.1 pending detection + compose hint
- `src/dialogTitleSource.ts` — Chatter vs named Dialog vs Document-bearing (`user_set` only)
- `src/talkingInWorkingOn.ts` — Talking in (Dialog/session) vs Working on (Document/Draft) + Point write-target helper
- `src/keeperStage.ts` — Stage composition (object references + contextual Agency); not Theatre-as-database

## 🔄 Data & Behavior
This package exposes pure functions and type definitions; it holds no runtime state. The logger writes to stdout in all environments, ensuring messages surface in Railway / Vercel logs.

Draft Points live in `kip_drafts.spec_json.points` (not a separate table). Use `canonicalizeDraftSpecJson` on writes, `normalizeDraftSpecJson` on reads (legacy `sections` read compat), `createDraftPoint`, and `appendDraftPointToSpec` from `draftPoints.ts`.

Integration, Key, Capability, Library, and Keeper Chronicle declaration defaults live in `integrationChronicleDeclarations.ts`.

## ⚠️ Notes & ToDo
- [ ] Migrate common KAM (auth) types here
- [ ] Consider adding a shared UI primitives package later

## 📆 Update Log

### 2026-08-29 — Story-builder continuity
- `directorContinuity.ts` — offering a Point in prose is incomplete; emit `draft.update.propose`. The card is consent.

### 2026-08-29 — Restatement is named, not hidden
- `summarizeReorganizeProposal` / `isDocumentReorganizeRestatement` / `formatReorganizeOverlaySummary` — no Point marks, no title/Forward edit, and the same Section titles in the same order is a restatement. Chronicle can say so.

### 2026-08-29 — Review & Reorganize does not dump to Open
- `documentReorganize.ts` — omitted `sectionId` is a safety default (keep current Section), not a preference for the current structure. Explicit `open` / null is Open. An all-to-Open dump is repaired. Proposed Section titles rematch current ids so intentional placement does not orphan. Refine/merge that also changes Section still carries `Moved from…`.
- `draftPoints.ts` — agent summaries include `pathGroupId` so Kip can see current membership as evidence.

### 2026-08-26 — Session action log
- `sessionActionLog.ts` — compact receipt list from `kip_messages.metadata.actionResults` (time, type, status, Point title). Narration is not evidence.

### 2026-08-26 — Same Point twice
- `pointProposeIdentity.ts` — Keeper owns Point dedupe. Identical body, or a distinctive title with the same opening body, is one Point. Cast Notes are ignored. Same-turn duplicate `draft.update.propose` actions collapse to the first.

### 2026-08-25 — Document title and Forward
- `documentReorganize.ts` — Lead may propose Document name (`title`) and Forward. Identity-only proposals are valid. Apply writes Dialog identity.

### 2026-08-25 — Document vs Draft host title
- `displayDraftHostTitle` — Point receipts name the Dialog, not `· manuscript`.

### 2026-08-25 — Chronicle is Working on
- `resolveChronicleActiveDraftId` — leftover session drafts and other Dialog manuscripts do not steal Point writes.

### 2026-08-25 — Point identity
- `resolveDraftPointRef` — UUID, 1-based number, or title. Same rules as Review & Reorganize.
- `rewriteDraftPointInSpec` — title-only updates may omit content.

### 2026-08-22 — Keeper Stage contract
- `keeperStage.ts` — Stage owns presence/placement/contextual Agency. Objects stay themselves. Chronicle Working on (agent/journey/…) now wins over Talking in Dialog when both IDs are set.

### 2026-08-22 — Agents named in the story
- `buildTalkingInWorkingOnPrompt` — Talking in vs Working on. A Dialog title is the conversation’s name. A Draft is a Document Section. The work is making a story from the Dialog — not inventing a fiction outline from the title.

### 2026-08-21 — Talking in / Working on locked
- `talkingInWorkingOn.ts` — two coordinates. Focused Draft is Working on; named Dialog stays Talking in. Chronicle `resolveChroniclePrimary` prefers Draft over Dialog when both IDs are set.
- Point writes use `resolvePointWriteTarget` (Draft wins; Session never invents a Document).

### 2026-08-19 — Universal Nav subject
- `resolveChroniclePrimary` uses `selectedBoardDefId` only. Design URL / `isDesignerBoard` do not route Chronicle.

### 2026-08-19 — One Nav subject
- `resolveChroniclePrimary` — Design `boardDefinitionId` is idle spec only. Dialog, Draft, and other Nav entities win Chronicle. `hasChronicleEntitySubject` is the shared gate so URL `?definition=` cannot wipe a Dialog.

### 2026-08-19 — Session ≠ Dialog (locked)
- `isDocumentBearingDialogTitleSource` — Chronicle Document is `user_set` only. `system_promoted` stays a conversation.

### 2026-08-17 — Glossary Chronicle subject
- `chronicleSubject.ts` — `glossary` kind, `OBJECT_GLOSSARY_SUBJECT_ID`, priority over Design `boardDef`.

### 2026-08-03 — MCP OAuth grant type
- Added `mcpOauthGrant.ts` — `McpOAuthGrantRecord` for External Access OAuth grant list/revoke.

### 2026-06-19 — GlossThread helpers
- Added `glossThread.ts` — thread keys, parse/upsert helpers, `ensureGlossThreadCarrier` for MCP/dialog gloss anchor seeding.

### 2026-07-15 — Gloss MCP scope
- `domainAccessKey.ts` — added `gloss.rw` to `DOMAIN_ACCESS_KEY_SCOPES` for external gloss thread writes (distinct from `library.ro`).

### 2026-07-03 — Record naming
- Added `recordNaming.ts` — `shapeRecordTitle` (short labels) and `shapeRecordDescription` (long body) used by Library archive, moments, and Nav display.

### 2026-07-01 — Guided Arrival (Phase 2.1)
- Added `guidedArrival.ts` — `isGuidedArrivalPending`, `GUIDED_ARRIVAL_COMPOSE_HINT`.
- `defaultDomainSettingsForCreate` seeds `arrivalCompleted: false` for new domains.

### 2026-07-01 — Personal domain frame identity (Phase 1.4)
- Added `domains/domainFrameIdentity.ts` — shared `domainFrameLooksUnseeded` for API provisioner and web V0Shell auto-repair.

### 2026-06-30 — Draft point promotion (Phase 2.2b)
- `DraftPoint.promotion` JSON refs (`promotedPathId`, `promotedMomentIds`, etc.)
- Added `draftPointPromotion.ts` — `buildDraftPointPromotionPlan` using `resolveDraftPointStructure`

### 2026-06-29 — Draft point structure + film strip
- Added `draftPointStructure.ts` — journey_spec PATH/Moments parsing; promotion mapping (point→Path, moments→Moment)
- `buildDraftSummaryFromAcceptedPoints` builds beat arc, not content concatenation
- DraftPoint gains optional `moments[]`; propose/rewrite actions accept prelude/closer/moments

### 2026-06-28 — Draft point rewrite + anchor guard
- Added `isDraftPointRewritable`, `rewriteDraftPointInSpec`, `summarizeDraftPointsForAgent`.
- `mergeDraftPointsById` ignores content overwrites for accepted (kept) anchor points.

### 2026-06-27 — Domain tier key flags
- Added `domainTier.ts` — `parseDomainTier`, `getDomainTierKeyPolicy`, `applyTierToResolvedProviderKey`, `defaultDomainSettingsForCreate`.

### 2026-06-19 — Draft spec merge safety (points preservation)
- `mergeDraftSpecPatch` merges points by id; empty `points: []` no longer wipes existing points; non-content spec keys preserved on merge.
- `appendDraftPointToSpec` / `updateDraftPointInSpec` preserve extra spec keys (paths, purpose, etc.).

### 2026-07-03 — Gloss thread types + extended anchors
- Extended `GlossAnchor` with `message`, `library`, `messageId`, `receiptIndex`, `GlossContentSnapshot`
- Added `glossThread.ts` for inline gloss persistence on `kip_messages.metadata`

### 2026-06-19 — GlossAnchor types (Phase 1b)
- Added `glossAnchor.ts` — `GlossAnchor`, `buildGlossAnchorDataAttribute`, `glossAnchorToDraftDiscuss`

### 2026-06-17 — Phase 0 draft content-shape + Keeper declarations
- `canonicalizeDraftSpecJson`, `sectionsToDraftPoints` — points-only writes; legacy sections merged on read
- `resolveKeeperChronicleDefaults`, `DEFAULT_KEEPER_CHRONICLE_BLOCKS`

### 2026-06-13 — Integration/Key Chronicle declaration defaults
- Added `integrationChronicleDeclarations.ts` — shared declaration map, create/backfill helpers for Integration and Key rows

- 2026-05-27 – Added `draftPoints.ts`: Draft Point model (`proposed | accepted | pending`, types `moment | decision | context | general`) stored in `spec_json.points`.