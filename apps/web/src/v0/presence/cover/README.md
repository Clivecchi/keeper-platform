# cover

## 📌 Purpose
Universal Chronicle cover architecture (Layer 1) and EntityKind cover schemas (Layer 2). Every object type cover shares the same five slots — hero, identity, traits, credits, actions — filled by per-kind schemas.

## 🧱 Key Files
- `coverTypes.ts` — slot names, `EntityCoverSchema`, Theatre.js motion value names
- `coverMotion.ts` — Framer Motion hook (`atmosphereOpacity`, `nameReveal`, `statusPulse`, `heroEntrance`)
- `EntityCoverPresence.tsx` — Layer 1 universal slot renderer
- `schemas/agentCoverSchema.ts` — Layer 2 Agent EntityKind fill
- `AgentFocusPresence.tsx` — Agent Cover Mode + Config Mode orchestration
- `AgentConfigPresence.tsx` — Config Mode compressed header + editable fields
- `AgentTrainingPresence.tsx` — Training Mode structured prompt editor
- `agentNameHighlight.tsx` — accent highlight for agent name in training instructions
- `trainingSectionEditors.tsx` — per-section voice prompt editors (Identity, Behavior, etc.)
- `openSession.ts` — Open Session → focus center conversation composer

## 🔄 Data & Behavior
- Agent selection in nav → `KeeperPresence` (`layout="focus"`) → `AgentFocusPresence`
- **Cover Mode (default):** `EntityCoverPresence` + `agentCoverSchema.resolve()` from live agent record
- **Config Mode:** Configure action → `AgentConfigPresence`; back arrow returns to cover without requiring save
- Save reuses existing `handleSaveAgent` PATCH path in `KeeperPresence` — no third save route
- All colors via `hsl(var(--theme-*))`; agent `theme_color` drives hero radial accent

## ⚠️ Notes & ToDo
- [ ] Journey, Keeper, Moment, Draft cover schemas — add `schemas/*CoverSchema.ts` following agent pattern
- [ ] Theatre.js handoff — motion value names are fixed for Present integration
- [ ] Domain assignment edit — read-only today; domain switch API pending

## 📆 Update Log

### 2026-05-28 — Step 1: Agent Cover Card in Chronicle
- Added universal five-slot cover structure (`EntityCoverPresence`)
- Added agent cover schema and cinematic Cover Mode (hero, identity, traits, credits, actions)
- Added Config Mode with persistent Save, confirmed save indicator, and back navigation
- Wired `AgentFocusPresence` into `KeeperPresence` for `objectType="agent"` + `layout="focus"`
- Replaced legacy `AgentIdentityCard` inline Chronicle agent surface

### 2026-06-09 — Agent name in Training Mode instructions
- Training prompt UI now uses the active agent's name (Cloud, Rendr, Kip, etc.) instead of hardcoded "Kip"
- Added `agentNameHighlight.tsx` for bold accent-colored agent name in field subtitles and proposal scaffolds
