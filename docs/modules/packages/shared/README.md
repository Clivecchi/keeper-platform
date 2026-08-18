# shared

## 📌 Purpose
Shared utilities, TypeScript types, and lightweight helpers reused across the Keeper Platform's frontend and backend.

## 🧱 Key Files
- `package.json` – workspace package manifest
- `tsconfig.json` – compilation settings extending the root config
- `src/index.ts` – public exports
- `src/logger.ts` – simple console logger
- `src/draftPoints.ts` – Draft Point types and `spec_json.points` helpers
- `src/draftPointPromotion.ts` – `buildDraftPointPromotionPlan` for journey_spec point → Path/Moment mapping
- `src/glossAnchor.ts` – `GlossAnchor` type + DOM attribute helpers
- `src/glossThread.ts` – `GlossThread` types, thread keys, metadata upsert helpers
- `src/integrationChronicleDeclarations.ts` – Integration/Key Chronicle declaration defaults and backfill helpers
- `src/domainTier.ts` – domain pricing tier flags (`free` / `keeper` / `studio`) and key access policy
- `src/guidedArrival.ts` – Phase 2.1 pending detection + compose hint
- `src/chronicleSubject.ts` — Chronicle subject/overlay resolution (`glossary` subject + `OBJECT_GLOSSARY_SUBJECT_ID`)

## 🔄 Data & Behavior
This package exposes pure functions and type definitions; it holds no runtime state. The logger writes to stdout in all environments, ensuring messages surface in Railway / Vercel logs.

Draft Points live in `kip_drafts.spec_json.points` (not a separate table). Use `canonicalizeDraftSpecJson` on writes, `normalizeDraftSpecJson` on reads (legacy `sections` read compat), `createDraftPoint`, and `appendDraftPointToSpec` from `draftPoints.ts`.

Integration, Key, Capability, Library, and Keeper Chronicle declaration defaults live in `integrationChronicleDeclarations.ts`.

## ⚠️ Notes & ToDo
- [ ] Migrate common KAM (auth) types here
- [ ] Consider adding a shared UI primitives package later

## 📆 Update Log

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