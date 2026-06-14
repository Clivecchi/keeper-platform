# integrationChronicle

## 📌 Purpose
Integration and Key Chronicle feeds, declaration-driven block rendering, and config/manage surfaces. Connected integrations and Key entities render chronicle blocks from `chronicle_blocks` declarations via `DeclarationChronicleBlocks`.

## 🧱 Key Files
- `declarationChronicle.tsx` — `DeclarationChronicleBlocks`, `resolveDeclarationActions`, integration + key block dispatch
- `serviceConfig.tsx` — per-service feed schemas and action builders
- `shared.tsx` — connection hooks, hero/status primitives, integration DTO types
- `feeds/KeyFeed.tsx` — Key EntityKind feed hook (`useKeyFeedData`)
- `feeds/CapabilityFeed.tsx` — Capability EntityKind feed hook (`useCapabilityFeedData`)
- `feeds/AIModelFeed.tsx` — AI model provider feed
- `KeyConfigPresence.tsx` — Key Config Mode CRUD surface
- `CapabilityConfigPresence.tsx` — Capability Config Mode (display_label, description)
- `capabilityNavUtils.ts` — Nav fetch/group + `capabilityChronicleTitle()` shared with cover
- `IntegrationConfigPresence.tsx` — AI model integration Config Mode
- `blocks/` — `ConnectionStatusBlock`, `KeyHealthBlock`, `LinkedAgentsBlock`, etc.

## 🔄 Data & Behavior
- **Cover (Integration + Key + Capability):** `IntegrationFocusPresence` / `KeyFocusPresence` / `CapabilityFocusPresence` always render `DeclarationChronicleBlocks` below `EntityCoverPresence`; client-side defaults from `@keeper/shared` when DB `chronicle_blocks` is empty (`resolveChronicleDeclaration.ts`)
- **Config mode:** metadata (`display_label`, `description`, `connect_copy` / key fields) saves through `useChronicleConfig` → `chroniclePatch.ts`; credential actions (verify, rotate, paste-key, disconnect) stay on POST routes via `KeyHealthBlock` and cover action buttons
- **Feed hooks:** `useAIModelFeedData` / `useKeyFeedData` supply live data to declaration blocks and Config credential blocks — no legacy cover feed UI
- `serviceConfig.tsx` — per-service feed hooks, hero/glow/status, and cover action builders (no `FeedComponent`)

## ⚠️ Notes & ToDo
- [ ] `resolveKeyDeclarationActions` for chronicle action bar on Key cover (verify/rotate/revoke slugs)
- [ ] Rendr layout grouping for InteractionBar (jsonframe Step 3)

## 📆 Update Log

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
