# Agent Frame

## 📌 Purpose
v0 frames for the domain agent surface. Contains both the legacy Kip agent wrapper and the new composable Agent Board.

## 🧱 Key Files
- `AgentFrame.tsx` -- Legacy frame wrapping `KipAgentBoard` (accessed via `?frame=kip`)
- `AgentBoardFrame.tsx` -- New composable Agent Board (accessed via `?frame=agent`) built on shared primitives: `SidebarWorkspaceLayout`, `SidebarCard`, `WorkspaceHeader`, `useAgentWorkspaceView`

## 🔄 Data & Behavior
**AgentFrame (legacy):** Renders a v0 `DesignFrame` with the full `KipAgentBoard` surface and a close action back to `/d/:slug/board`.

**AgentBoardFrame (new):** Composable agent workspace using the same architecture as Commons Frame:
- Agent name loaded dynamically from `KipApi.getLeadAgent()` -- never hardcoded
- Sidebar order: Drafts, Journeys, Keepers, Sessions, For you (renamed from Dialogues)
- Workspace views via `useAgentWorkspaceView`: `dialogue` (conversation), `draft` (DraftCard), `cockpit` (diagnostics), `list` (all drafts/journeys/keepers/sessions), `journey` (JourneyCard detail), `keeper` (KeeperCard detail)
- Context-first banner (AgentContextBanner): domain · keeper/journey, Live, Open Cockpit. Agent name and mode live in AgentComposer.
- Clicking sidebar **headers** (Drafts, Journeys, Keepers, Sessions) opens the full list in the workspace. Clicking **individual items** opens their detail (draft → DraftCard, journey → JourneyCard, keeper → KeeperCard, session → dialogue). Journey/Keeper selection also scopes agent context via `FrameContext.setActiveJourneyId/setActiveKeeperId`
- Context bar above workspace shows active scope (journey, keeper, SOLE, session)
- Uses extracted components: `DialogueMessageList`, `AgentComposer`, `CockpitPanel`, `AgentContextBar`, `DraftCard`, `JourneyCard`, `KeeperCard`, `AgentContextBanner`

## ⚠️ Notes & ToDo
- [ ] Deprecate `AgentFrame` once `AgentBoardFrame` is feature-complete
- **Theme/coloring:** Use the theme dropdown (e.g. "Neutral" → "Diary Paper") or `?theme=diary-paper` in the URL for a warmer look. "Kip" (bottom bar) = new Agent Board; "kip - old" = legacy KipAgentBoardPage.
- [ ] Add debug mode support to AgentBoardFrame
- [ ] Add session editing/management within the new board
- [ ] Wire draft-to-dialogue flow (discuss draft with agent)

## 📆 Update Log
- 2026-02-18: Agent Composer: compact toolbar (send inside), sticky above bottom Margin, expanded uploads (images, video, docs stored in blob, referenced as markdown links).
- 2026-02-18: Agent Composer: replaced inline chat form with AgentComposer (agent/mode dropdown, config dropdown, attach, submit, feedback area). Simplified banner: removed agent from DesignFrame subtitle and AgentContextBanner; agent name and mode now in composer. Wired posture.dialogueMode to runAgent; useAgentPostureData.setDialogueMode for mode switching.
- 2026-02-18: Chat file upload: validate file type before reading; reject images/binary to prevent garbled characters (IEND, etc.) in chat. Show alert for unsupported file types.
- 2026-02-17: Sidebar items now load content in workspace: header clicks show list view (all drafts/journeys/keepers/sessions); item clicks open detail (JourneyCard, KeeperCard, DraftCard). Extended useAgentWorkspaceView with list, journey, keeper views. Added JourneyCard and KeeperCard (Draft UI style). SidebarCard supports onTitleClick.
- 2026-02-17: Chat UX: Shift+Enter for new line (Enter sends), textarea input, upload button (paperclip) for text files. Agent reliability: draft listing instruction, NOT_ALLOWED fix for draft actions, SOLE scope tagging, session naming closing ritual.
- 2026-02-17: Sidebar reorder (Drafts, Journeys, Keepers, Sessions, For you). Renamed Dialogues → Sessions. Replaced draft form with DraftCard (inline editing, sections, JSON toggle, bottom toolbar). Banner redesign: AgentContextBanner (context-first), DesignFrame title/subtitle updated.
- 2026-01-19: Rehydrated AgentFrame with the legacy Kip agent surface and preserved v0 close navigation.
- 2026-01-18: Added agent frame placeholder for v0 shell routing.
- 2026-02-09: Added `AgentBoardFrame` -- new composable agent workspace. Registered at `?frame=agent` in V0Shell; legacy `AgentFrame` remains at `?frame=kip`. Sidebar with Dialogues, Drafts, Journeys, Keepers, Prompted Actions. Workspace views: dialogue (conversation), draft (editor), cockpit (diagnostics). Agent name is dynamic. Uses `useAgentWorkspaceView` hook and extracted agent components.
- 2026-02-09: Wired `onConfirmDraftUpdate` in `AgentBoardFrame` — on Confirm for `draft.update.propose`, calls `KipApi.updateDraft` and `refreshDrafts()`.
- 2026-02-09: Keeper scope UI: draft list filtered by active keeper; sidebar items show keeper name; create defaults to active keeper; draft detail shows keeper in header.