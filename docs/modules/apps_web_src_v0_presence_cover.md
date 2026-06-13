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

### 2026-06-13 — Phase 6 cleanup (unified pattern docs)
- Documented unified Cover + Config split: declaration blocks always on cover; metadata PATCH via `chroniclePatch`; credentials separate

### 2026-06-13 — Cover body unification (Phase 4)
- `IntegrationFocusPresence` / `KeyFocusPresence`: always `DeclarationChronicleBlocks`; removed `FeedComponent` fork
- Client-side declaration defaults via `resolveChronicleDeclaration.ts` when DB `chronicle_blocks` empty
