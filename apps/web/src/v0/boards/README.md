# Boards

## 📌 Purpose
V0 Boards are full-viewport surfaces accessed via the `?board=` URL parameter. A Board owns its layout, chrome (top banner, InteractionBar), and context entirely — V0Shell mounts a Board and steps back.

## 🧱 Key Files
- `boardRegistry.ts` — Registry of all V0 Boards; parallel to `FRAME_REGISTRY` for Frames
- `designer/` — The Design Board (Platform Admin tool for editing domain frame JSON with Kip)

## 🔄 Data & Behavior
- Boards are accessed via `?board=<key>` on any `/d/:slug/board` URL
- `BOARD_REGISTRY` maps each key to a component, display name, and auth flags (`isPrivate`, `isAdminOnly`)
- V0Shell reads `?board=` and renders the matching Board component inside V0ShellProvider context
- Boards call `useV0Shell()` to access `domainSlug`, `domainFrame`, `resolvedAudience`, etc.
- `?board=` takes precedence over `?frame=` when both are present in the URL

## ⚠️ Notes & ToDo
- [ ] Boards do not currently have their own URL namespace — they share `/d/:slug/board`
- [ ] `V0BoardKey` type lives in `boardRegistry.ts`; if more boards are added, consider splitting

## 📆 Update Log
### 2026-05-04 — Moment 2.2: AgentBoard Reconciliation
- All 9 diagnostic gaps addressed. See `agent/README.md` for full change log.
- `AgentBoardIdlePanel.tsx` created in `agent/` directory.
- `AGENT_BOARD_SCHEMA` in `UniversalBoardSchema.ts` updated — right panel now has 3 named view states: `draft`, `agent`, `idle`.

### 2026-05-04 — Moment 2.1: Universal Board Schema
- Created `UniversalBoardSchema.ts` — new file only, no existing files modified
- Exports three interfaces: `UniversalBoardViewState`, `UniversalBoardDataFetch`, `UniversalBoardSchema`
- Exports four typed constants: `IDE_BOARD_SCHEMA`, `AGENT_BOARD_SCHEMA`, `DOMAIN_BOARD_SCHEMA`, `DESIGN_BOARD_SCHEMA`
- All constants populated from diagnostic-confirmed facts; unconfirmed values marked `// TODO: verify`
- Note: `boardRegistry.ts` confirms `isPrivate: true` for all boards; schema document's `isPrivate: false` for IDE/Agent/Domain diverges — flagged for Chuck to verify intent
- This is documentation-first wiring. Moment 2.2 begins Board reconciliation using this schema as the standard.
### 2026-03-31
- Domain Board (`domain/DomainBoard.tsx`): Brief mode center panel now renders `DomainBrief` (editable domain JSON form) instead of the placeholder; Kip composer unchanged.

### 2026-03-11
- Created `boards/` directory and `boardRegistry.ts` (Step 3 of designer-to-board migration)
- Moved designer files from `frames/designer/` to `boards/designer/` (Step 2)
