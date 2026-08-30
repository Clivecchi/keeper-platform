# cover

## 📌 Purpose
Universal Chronicle cover architecture (Layer 1) and EntityKind cover schemas (Layer 2). Every object type cover shares the same five slots — hero, identity, traits, credits, actions — filled by per-kind schemas.

## 🧱 Key Files
- `coverTypes.ts` — slot names, `EntityCoverSchema`, Theatre.js motion value names
- `coverMotion.ts` — Framer Motion hook (`atmosphereOpacity`, `nameReveal`, `statusPulse`, `heroEntrance`)
- `EntityCoverPresence.tsx` — Layer 1 universal slot renderer (merged hero + identity header)
- `schemas/agentCoverSchema.ts` — Layer 2 Agent EntityKind fill
- `AgentFocusPresence.tsx` — Agent Cover Mode + Config Mode orchestration
- `schemas/keyCoverSchema.ts` — Layer 2 Key EntityKind fill
- `KeyFocusPresence.tsx` — Key Cover Mode + Config Mode orchestration
- `schemas/capabilityCoverSchema.ts` — Layer 2 Capability EntityKind fill
- `CapabilityFocusPresence.tsx` — Capability Cover Mode + Config Mode orchestration
- `schemas/keeperCoverSchema.ts` — Layer 2 Keeper EntityKind fill
- `KeeperFocusPresence.tsx` — Keeper Cover Mode + Config Mode orchestration
- `schemas/dialogCoverSchema.ts` — Layer 2 Dialog EntityKind fill
- `DialogFocusPresence.tsx` — Dialog Cover ↔ Config orchestration
- `schemas/draftCoverSchema.ts` — Layer 2 Draft EntityKind fill
- `DraftFocusPresence.tsx` — Draft Chronicle + inline authoring (`PresentMotionProvider` slide)
- `PathFocusPresence.tsx` — Path Cover ↔ Config orchestration
- `schemas/momentCoverSchema.ts` — Layer 2 Moment EntityKind fill
- `MomentFocusPresence.tsx` — Moment Cover ↔ Config orchestration
- `IntegrationFocusPresence.tsx` — Integration Cover Mode + Config Mode orchestration
- `AgentConfigPresence.tsx` — Config Mode compressed header + editable fields
- `AgentTrainingPresence.tsx` — Training Mode structured prompt editor
- `agentNameHighlight.tsx` — accent highlight for agent name in training instructions
- `trainingSectionEditors.tsx` — per-section voice prompt editors (Identity, Behavior, etc.)
- `openSession.ts` — Open Session → focus center conversation composer

## 🔄 Data & Behavior
- Agent selection in nav → `KeeperPresence` (`layout="focus"`) → `AgentFocusPresence`
- Key selection in nav → `KeeperPresence` (`layout="focus"`) → `KeyFocusPresence`
- Capability selection in nav → `KeeperPresence` (`layout="focus"`) → `CapabilityFocusPresence`
- Journey selection in nav → `KeeperPresence` (`layout="focus"`) → `JourneyFocusPresence`
- Moment selection in nav → `KeeperPresence` (`layout="focus"`) → `MomentFocusPresence`
- Dialog selection in nav → `KeeperPresence` → `DialogFocusPresence`
- Draft selection in nav → `KeeperPresence` → `DraftFocusPresence`
- Integration selection in nav → `KeeperPresence` (`layout="focus"`) → `IntegrationFocusPresence`
- **Cover Mode (default):** `EntityCoverPresence` + always `DeclarationChronicleBlocks` (Integration/Key); client-side declaration defaults when DB blocks empty
- **Config Mode:** metadata via `useChronicleConfig` / `chroniclePatch.ts`; credential verify/rotate/disconnect stay inline (not Save bar)
- **Agent Cover Mode:** `EntityCoverPresence` + `agentCoverSchema.resolve()` from live agent record
- **Config Mode:** Configure action → `AgentConfigPresence`; back arrow returns to cover without requiring save
- Save reuses existing `handleSaveAgent` PATCH path in `KeeperPresence` — no third save route
- All colors via `hsl(var(--theme-*))`; agent `theme_color` drives hero radial accent
- **Merged cover header (Phase A):** identity left, visual right; uploaded image bleeds with ambient blur wash; role line uses accent color

## ⚠️ Notes & ToDo
- [ ] Journey, Path, Moment, Dialog, Draft cover schemas — **Journey + Path + Moment + Dialog + Draft done**
- [ ] Theatre.js handoff — motion value names are fixed for Present integration
- [ ] Domain assignment edit — read-only today; domain switch API pending

## 📆 Update Log

### 2026-08-30 — Domain cover contrast
- `EntityCoverPresence` sits on `--treatment-surface` so Treatment ink is readable. Body copy uses ink, not accent teal. Domain names wrap instead of clipping to "liv".

### 2026-08-30 — Agent / Domain name in the Config header
- `ChronicleConfigShell` identity name is editable (Agent name, Domain name). Save still goes through the existing Save bar.

### 2026-08-30 — Cover upload is the domain look
- `DomainConfigPresence` cover image writes a Library item, sets cover, and extracts Treatment colors from the image. Further Library uploads do not restyle the Domain.

### 2026-08-25 — Library Back to Document
- `LibraryItemFocusPresence` shows **Back to Document** when a Dialog is still talking-in and Library took Chronicle (Nav / `library.read`). Dialog uploads no longer take Chronicle.

### 2026-08-22 — Draft inline authoring
- `DraftFocusPresence` uses `useDraftAuthoring` — pencil on the title, Point Save / Delete. Manage / Config is no longer the write path.

### 2026-08-22 — Dialog Forward in Config
- `DialogConfigPresence` authors Forward (directional objective) as well as title.

### 2026-08-11 — Draft promote under Cdraft meta
- `DraftFocusPresence` passes collapsed `DraftAddToDocumentControl` into `Cdraft` via `documentControl` (title-first cover). Manage/Config still hosts Add open by default.

### 2026-08-11 — Draft Focus hosts Add to Document
- `DraftFocusPresence` mounts `DraftAddToDocumentControl` on cover and config (draft-first containment; Nav cannot select Dialog + Draft together).

### 2026-08-03 — Domain Treatment scope copy
- `DomainConfigPresence` Treatment help text: full look on Chronicle/Presents; accent on Nav/Dialog; Trail stays Theme.

### 2026-07-16 — Document/Point rename
- `LibraryItemFocusPresence` uses `PointView` + `libraryItemToDocument` (was `ChronicleDocumentView` / `libraryItemToChronicleDocument`).

### 2026-07-15 — Library Chronicle Discuss → Dialog
- `LibraryItemFocusPresence`: Discuss on `PointView` passes `buildLibraryGlossAnchor` + perspective snapshot into Dialog via board context.

### 2026-07-11 — Visual-primary cover layout for images
- `coverTypes.ts`: added `CoverLayout` (`standard` | `visual-primary`) and optional `billingLine`
- `EntityCoverPresence.tsx`: `VisualPrimaryCoverHeader` — full-width playbill hero band for library image uploads and moment covers
- `libraryItemCoverSchema.ts` / `momentCoverSchema.ts`: image records use visual-primary layout with playbill billing typography

### 2026-07-02 — P3.2 Draft–Journey connection
- **`DraftFocusPresence`**: passes `targetJourneyId` from spec + Nav `selectedJourneyId` into promote hook and `Cdraft` breadcrumb.

### 2026-06-30 — Merged cover header (Phase A)
- `EntityCoverPresence.tsx`: replaced separate `HeroSlot` + `IdentitySlot` with `UnifiedCoverHeader` — identity left, image right
- Ambient blur wash from uploaded cover/avatar; image bleeds past right edge with accent-tinted scrim for text legibility
- Role line and voice-quote accent bar use entity accent color; crop marks and tall centered circle hero removed

### 2026-06-28 — Training storyboard (film strip + frame focus)
- Train opens on **Currently** frame; horizontal `TrainingFilmStrip` for Currently · Identity · Behavior · Capabilities · Governance.
- `TrainingFrameStage` — one framed editor at a time in Chronicle (replaces vertical accordion list).
- `activeTrainingFrame` in `UniversalBoardContext`; Dialog `agentTraining` context follows focused frame.

### 2026-06-22 — Cover card visibility after session activity
- `coverMotion.ts`: removed per-frame React `setState` on pulse animation (reduces update-depth pressure); added reduced-motion snap + 900ms safety fallback so `EntityCoverPresence` never stays at opacity 0 after interrupted entrance
- `EntityCoverPresence.tsx`: dropped debug `data-*` motion attrs tied to removed motion state

### 2026-06-23 — Cdraft manuscript treatment
- `DraftFocusPresence` renders `Cdraft` instead of `EntityCoverPresence` + separate blocks stack
- Manage bar → Config mode (`DraftConfigPresence`)

### 2026-06-19 — Draft EntityKind cover
- Added `draftCoverSchema.ts`, `DraftFocusPresence.tsx` (Cover · Config · Present slide)
- Points Accept in Chronicle via `DraftChronicleBlocks` + shared `useDraftPointAccept`

### 2026-06-19 — Dialog EntityKind migration
- Added `dialogCoverSchema.ts`, `DialogFocusPresence.tsx` (Cover · Config)
- `DialogConfigPresence` — title + Forward via `PATCH /api/domains/:id/kip/dialogs/:dialogId`; scope read-only
- `DialogChronicleBlocks` — Recent Exchanges + Sessions; removed legacy inline `DialogFocusPresence` from `KeeperPresence.tsx`

### 2026-06-19 — Path EntityKind migration
- Added `pathCoverSchema.ts`, `PathFocusPresence.tsx` (Cover · Config)
- `PathConfigPresence` — name + prelude via `PATCH /api/paths/:id`
- `PathChronicleBlocks` — prelude + moments list; journey Paths cards tappable via `onPathSelect`
- Universal Board: `selectedPathId` + trail kind `path` in Chronicle routing

### 2026-06-19 — Moment EntityKind migration
- Added `momentCoverSchema.ts`, `MomentFocusPresence.tsx` (Cover · Config)
- `MomentConfigPresence` — title + narrative via `PATCH /api/moments/:id`
- `MomentChronicleBlocks` — story body below cover; removed inline `PresenceEngagementActions` / autosave for moment focus

## 📆 Update Log

### 2026-07-01 — Phase 1.3 engagement Acts
- `JourneyFocusPresence`: cover path/moment/add-moment actions → `requestChronicleEngagement` (shared Chronicle Act pipeline)
- `PathFocusPresence`: cover “New Moment” → `moment.create` with `journeyId` + `pathId` context
- `pathCoverSchema`: moment.create action when authenticated

### 2026-06-19 — Journey EntityKind migration
- Added `journeyCoverSchema.ts`, `JourneyFocusPresence.tsx` (Cover · Config · Act)
- Engagement actions in cover actions slot; Act mode via `ChronicleActPresence`
- `JourneyConfigPresence` + `JourneyChronicleBlocks`; removed legacy `JourneyFocusPresence` from `KeeperPresence.tsx`

### 2026-06-17 — Keeper Config feed fix
- `useKeeperFeedData(keeperId, domainId)` appends `?domainId=` (required by keeper GET/PATCH middleware)
- `KeeperFocusPresence` falls back to enrichment `record` when feed is still loading; Config no longer stuck on empty shimmer

### 2026-06-17 — Keeper EntityKind (Session C)
- Added `keeperCoverSchema.ts`, `KeeperFocusPresence.tsx`; blocks: definition, journeys, engagement_templates, sole_memory
- Nav uses `keeperChronicleTitle`; Config PATCH via `useChronicleConfig` entityKind `keeper`

### 2026-06-13 — Capability EntityKind Pass 1
- Added `capabilityCoverSchema.ts` + `CapabilityFocusPresence.tsx` (Cover ↔ Config, declaration blocks below cover)
- Enforcement trait: infra → Enforced; tool/permission/action → Display only

### 2026-06-13 — Phase 6 cleanup (unified pattern docs)
- Documented unified Cover + Config split: declaration blocks always on cover; metadata PATCH via `chroniclePatch`; credentials separate

### 2026-06-13 — Cover body unification (Phase 4)
- `IntegrationFocusPresence` / `KeyFocusPresence`: always `DeclarationChronicleBlocks`; removed `FeedComponent` fork
- Client-side declaration defaults via `resolveChronicleDeclaration.ts` when DB `chronicle_blocks` empty

### 2026-06-13 — Key declaration chronicle blocks
- `KeyFocusPresence` renders `DeclarationChronicleBlocks` (`variant="key"`) from `key.chronicle_blocks` instead of hand-rolled linked agents list
- Matches `IntegrationFocusPresence` cover + declaration blocks layout

### 2026-06-12 — Delete retired Key/Integration presence wrappers
- Deleted `KeyPresence.tsx`, `integrationChronicle/KeyChronicle.tsx` (superseded by `KeyFocusPresence`)

### 2026-06-10 — Integration Cover Pattern Correction
- Added `integrationCoverSchema.ts` — five-slot cover fill from live Integration DTO + serviceConfig + capabilities
- Added `IntegrationFocusPresence.tsx` — universal cover + declaration blocks / legacy feed below
- Wired `IntegrationFocusPresence` into `KeeperPresence` for `objectType="service"` + `layout="focus"`
- Retired `ChroniclePresenceView` service early exit; marked `IntegrationPresence` wrappers retired

### 2026-06-10 — Key Pattern Correction
- Completed `keyCoverSchema.ts` slot fill (hero source badge, provider identity, credential traits, integration credits, Verify/Update actions)
- Added `KeyFocusPresence.tsx` — Cover Mode via `EntityCoverPresence`; Config Mode via `KeyConfigPresence`
- Wired `KeyFocusPresence` into `KeeperPresence` for `objectType="key"` + `layout="focus"`
- Retired `ChroniclePresenceView` early exit for `key`; marked `KeyPresence` / `KeyChronicle` retired

### 2026-06-10 — Key manage mode after verify
- Cover actions: Verify + Add Key (invalid) or Manage (valid) → Config Mode
- Config Mode: rotate/update valid credentials via KeyHealthBlock `allowValidRotate`; revoke when declared

### 2026-07-04 — Domain Tag + Presence sections
- **Domain tag** (slug) moved to Addresses — editable; **Keeper address** is derived read-only preview
- **Presence** section groups Character, Purpose, Theme color, Visibility
- Top identity fields: Name + Tagline only

### 2026-07-07 — Domain Configure Treatment fields
- `DomainConfigPresence` always renders Chronicle Treatment fields from platform schema defaults (not gated by `visibleFields` density/filter)

### 2026-07-04 — Domain addresses DNS panel theme + registrar records
- `DnsInfoPanel` compact mode matches Chronicle theme; shows registrar A/CNAME even when verified

### 2026-07-04 — Domain people section (Phase 4)
- `DomainPeopleSection.tsx` — members list, invite search, role PATCH, remove in Chronicle Configure

### 2026-07-04 — Domain addresses section (Phases 2–3)
- `DomainAddressesSection.tsx` — keeper subdomain preview, custom domain, Vercel + DNS in Chronicle Configure

### 2026-07-04 — Domain Configure slug field
- `DomainConfigPresence` field order: name → **slug** → tagline; helper text for keeper.domains addressing

### 2026-06-09 — Agent name in Training Mode instructions
- Training prompt UI now uses the active agent's name (Cloud, Rendr, Kip, etc.) instead of hardcoded "Kip"
- Added `agentNameHighlight.tsx` for bold accent-colored agent name in field subtitles and proposal scaffolds

### 2026-05-28 — Step 1: Agent Cover Card in Chronicle
- Added universal five-slot cover structure (`EntityCoverPresence`)
- Added agent cover schema and cinematic Cover Mode (hero, identity, traits, credits, actions)
- Added Config Mode with persistent Save, confirmed save indicator, and back navigation
- Wired `AgentFocusPresence` into `KeeperPresence` for `objectType="agent"` + `layout="focus"`
- Replaced legacy `AgentIdentityCard` inline Chronicle agent surface
