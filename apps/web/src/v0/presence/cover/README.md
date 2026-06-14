# cover

## 📌 Purpose
Universal Chronicle cover architecture (Layer 1) and EntityKind cover schemas (Layer 2). Every object type cover shares the same five slots — hero, identity, traits, credits, actions — filled by per-kind schemas.

## 🧱 Key Files
- `coverTypes.ts` — slot names, `EntityCoverSchema`, Theatre.js motion value names
- `coverMotion.ts` — Framer Motion hook (`atmosphereOpacity`, `nameReveal`, `statusPulse`, `heroEntrance`)
- `EntityCoverPresence.tsx` — Layer 1 universal slot renderer
- `schemas/agentCoverSchema.ts` — Layer 2 Agent EntityKind fill
- `AgentFocusPresence.tsx` — Agent Cover Mode + Config Mode orchestration
- `schemas/keyCoverSchema.ts` — Layer 2 Key EntityKind fill
- `KeyFocusPresence.tsx` — Key Cover Mode + Config Mode orchestration
- `schemas/capabilityCoverSchema.ts` — Layer 2 Capability EntityKind fill
- `CapabilityFocusPresence.tsx` — Capability Cover Mode + Config Mode orchestration
- `schemas/integrationCoverSchema.ts` — Layer 2 Integration (service) cover fill
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
- Integration selection in nav → `KeeperPresence` (`layout="focus"`) → `IntegrationFocusPresence`
- **Cover Mode (default):** `EntityCoverPresence` + always `DeclarationChronicleBlocks` (Integration/Key); client-side declaration defaults when DB blocks empty
- **Config Mode:** metadata via `useChronicleConfig` / `chroniclePatch.ts`; credential verify/rotate/disconnect stay inline (not Save bar)
- **Agent Cover Mode:** `EntityCoverPresence` + `agentCoverSchema.resolve()` from live agent record
- **Config Mode:** Configure action → `AgentConfigPresence`; back arrow returns to cover without requiring save
- Save reuses existing `handleSaveAgent` PATCH path in `KeeperPresence` — no third save route
- All colors via `hsl(var(--theme-*))`; agent `theme_color` drives hero radial accent

## ⚠️ Notes & ToDo
- [ ] Journey, Keeper, Moment, Draft cover schemas — add `schemas/*CoverSchema.ts` following agent pattern
- [ ] Theatre.js handoff — motion value names are fixed for Present integration
- [ ] Domain assignment edit — read-only today; domain switch API pending

## 📆 Update Log

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

### 2026-06-09 — Agent name in Training Mode instructions
- Training prompt UI now uses the active agent's name (Cloud, Rendr, Kip, etc.) instead of hardcoded "Kip"
- Added `agentNameHighlight.tsx` for bold accent-colored agent name in field subtitles and proposal scaffolds

### 2026-05-28 — Step 1: Agent Cover Card in Chronicle
- Added universal five-slot cover structure (`EntityCoverPresence`)
- Added agent cover schema and cinematic Cover Mode (hero, identity, traits, credits, actions)
- Added Config Mode with persistent Save, confirmed save indicator, and back navigation
- Wired `AgentFocusPresence` into `KeeperPresence` for `objectType="agent"` + `layout="focus"`
- Replaced legacy `AgentIdentityCard` inline Chronicle agent surface
