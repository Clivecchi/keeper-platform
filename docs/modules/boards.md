# Boards

## 📌 Purpose
V0 Boards are full-viewport surfaces accessed via the `?board=` URL parameter. A Board owns its layout, chrome (top banner, InteractionBar), and context entirely — V0Shell mounts a Board and steps back.

## 🧱 Key Files
- `boardRegistry.ts` — Registry of all V0 Boards; parallel to `FRAME_REGISTRY` for Frames
- `workspaceBoardNav.ts` — Shared `?board=` / `?boardDef=` URL helpers for workspace switching
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

### 2026-06-12 — Workspace nav authority + ?definition= param
- `?board=` = workspace only (top bar); `?definition=` = Design board spec nav (replaces confusing `?boardDef=`)
- All workspace URL writes live in `V0Shell` (`switchWorkspace`, `selectBoardDefinition`, `clearBoardDefinition`)
- Top bar / Design nav / Chronicle trail call shell methods — no distributed `setSearchParams`
- `workspaceEpoch` remounts board if URL already matches (unsticks desynced UI)
- Legacy `?boardDef=` migrated to `?definition=` on Design workspace

### 2026-06-12 — Workspace board nav desync fix
- Added `workspaceBoardNav.ts` — single helper module for `?board=` / `?boardDef=` updates
- Top bar uses `navigate()` with preserved query params (replaces `setSearchParams` only)
- V0Shell strips stale `?boardDef=` when workspace board is not Design
- Design board syncs `?boardDef=` ↔ selection bidirectionally; non-Design clears stale selection in context
- Top bar `z-50` so Brief scrim does not block board tabs

### 2026-06-10 — Top bar workspace board switch fix
- Removed context→URL push for `boardDef` (re-added param after top bar cleared it, blocking IDE/Agent/Domain switches)
- Top bar uses `setSearchParams` for workspace board tabs; strips `boardDef` when leaving Design
- Trail back-nav on Design clears `boardDef` from URL explicitly

### 2026-06-10 — Design boardDef nav: context-first selection
- Board Definitions nav uses **spec/meta** pattern: `onBoardDefSelect` + `setSearchParams` (not `navigate()`)
- Context is source of truth; URL mirrors selection for deep links only (one-time on mount)
- Removed continuous URL→context sync that could re-lock selection after trail/clear
- `onBoardDefSelect` clears entity selections when a def is chosen

### 2026-06-10 — Board URL sync + boardDefs merge fix
- `resolveBoardDefs`: nav section flags are code-only (frame JSON could leak `boardDefs` onto IDE)
- `boardDefs: false` explicit on IDE/Agent/Domain defs; Chronicle `boardDef` kind gated to `designer` board only
- Top bar board switch preserves query params; clears `boardDef` when leaving Design
- Board Definitions nav navigates to `?board=designer&boardDef=<id>`; shell syncs URL ↔ selection
- `UniversalBoard` keyed by `boardId` in V0Shell

### 2026-06-10 — Board switch + Chronicle live selection
- `UniversalBoardProvider` keyed by `def.boardId` — selection and session reset when switching IDE / Agent / Design / Domain tabs
- Chronicle `PanelBody` driven by live context (see `panels/README.md`)

### 2026-05-28 — Domain board load: single domain fetch + deferred session
- **UniversalBoard:** `domainId` syncs from `V0Shell` `domainData` — removed duplicate `/api/domains/by-slug` fetch
- **useAgentDialog:** domain mode waits for resolved `domainId` before `createSession` — avoids double session + message reload

### 2026-05-27 — Draft update reliability (IDE + Agent)
- **UniversalConversation:** wired `onConfirmDraftUpdate` for `draft.update.propose` confirm cards; IDE mode handles `draft.update` receipts (Chronicle + draft list refresh)
- **Agent Board:** unchanged — already had confirm wiring via `AgentBoardFrame`

### 2026-05-26 — Agent Board draft visibility after agent actions
- **useAgentDialog:** attaches `actionResults` to agent/domain messages (action receipt cards in Dialog)
- **UniversalConversation:** on successful `draft.create`/`draft.update`, refreshes Drafts nav and opens draft in Chronicle; moment/journey receipts tappable on Agent Board
- **UniversalBoard:** internal `draftListVersion` / `journeyListVersion` bumps via `onDraftListRefresh` / `onJourneyListRefresh` center props

### 2026-05-26 — Agent Board: decouple Dialog from Chronicle nav
- **UniversalConversation:** `activeDialogAgentId` persists the center-panel agent when Chronicle shifts to keeper/journey/draft; session no longer reverts to Kip
- **useSelectionSessionResume:** skips session swap on Agent Board for keeper/journey/draft-only nav
- **Echo session:** dedicated `"Agent Board Echo"` session name — no longer hijacks the most recent Kip thread

### 2026-05-26 — UI polish + agent echo prompt + Chronicle lens editing
- **Dialog glass:** frosted center panel — atmosphere visible through Dialog (see `index.css`, `KeeperDialogFrame`)
- **Typography:** base `html` font-size 17px → 19px; nav, banner, Chronicle field classes scaled in `.keeper-board-scope`
- **Chronicle:** Lens prompt editable textarea → `PATCH /api/kip/lenses/:lensId`; composed prompt refresh after save
- **Agent echo:** supporting-role prompt frames exchange context explicitly (UniversalConversation)

### 2026-05-26 — Agent Echo rename (no behavior change)
- Renamed `leadAgentWhisper` → `agentEcho` on board def; `kipLeadAgentId` → `echoAgentId`; `kipEchoSessionId` → `echoSessionId`
- Echo attribution fallback uses `def.conversation.agentName` via `echoAgentName` prop — not hardcoded "Kip"
- Comments updated to "agent echo" / "echo agent session"

### 2026-05-26 — Agent Board Phase 4: Agent Echo (Dialog Response)
- **Lens seed:** `Agent Board Lens` added; `## Echo Role (Agent Board)` section appended to Domain Lens and Agent Board Lens — editable via Chronicle after re-seed
- **Agent echo inference:** `UniversalConversation` fires second `KipApi.runAgent` on echo agent id + echo agent session after non-default agent replies when `agentEcho: true`
- **Agent echo rendering:** `AgentDialogueMessage.echo` attached beat beneath agent bubble in `DialogueMessageList` — empty agent echo renders nothing
- **Session split:** Primary agent session (e.g. Cloud) stays separate; agent echo stored in echo agent session history

### 2026-05-25 — Agent Board Phase 3: center dialog follows selected agent
- **Preflight:** Lens prompt PATCH validation errors surface inline in Chronicle (10-character minimum)
- **Board def:** `agentEcho: true` on `AGENT_BOARD_DEF.conversation`
- **Center dialog:** `UniversalConversation` resolves `agentSlug` / display name from selected nav agent when it differs from board default; Banner shows agent name, board name, and purpose prelude
- Session resume already keyed on `selectedAgentId`; `kipAgentId` from `useAgentDialog` now matches the resolved agent

### 2026-05-25 — Agent Board Phase 0–2 (Universal Board + Chronicle)
- **Phase 0:** `PATCH /api/agents/:id` for Chronicle saves; `context_scope` on GET; `AGENT_BOARD_DEF.nav.primarySection: "agents"` (agents first in nav)
- **Phase 1:** Composed system prompt preview in Chronicle (read-only; API `GET /api/agents/:id/composed-prompt`)
- **Phase 2:** Editable tagline + lens prompt in Chronicle; agent view state copy mentions composed prompt

### 2026-05-25 — Experience rename: `experienceContext` → `agentContext`
- `UniversalConversation` Kip injection payload renamed; no behavior change.

### 2026-05-25 — Layer 3: Chronicle frame routing unwind (`UniversalBoardContext`)
- Removed `selectedFrameKey`, `activeBoardForFrames`, and `onFrameSelect` from selection state and actions
- `onBoardDefSelect` now only sets `selectedBoardDefId`; `clearSelection` no longer clears frame state

### 2026-05-24 — Board readability pass (contrast + larger type)
- Theme tokens: darker secondary/tertiary ink, stronger borders (styleRegistry + themeRegistry)
- Panel chrome: more opaque surfaces, clearer borders (nav + Chronicle)
- Chronicle/presence: +2px typography scale, story cards with stronger borders
- SidebarCard: larger titles and list items for nav scanning
- `index.css` `.keeper-board-scope`: dialog banner, Kip messages, composer zone readability

### 2026-05-24 — Universal Chronicle: single KeeperPresence path (Steps 1 + 4)
- Chronicle routes exclusively through KeeperPresence; no board-specific panel renderers
- `mergeViewStates()` — all boards declare every subject; viewStates are treatment copy only

### 2026-05-24 — KeeperPresence Phase 1: active journey in board context
- `UniversalBoardContext` exposes `activeJourneyId` (from FrameContext) and `onSetActiveJourney` for Chronicle Set as Active — components call board context, not FrameContext directly

### 2026-05-23 — Universal nav: one panel, one card, code defs win
- Deleted `UniversalSwitcherPanel` — no alternate nav component remains.
- All nav sections (Dialogs, Integrations, Frames, Board Definitions, etc.) render as `SidebarCard` — same chrome on every board.
- `resolveBoardDefs()` merges domain frame JSON with code defs; built-in boardIds always use `UniversalBoardDefinition.ts` as source of truth (fixes stale seeded defs).
- `DesignerDraftProvider` mounts only when the board def requires it (designer / frames / boardDefs).
- Removed `requiresDensity` from Design Board — no global density override special case.
- Frame catalog moved to `frameCatalog.ts` (not under `designer/`).

### 2026-05-23 — Gate 2 follow-up: Design Board nav shell parity
- Removed `nav.variant: 'switcher'` — Design Board now uses `UniversalNavPanel` like every other board.
- Frames + Board Definitions render as `BoardNavCard` (same Board Nav treatment as IDE Integrations / Agent Agents).
- Domain Nav sections (Dialogs, Journeys, Keepers) gated on `def.nav.sections.*` flags.

### 2026-05-23 — Gate 2: full Universal Board compliance
- **Dialog transport:** Design Board uses `useAgentDialog` + `KipApi.runAgent` (divergent `/kip/designer` path removed from hook).
- **Nav:** Domain Nav vs Board Nav layers — `BoardNavCard` + divider; IDE Integrations (Vercel, Railway, GitHub) in Board Nav; Instruments removed.
- **Composer Tools:** Cloud and Rendr invoke agents via `IntegratedServicesBar` Tools section (IDE Board only).
- `UniversalBoardDefinition`: `integrations` replaces `instruments`; `ConversationPanelDef.agentSlug` added.

### 2026-05-23 — Gate 1: selection drives both panels
- `UniversalBoardCenterProps` includes `selectedDialogId`; passed to `UniversalConversation`.
- `UniversalConversation` calls `useSelectionSessionResume` and builds Banner context from every Nav record type (Dialog, Journey, Keeper, Draft, Agent).

### 2026-05-10 — Level 2: UniversalConversation (single conversation render file)
- Created `UniversalConversation.tsx` — replaces IDEBoardConversation, AgentBoardConversation, DomainBoardConversation
  - `agentContext` computed once from `useV0Shell()`, not three times
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
