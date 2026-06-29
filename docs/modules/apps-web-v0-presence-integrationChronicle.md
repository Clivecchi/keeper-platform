# integrationChronicle

## 📌 Purpose
Integration and Key Chronicle feeds, declaration-driven block rendering, and config/manage surfaces. Connected integrations and Key entities render chronicle blocks from `chronicle_blocks` declarations via `DeclarationChronicleBlocks`.

## 🧱 Key Files
- `declarationChronicle.tsx` — `DeclarationChronicleBlocks`, `resolveDeclarationActions`, integration + key block dispatch
- `serviceConfig.tsx` — per-service feed schemas and action builders
- `shared.tsx` — connection hooks, hero/status primitives, integration DTO types
- `feeds/KeeperFeed.tsx` — Keeper EntityKind feed hook (`useKeeperFeedData`, `recordToKeeperDto`)
- `feeds/CapabilityFeed.tsx` — Capability EntityKind feed hook (`useCapabilityFeedData`)
- `feeds/AIModelFeed.tsx` — AI model provider feed
- `KeyConfigPresence.tsx` — Key Config Mode CRUD surface
- `CapabilityConfigPresence.tsx` — Capability Config Mode (display_label, description)
- `capabilityNavUtils.ts` — Nav fetch/group + `capabilityChronicleTitle()` shared with cover
- `IntegrationConfigPresence.tsx` — AI model integration Config Mode
- `ServiceBindingConfigPresence.tsx` — infra service binding Config Mode (GitHub repo + branch)
- `JourneyConfigPresence.tsx` — Journey Config Mode (name, forward) via `useChronicleConfig`
- `JourneyChronicleBlocks.tsx` — Paths + Moments declaration blocks below journey cover
- `DialogConfigPresence.tsx` — Dialog Config Mode (title) via `useChronicleConfig`
- `DialogChronicleBlocks.tsx` — Recent Exchanges + Sessions below dialog cover
- `DraftConfigPresence.tsx` — Draft Config Mode (title, status) via `useChronicleConfig`
- `DraftChronicleBlocks.tsx` — Summary, points (Accept + Discuss), versions, linked dialog sessions
- `cdraft.tsx` — Manuscript Chronicle treatment (header, manage bar, warm charcoal canvas)
- `draftManuscriptUtils.ts` — Point beats (prelude/opener/closer), path-emergence clustering
- `DraftVersionStrip.tsx` — Read-only last N versions from `GET .../versions`
- `DraftSessionsBlock.tsx` — Sessions on linked Dialog; highlights `active_draft_id` below draft cover
- `PathChronicleBlocks.tsx` — Prelude + moments below path cover
- `MomentChronicleBlocks.tsx` — Story body below moment cover

## 🔄 Data & Behavior
- **Cover (Integration + Key + Capability):** `IntegrationFocusPresence` / `KeyFocusPresence` / `CapabilityFocusPresence` always render `DeclarationChronicleBlocks` below `EntityCoverPresence`; client-side defaults from `@keeper/shared` when DB `chronicle_blocks` is empty (`resolveChronicleDeclaration.ts`)
- **Config mode:** metadata (`display_label`, `description`, `connect_copy` / key fields) saves through `useChronicleConfig` → `chroniclePatch.ts`; **service bindings** (GitHub `repository` + `defaultBranch`) save via `PATCH /api/integrations/:service?domainId=` → `domain.settings.serviceBindings` with legacy `ideBuildContext` sync; credential actions (verify, rotate, paste-key, disconnect) stay on POST routes via `KeyHealthBlock` and cover action buttons
- **Feed hooks:** `useAIModelFeedData` / `useKeyFeedData` supply live data to declaration blocks and Config credential blocks — no legacy cover feed UI
- `serviceConfig.tsx` — per-service feed hooks, hero/glow/status, and cover action builders (no `FeedComponent`)

## ⚠️ Notes & ToDo
- [ ] `resolveKeyDeclarationActions` for chronicle action bar on Key cover (verify/rotate/revoke slugs)
- [ ] Rendr layout grouping for InteractionBar (jsonframe Step 3)

## 📆 Update Log

### 2026-06-28 — Draft script-IDE rewrite queue
- **Rewrite** on proposed/pending points → Dialog prefilled for `draft.point.rewrite` (via `requestRewriteDraftPoint`)
- Manuscript **Anchors** collapsible when >2 accepted; **Rewrite queue** section for pending points
- Cdraft meta strip: anchor count + queue count

### 2026-06-27 — Domain tier key flags (AI Access)
- `domainKeyAccessSummary.ts` — tier-aware collapse; BYOK gated on `keeper`+ tiers
- `fetchDomainKeyAccess()` — loads `GET /api/domains/:id/key-access`
- `DomainAiAccessNav` — shows tier label; hides "Add your key" on Free tier

### 2026-06-27 — Domain AI access summary (included vs yours)
- `domainKeyAccessSummary.ts` — soft labels (`Included`, `Yours`); never raw `platform` in UI.
- Agent Board `DomainAiAccessNav` — count + brief provider lines; IDE keeps full key registry.

### 2026-06-27 — GitHub service binding (Chronicle Manage)
- Added `ServiceBindingConfigPresence` — GitHub repo + default branch on connected GitHub service (Manage action on cover)
- GitHub feed reads `integration.metadata.binding` → `domain.settings.serviceBindings` → legacy `ideBuildContext`

### 2026-06-23 — Cdraft manuscript Chronicle treatment
- `cdraft.tsx` replaces generic `EntityCoverPresence` for Draft focus — warm charcoal canvas, title header, manage bar, session badge
- `draftManuscriptUtils.ts` — opener truncation (177 chars), prelude/closer beats, path clustering
- `DraftPointRow` / `DraftPointsSection` manuscript mode — prelude · opener · closer cards, ghost Discuss, amber Accepted badge

### 2026-06-19 — Draft EntityKind Phase 1b
- `DraftVersionStrip`, `DraftSessionsBlock`, Discuss → Dialog via `draftDiscussAnchor` on board context
- Shared `DraftPointRow` with `data-gloss-anchor` via `@keeper/shared` `GlossAnchor`

### 2026-06-19 — Draft EntityKind migration
- `DraftConfigPresence` — title + status via `useChronicleConfig`; post-save `bumpDraftNav`
- `DraftChronicleBlocks` — points with Accept + optional linked dialog

### 2026-06-19 — Dialog EntityKind migration
- `DialogConfigPresence` — explicit Save for title; scope display read-only
- `DialogChronicleBlocks` — session lists with tappable resume

### 2026-06-19 — Path EntityKind migration
- `PathConfigPresence` — explicit Save for name/prelude (`PATCH /api/paths/:id`)
- `PathChronicleBlocks` — prelude story + tappable moments
- `JourneyChronicleBlocks` — path cards tappable (`navigateKind: path`)

### 2026-06-19 — Moment EntityKind migration
- `MomentConfigPresence` — explicit Save for title/narrative (`PATCH /api/moments/:id`)
- `MomentChronicleBlocks` — narrative story section below `EntityCoverPresence`

### 2026-06-19 — Journey EntityKind migration
- `JourneyConfigPresence` — explicit Save for name/forward (`PATCH /api/journeys/:id`)
- `JourneyChronicleBlocks` — paths and moments lists below `EntityCoverPresence`

### 2026-06-17 — Composer clip → Library upload
- `addLibraryUploadFromFile` shared by Library nav + and `AgentComposer` clip; sets `display_label` from filename

### 2026-06-17 — Keeper feed domain scoping
- `useKeeperFeedData(keeperId, domainId)` — GET `/api/keepers/:id?domainId=`; `recordToKeeperDto` for enrichment fallback

### 2026-06-14 — AgentCapability grants (Pass 2a)
- `AgentCapability` join table; backfill from `kip_agents` arrays (source: capabilities/tools/permissions)
- `used_by` reads `AgentCapability` rows; Config mode grant CRUD via POST/DELETE `/api/capabilities/:id/grants`
- `CapabilityUsedByGrantsBlock` in Config mode — add/remove agents (source: manual)

### 2026-06-13 — Capability EntityKind Pass 1 (registry)
- Added `CapabilityFeed.tsx`, `CapabilityConfigPresence.tsx`, `capabilityNavUtils.ts`, `blocks/capabilityBlocks.tsx` (`definition`, `used_by`)
- `DeclarationChronicleBlocks` `variant="capability"`; `used_by` cross-references `kip_agents` arrays (read-only)
- Config save → `PATCH /api/capabilities/:id` + `bumpCapabilityNav` post-save sync

### 2026-06-13 — Orphan feed UI cleanup
- Deleted `feeds/DeploymentFeed.tsx` (superseded by `blocks/DeploymentFeedBlock` in declaration chronicle)
- Removed legacy `GitHubFeed` cover UI component from `feeds/GitHubFeed.tsx`; hook + types retained for declaration blocks

### 2026-06-13 — Keys nav label aligned with Chronicle
- `keyChronicleTitle()` — same title rule as `keyCoverSchema` identity name
- `KeyConfigPresence` calls `bumpKeyNav({ keyId, display_label })` after metadata save
- Nav row selection prefers active `selectedKeyId` via `collapseKeyNavRows`

### 2026-06-13 — Phase 6 cleanup
- Removed `FeedComponent` from `serviceConfig.tsx` and legacy `AIModelFeed` cover UI component
- Trimmed redundant feed state (`keyInput`, `keySaveSuccess`) — metadata save is Config mode only; credentials stay on POST routes
- Cover + Config pattern documented: declaration blocks always; `chroniclePatch` for metadata; credentials separate

### 2026-06-13 — Cover body unification (Phase 4)
- `IntegrationFocusPresence` / `KeyFocusPresence`: always render `DeclarationChronicleBlocks`; removed `FeedComponent` fork
- `resolveChronicleDeclaration.ts`: client-side block/action defaults from `@keeper/shared` when DB columns empty

### 2026-06-13 — Key variant + orphan cleanup
- Extended `DeclarationChronicleBlocks` with `variant="key"` and `KeyDeclarationChronicleBlockList`
- Deleted unused `IntegrationChronicle.tsx` and `blocks/BlockPrimitivesPreview.tsx` (superseded by `IntegrationFocusPresence` + declaration blocks)
