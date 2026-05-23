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
- [x] Migrate existing boards (IDEBoard, AgentBoard, DomainBoard) to use `UniversalBoard` shell — DONE
- [x] Build `UniversalConversation` component — DONE (Level 2, 2026-05-10)
- [ ] Level 3: UniversalViewPanel (right panel) reads def.contextSurface; 5-state IDEBoard right becomes default Chronicle behavior

## 📆 Update Log

### 2026-05-23 — Gate 1: selection drives both panels
- `UniversalBoardCenterProps` includes `selectedDialogId`; passed to `UniversalConversation`.
- `UniversalConversation` calls `useSelectionSessionResume` and builds Banner context from every Nav record type (Dialog, Journey, Keeper, Draft, Agent).

### 2026-05-10 — Level 2: UniversalConversation (single conversation render file)
- Created `UniversalConversation.tsx` — replaces IDEBoardConversation, AgentBoardConversation, DomainBoardConversation
  - `experienceContext` computed once from `useV0Shell()`, not three times
  - Calls `useAgentDialog` with parameters from `def.conversation` (agentSlug, agentDisplayName, mode, dialogueMode)
  - Branches on `def.conversation.kipMode` only for banner props + three ide-mode callbacks (onAfterAgentRun, handleSaveTitle, onServiceOpen adapter)
  - Calls `useDraftContext` for ide and agent modes with agentId from useAgentDialog
  - Domain mode: renders `DomainBanner` above `KeeperDialogFrame` with fetched journeyCount/momentCount
  - `KeeperDialogFrame` rendered exactly once
- Updated `UniversalBoard.tsx`:
  - `center` prop is now optional — omit it to get UniversalConversation by default
  - `domainSlug` added to default UniversalViewPanel (enables domain feed in Chronicle idle state)
  - `selectedServiceSlug` added to `UniversalBoardCenterProps` (exposed from context for right panel branch)
  - `boardKind` ternary fixed for proper TypeScript narrowing
- `AgentBoard.tsx` → `<UniversalBoard def={AGENT_BOARD_DEF} />` (3 lines)
- `DomainBoard.tsx` → custom left panel + DomainSwitcher overlay only; center/right/state removed
- `IDEBoard.tsx` → custom right panel only (5-state); left + center removed; all selection reads from centerProps
- Deleted: `IDEBoardConversation.tsx`, `IDEBoardNav.tsx`, `AgentBoardConversation.tsx`, `DomainBoardConversation.tsx`
### 2026-05-04 — Universal Board: Full Definition with Treatment
- Created `UniversalBoardDefinition.ts` — runtime board definition types and all four board defs
  - `UniversalBoardDef` interface — a new Board is a new object of this type, not a new component
  - `NavPanelDef`, `ConversationPanelDef`, `ContextPanelDef` — per-panel configuration
  - `ContextViewStateDef.presenceTreatment` — free-form treatment instructions to Rendr
  - `IDE_BOARD_DEF`, `AGENT_BOARD_DEF`, `DOMAIN_BOARD_DEF`, `DESIGNER_BOARD_DEF` — all four boards as defs
  - `BOARD_DEFINITIONS` registry — index by boardId
- Created `UniversalBoardContext.tsx` — unified selection state context
  - Mutually exclusive entity selections (Journey/Moment/Keeper/Draft/Agent/Service)
  - Session selection is independent — does not clear entity focus
  - Nav collapsed state owned at board level
  - `useUniversalBoard()` and `useUniversalBoardOptional()` hooks
- Created `UniversalBoard.tsx` — master orchestrator shell
  - Three panels: `UniversalNavPanel` (left) + `center` render prop + `UniversalContextPanel` (right)
  - domainId resolved once at board root — never delegated to panels
  - `rightOverride` prop for boards with transient right panel states (ServicesFrame, etc.)
  - `center` render prop delivers `UniversalBoardCenterProps` to the conversation component
- Created `panels/UniversalContextPanel.tsx` — right panel Living Multi-Context Surface
  - Treatment character: presence and intentional interaction
  - Five presence surfaces: DomainPresence, JourneyPresence, MomentPresence, KeeperPresence, DraftPresence
  - `PresenceTransition` layer — CSS-driven exit/enter sequence (140ms exit, 200ms enter)
  - Each surface fetches its own data — self-sufficient
- Updated `boardRegistry.ts` — added `def: UniversalBoardDef` field to each entry
### 2026-05-04 — Moment 2.2: UniversalNavPanel
- Created `UniversalNavPanel.tsx` — new file only, no existing files modified
- Single standard left nav panel component for all Boards rendering data records
- Replaces four divergent nav implementations (IDEBoardNav, AgentBoardNav, DomainBoard inline JSX, DesignBoardList) — wiring to Boards happens in Moments 2.6–2.9
- Layer 1: Dialogs, Journeys, Keepers, Drafts (conditional on boardContext)
- Layer 2: Board Instruments — IDE (Cloud, Rendr), Agent (fetched Agents), Designer (Rendr), Domain (none)
- All fetches keyed on `domainId` (never calls `/api/domains/by-slug`); all colors via `hsl(var(--theme-*))` only
- Response shapes confirmed from actual API routes and commented inline on every fetch

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
